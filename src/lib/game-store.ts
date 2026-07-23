import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeCrashPoint, hashServerSeed, multiplierAt, randomSeed } from "@/lib/crash-engine";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Phase = "betting" | "running" | "crashed";

export interface RoundRecord {
  id: number;
  crash: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  endedAt: number;
}

export interface ActiveBet {
  player: string;
  amount: number;
  autoCashout?: number;
  cashedAt?: number;
  isYou?: boolean;
  userId?: string;
  betIndex?: number;
}

interface GameState {
  phase: Phase;
  multiplier: number;
  crashPoint: number;
  countdown: number;
  roundStartAt: number;
  history: RoundRecord[];
  bets: ActiveBet[];
  // provably fair
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  // wallet
  balance: number;
  // user bet config (Panel 1 & Backwards compatibility)
  betAmount: number;
  autoCashout: number | null;
  autoBet: boolean;
  pendingBet: boolean;
  myBet: ActiveBet | null;
  // Panel 2
  betAmount2: number;
  autoCashout2: number | null;
  autoBet2: boolean;
  pendingBet2: boolean;
  myBet2: ActiveBet | null;

  sound: boolean;
  theme: "dark" | "light";
  // connection
  wsConnected: boolean;
  userId: string | null;
  // actions
  init: () => Promise<void>;
  tick: (now: number) => void;
  placeBet: (betIndex?: number) => void;
  cancelBet: (betIndex?: number) => void;
  cashOut: (betIndex?: number) => void;
  setBetAmount: (n: number, betIndex?: number) => void;
  setAutoCashout: (n: number | null, betIndex?: number) => void;
  setAutoBet: (b: boolean, betIndex?: number) => void;
  setClientSeed: (s: string) => void;
  toggleSound: () => void;
  toggleTheme: () => void;
  setBalance: (balance: number) => void;
}

// ─── Bot helpers (used only in offline/simulation mode) ───────────────────────

const BOT_NAMES = [
  "NovaHawk",
  "ZetaWolf",
  "Crimson7",
  "LunaPilot",
  "K1ngFly",
  "ApexJet",
  "Mira",
  "Soren",
  "Vix",
  "Echo",
  "Quill",
  "RoninX",
  "Suki",
  "Drake",
  "Nyx",
  "Orion",
  "Jade",
  "Pax",
  "Wren",
  "Kairo",
];

function randomBot(): ActiveBet {
  const amount = Math.round((Math.random() * 200 + 5) * 100) / 100;
  const autoCashout =
    Math.random() < 0.6 ? Math.round((1.2 + Math.random() * 8) * 100) / 100 : undefined;
  return {
    player:
      BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 99),
    amount,
    autoCashout,
    betIndex: Math.random() < 0.5 ? 0 : 1,
  };
}

// ─── Module-level singletons ──────────────────────────────────────────────────

let rafId: number | null = null;
let tickHandle: number | null = null;
let wsInstance: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

const WS_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL as string | undefined;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${proto}//${window.location.hostname}:5001/ws`;
    }
    return `${proto}//${window.location.host}/ws`;
  }
  return "ws://localhost:5001/ws";
})();

async function offlineDbUpdate(amountDelta: number, type: "bet" | "win") {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: w } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    if (!w) return;
    await supabase
      .from("wallets")
      .update({ balance: Number(w.balance) + amountDelta })
      .eq("user_id", user.id);
    await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      status: "completed",
      amount: amountDelta,
      currency: "EUR",
      meta: { offline_sim: true },
    });
  } catch (err) {
    console.error("Offline DB update failed:", err);
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      phase: "betting",
      multiplier: 1,
      crashPoint: 1,
      countdown: 3000,
      roundStartAt: 0,
      history: [],
      bets: [],
      serverSeed: "",
      serverSeedHash: "",
      clientSeed: "lucky-player",
      nonce: 0,
      balance: 1000,
      // Panel 1 configs
      betAmount: 10,
      autoCashout: 2.0,
      autoBet: false,
      pendingBet: false,
      myBet: null,
      // Panel 2 configs
      betAmount2: 10,
      autoCashout2: 2.0,
      autoBet2: false,
      pendingBet2: false,
      myBet2: null,

      sound: true,
      theme: "dark",
      wsConnected: false,
      userId: null,

      // ── init ──────────────────────────────────────────────────────────────
      init: async () => {
        if (tickHandle) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id || null;
        set({ userId });

        const wsUrl = token ? `${WS_URL}?token=${token}` : WS_URL;

        function connectWS() {
          if (wsInstance) {
            wsInstance.onopen = null;
            wsInstance.onmessage = null;
            wsInstance.onclose = null;
            wsInstance.onerror = null;
            try {
              wsInstance.close();
            } catch {
              /* ignore */
            }
            wsInstance = null;
          }

          const ws = new WebSocket(wsUrl);
          wsInstance = ws;

          ws.onopen = () => {
            console.log("[WS] Connected to game server.");
            set({ wsConnected: true });
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            if (wsReconnectTimer) {
              clearTimeout(wsReconnectTimer);
              wsReconnectTimer = null;
            }
          };

          ws.onmessage = (evt) => {
            try {
              const { event, data } = JSON.parse(evt.data as string);
              handleServerEvent(event, data, set, get);
            } catch {
              /* bad frame */
            }
          };

          ws.onclose = () => {
            console.warn("[WS] Disconnected. Falling back to local simulation.");
            set({ wsConnected: false });
            wsInstance = null;
            startLocalLoop(set, get);
            wsReconnectTimer = setTimeout(connectWS, 10_000);
          };

          ws.onerror = () => {
            ws.close();
          };
        }

        try {
          connectWS();
        } catch {
          startLocalLoop(set, get);
        }

        tickHandle = 1;
      },

      // ── tick (simulation mode) ────────────────────────────────────────────
      tick: (now) => {
        if (get().wsConnected) return;
        const s = get();
        if (s.phase === "betting") {
          const remaining = s.roundStartAt - now;
          if (remaining <= 0) {
            set({ phase: "running", roundStartAt: now, multiplier: 1 });
            let newBets = [...s.bets];
            let bal = s.balance;
            let myBet = s.myBet;
            let myBet2 = s.myBet2;
            let pendingBet = s.pendingBet;
            let pendingBet2 = s.pendingBet2;

            if (s.pendingBet && bal >= s.betAmount) {
              bal -= s.betAmount;
              myBet = {
                player: "You",
                amount: s.betAmount,
                autoCashout: s.autoCashout ?? undefined,
                isYou: true,
                betIndex: 0,
              };
              newBets.unshift(myBet);
              pendingBet = false;
              void offlineDbUpdate(-s.betAmount, "bet");
            } else {
              pendingBet = false;
            }

            if (s.pendingBet2 && bal >= s.betAmount2) {
              bal -= s.betAmount2;
              myBet2 = {
                player: "You",
                amount: s.betAmount2,
                autoCashout: s.autoCashout2 ?? undefined,
                isYou: true,
                betIndex: 1,
              };
              newBets.unshift(myBet2);
              pendingBet2 = false;
              void offlineDbUpdate(-s.betAmount2, "bet");
            } else {
              pendingBet2 = false;
            }

            set({
              balance: bal,
              myBet,
              myBet2,
              pendingBet,
              pendingBet2,
              bets: newBets,
            });
          } else {
            set({ countdown: remaining });
          }
        } else if (s.phase === "running") {
          const m = multiplierAt(now - s.roundStartAt);
          if (m >= s.crashPoint) {
            // Crash
            const ended: RoundRecord = {
              id: s.nonce,
              crash: s.crashPoint,
              serverSeed: s.serverSeed,
              serverSeedHash: s.serverSeedHash,
              clientSeed: s.clientSeed,
              nonce: s.nonce,
              endedAt: Date.now(),
            };
            const finalizedBets = s.bets.map((b) => {
              if (b.cashedAt) return b;
              if (b.autoCashout && b.autoCashout < s.crashPoint)
                return { ...b, cashedAt: b.autoCashout };
              return b;
            });
            let bal = s.balance;
            const mine1 = finalizedBets.find((b) => b.isYou && (b.betIndex ?? 0) === 0);
            const mine2 = finalizedBets.find((b) => b.isYou && (b.betIndex ?? 0) === 1);
            if (mine1?.cashedAt) bal += mine1.amount * mine1.cashedAt;
            if (mine2?.cashedAt) bal += mine2.amount * mine2.cashedAt;
            set({
              phase: "crashed",
              multiplier: s.crashPoint,
              bets: finalizedBets,
              history: [ended, ...s.history].slice(0, 40),
              balance: bal,
              myBet: mine1 ?? null,
              myBet2: mine2 ?? null,
            });
            setTimeout(() => {
              void startNewLocalRound(set, get);
            }, 2500);
          } else {
            let bal = s.balance;
            let myBet = s.myBet;
            let myBet2 = s.myBet2;
            let bets = [...s.bets];

            if (myBet && !myBet.cashedAt && myBet.autoCashout && m >= myBet.autoCashout) {
              const cashed = { ...myBet, cashedAt: myBet.autoCashout };
              bal += myBet.amount * cashed.cashedAt;
              myBet = cashed;
              bets = bets.map((b) => (b.isYou && (b.betIndex ?? 0) === 0 ? cashed : b));
              void offlineDbUpdate(cashed.amount * cashed.cashedAt, "win");
            }
            if (myBet2 && !myBet2.cashedAt && myBet2.autoCashout && m >= myBet2.autoCashout) {
              const cashed = { ...myBet2, cashedAt: myBet2.autoCashout };
              bal += myBet2.amount * cashed.cashedAt;
              myBet2 = cashed;
              bets = bets.map((b) => (b.isYou && (b.betIndex ?? 0) === 1 ? cashed : b));
              void offlineDbUpdate(cashed.amount * cashed.cashedAt, "win");
            }

            set({ multiplier: m, balance: bal, myBet, myBet2, bets });
          }
        }
      },

      // ── Bet actions ───────────────────────────────────────────────────────
      placeBet: (betIndex = 0) => {
        const s = get();
        const amt = betIndex === 0 ? s.betAmount : s.betAmount2;
        const autoOut = betIndex === 0 ? s.autoCashout : s.autoCashout2;
        if (s.balance < amt) return;

        if (s.wsConnected && wsInstance?.readyState === WebSocket.OPEN) {
          wsInstance.send(
            JSON.stringify({
              event: "bet",
              data: { amount: amt, autoCashout: autoOut ?? undefined, betIndex },
            }),
          );
          if (betIndex === 0) set({ pendingBet: true });
          else set({ pendingBet2: true });
        } else {
          if (betIndex === 0) set({ pendingBet: true });
          else set({ pendingBet2: true });
        }
      },

      cancelBet: (betIndex = 0) => {
        if (betIndex === 0) set({ pendingBet: false });
        else set({ pendingBet2: false });
      },

      cashOut: (betIndex = 0) => {
        const s = get();
        if (s.wsConnected && wsInstance?.readyState === WebSocket.OPEN) {
          wsInstance.send(
            JSON.stringify({
              event: "cashout",
              data: { betIndex },
            }),
          );
        } else {
          if (s.phase !== "running") return;
          const myB = betIndex === 0 ? s.myBet : s.myBet2;
          if (!myB || myB.cashedAt) return;
          const m = Math.floor(s.multiplier * 100) / 100;
          const cashed = { ...myB, cashedAt: m };
          
          if (betIndex === 0) {
            set({
              myBet: cashed,
              balance: s.balance + myB.amount * m,
              bets: s.bets.map((b) => (b.isYou && (b.betIndex ?? 0) === 0 ? cashed : b)),
            });
          } else {
            set({
              myBet2: cashed,
              balance: s.balance + myB.amount * m,
              bets: s.bets.map((b) => (b.isYou && (b.betIndex ?? 0) === 1 ? cashed : b)),
            });
          }
          void offlineDbUpdate(myB.amount * m, "win");
        }
      },

      setBetAmount: (n, betIndex = 0) => {
        const val = Math.max(1, Math.round(n * 100) / 100);
        if (betIndex === 0) set({ betAmount: val });
        else set({ betAmount2: val });
      },
      setAutoCashout: (n, betIndex = 0) => {
        if (betIndex === 0) set({ autoCashout: n });
        else set({ autoCashout2: n });
      },
      setAutoBet: (b, betIndex = 0) => {
        if (betIndex === 0) set({ autoBet: b });
        else set({ autoBet2: b });
      },
      setClientSeed: (s) => set({ clientSeed: s }),
      toggleSound: () => set({ sound: !get().sound }),
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("light", next === "light");
        }
      },
      setBalance: (balance: number) => set({ balance }),
    }),
    {
      name: "crash-game-v2",
      partialize: (s) => ({
        balance: s.balance,
        clientSeed: s.clientSeed,
        betAmount: s.betAmount,
        betAmount2: s.betAmount2,
        autoCashout: s.autoCashout,
        autoCashout2: s.autoCashout2,
        autoBet: s.autoBet,
        autoBet2: s.autoBet2,
        sound: s.sound,
        theme: s.theme,
        history: s.history.slice(0, 20),
      }),
    },
  ),
);

// ─── Server event handler (live mode) ────────────────────────────────────────

function handleServerEvent(
  event: string,
  data: any,
  set: (p: Partial<GameState>) => void,
  get: () => GameState,
) {
  const s = get();
  switch (event) {
    case "state": {
      const serverBets: ActiveBet[] = (data.bets ?? []).map(serverBetToLocal);
      const myBet = serverBets.find((b) => b.userId === s.userId && (b.betIndex ?? 0) === 0) || null;
      const myBet2 = serverBets.find((b) => b.userId === s.userId && (b.betIndex ?? 0) === 1) || null;
      set({
        phase: data.phase,
        multiplier: data.multiplier ?? 1,
        countdown: data.countdown ?? 3000,
        serverSeedHash: data.serverSeedHash ?? "",
        nonce: data.nonce ?? 0,
        bets: serverBets.map((b) => b.userId === s.userId ? { ...b, isYou: true } : b),
        history: (data.history ?? []).map(serverRoundToLocal),
        myBet: myBet ? { ...myBet, isYou: true } : null,
        myBet2: myBet2 ? { ...myBet2, isYou: true } : null,
      });
      break;
    }
    case "countdown": {
      set({ countdown: data.countdown });
      break;
    }
    case "tick": {
      set({ phase: "running", multiplier: data.multiplier });
      break;
    }
    case "bets": {
      const serverBets: ActiveBet[] = (data.bets ?? []).map(serverBetToLocal);
      const withYou = serverBets.map((b) =>
        b.userId === s.userId ? { ...b, isYou: true } : b,
      );
      const myBet = withYou.find((b) => b.isYou && (b.betIndex ?? 0) === 0) || null;
      const myBet2 = withYou.find((b) => b.isYou && (b.betIndex ?? 0) === 1) || null;
      set({
        bets: withYou,
        myBet,
        myBet2,
      });
      break;
    }
    case "cashout": {
      const isMyCashout = data.userId && data.userId === s.userId;
      const idx = data.betIndex ?? 0;
      
      let myBet = s.myBet;
      let myBet2 = s.myBet2;
      let bal = s.balance;

      if (isMyCashout) {
        const winAmount = Number(data.winAmount ?? 0);
        if (idx === 0 && myBet && !myBet.cashedAt) {
          myBet = { ...myBet, cashedAt: data.cashedAt };
          bal += winAmount;
        } else if (idx === 1 && myBet2 && !myBet2.cashedAt) {
          myBet2 = { ...myBet2, cashedAt: data.cashedAt };
          bal += winAmount;
        }
      }

      set({
        myBet,
        myBet2,
        balance: bal,
        bets: s.bets.map((b) =>
          b.userId === data.userId && (b.betIndex ?? 0) === idx ? { ...b, cashedAt: data.cashedAt } : b,
        ),
      });
      break;
    }
    case "cashout_success": {
      const idx = data.betIndex ?? 0;
      const winAmount = Number(data.winAmount ?? 0);
      
      let myBet = s.myBet;
      let myBet2 = s.myBet2;
      let bal = s.balance;

      if (idx === 0 && myBet && !myBet.cashedAt) {
        myBet = { ...myBet, cashedAt: data.multiplier };
        bal += winAmount;
      } else if (idx === 1 && myBet2 && !myBet2.cashedAt) {
        myBet2 = { ...myBet2, cashedAt: data.multiplier };
        bal += winAmount;
      }

      set({
        myBet,
        myBet2,
        balance: bal,
        bets: s.bets.map((b) =>
          b.isYou && (b.betIndex ?? 0) === idx ? { ...b, cashedAt: data.multiplier } : b,
        ),
      });
      break;
    }
    case "crashed": {
      const history: RoundRecord[] = (data.history ?? []).map(serverRoundToLocal);
      set({
        phase: "crashed",
        multiplier: data.crashPoint,
        history,
        pendingBet: false,
        pendingBet2: false,
      });
      if (s.autoBet && s.balance >= s.betAmount) {
        setTimeout(() => set({ pendingBet: true }), 500);
      }
      if (s.autoBet2 && s.balance >= s.betAmount2) {
        setTimeout(() => set({ pendingBet2: true }), 500);
      }
      break;
    }
    case "chat": {
      break;
    }
    case "pong": {
      break;
    }
    case "error": {
      console.warn("[WS] Server error:", data?.message);
      break;
    }
    default:
      break;
  }
}

// ─── Local (offline) simulation ───────────────────────────────────────────────

function startLocalLoop(set: (p: Partial<GameState>) => void, get: () => GameState) {
  if (rafId !== null) return;
  void startNewLocalRound(set, get);
  const loop = () => {
    if (!get().wsConnected) {
      get().tick(performance.now());
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(loop);
}

async function startNewLocalRound(set: (p: Partial<GameState>) => void, get: () => GameState) {
  const s = get();
  const serverSeed = randomSeed();
  const serverSeedHash = await hashServerSeed(serverSeed);
  const nonce = s.nonce + 1;
  const crash = await computeCrashPoint(serverSeed, s.clientSeed, nonce);

  const autoQueue1 = s.autoBet && s.balance >= s.betAmount;
  const autoQueue2 = s.autoBet2 && s.balance >= s.betAmount2;
  const botCount = 8 + Math.floor(Math.random() * 14);
  const bots = Array.from({ length: botCount }, randomBot);

  set({
    phase: "betting",
    serverSeed,
    serverSeedHash,
    nonce,
    crashPoint: crash,
    multiplier: 1,
    countdown: 3000,
    roundStartAt: performance.now() + 3000,
    bets: bots,
    myBet: null,
    myBet2: null,
    pendingBet: autoQueue1,
    pendingBet2: autoQueue2,
  });
}

// ─── Shape converters ──────────────────────────────────────────────────────────

function serverBetToLocal(b: any): ActiveBet {
  return {
    player: b.username ?? b.player ?? "Player",
    amount: Number(b.amount ?? b.bet_amount ?? 0),
    autoCashout: b.autoCashout ?? b.auto_cashout ?? undefined,
    cashedAt: b.cashedAt ?? b.cashout_multiplier ?? undefined,
    userId: b.userId ?? b.user_id ?? undefined,
    betIndex: b.betIndex ?? 0,
  };
}

function serverRoundToLocal(r: any): RoundRecord {
  return {
    id: Number(r.id ?? r.nonce ?? 0),
    crash: Number(r.crash ?? r.crashPoint ?? r.crash_point ?? 1),
    serverSeed: r.serverSeed ?? r.server_seed ?? "",
    serverSeedHash: r.serverSeedHash ?? r.server_seed_hash ?? "",
    clientSeed: r.clientSeed ?? r.client_seed ?? "",
    nonce: Number(r.nonce ?? 0),
    endedAt: r.endedAt ?? r.ended_at ?? 0,
  };
}

export function sendWsEvent(event: string, data: any) {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ event, data }));
    return true;
  }
  return false;
}

export function getWsConnected() {
  return wsInstance?.readyState === WebSocket.OPEN;
}

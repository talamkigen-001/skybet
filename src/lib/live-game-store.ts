import { create } from "zustand";
import { useGame } from "./game-store";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LivePhase = "betting" | "playing" | "result";

export type LiveGameType =
  | "roulette"
  | "blackjack"
  | "baccarat"
  | "wheel"
  | "poker"
  | "dreamcatcher"
  | "plinko"
  | "mines"
  | "coinflip"
  | "crazytime";

export interface LiveRoundRecord {
  id: number;
  result: string;
  won: boolean;
  payout: number;
  betAmount: number;
  endedAt: number;
}

export interface LiveBetEntry {
  player: string;
  amount: number;
  choice: string;
  won?: boolean;
  payout?: number;
  isYou?: boolean;
}

interface LiveGameState {
  phase: LivePhase;
  gameType: LiveGameType | null;
  betAmount: number;
  selectedChoice: string;
  countdown: number;
  roundResult: string;
  lastWin: number;
  history: LiveRoundRecord[];
  bets: LiveBetEntry[];
  myBet: LiveBetEntry | null;
  roundId: number;
  sessionId: string | null;
  // Roulette-specific
  rouletteNumber: number;
  // Blackjack-specific
  playerCards: number[];
  dealerCards: number[];
  playerValue: number;
  dealerValue: number;
  blackjackPhase: "betting" | "player" | "dealer" | "result";
  // Baccarat-specific
  playerBacCards: number[];
  bankerBacCards: number[];
  // Wheel-specific
  wheelResult: number;
  wheelMultiplier: number;
  // Poker-specific
  pokerPlayerCards: number[];
  pokerDealerCards: number[];
  pokerHandRank: string;
  // Dream Catcher-specific
  dreamSegment: number;
  dreamMultiplierActive: boolean;
  // Mines-specific
  minesCount: number;
  revealedCount: number;
  currentMultiplier: number;
  hitMine: boolean;
  // Actions
  setGameType: (t: LiveGameType) => void;
  setBetAmount: (n: number) => void;
  setSelectedChoice: (c: string) => void;
  placeBet: () => Promise<any>;
  startRound: () => void;
  finishRound: (
    result: string,
    won: boolean,
    payout: number,
    extras?: Partial<LiveGameState>,
  ) => void;
  resetRound: () => void;
  // Blackjack actions
  dealBlackjack: () => Promise<void>;
  hit: () => Promise<void>;
  stand: () => Promise<void>;
  doubleDown: () => Promise<void>;
  // Mines actions
  startMines: (mineCount: number) => Promise<void>;
  revealMines: (tileId: number) => Promise<any>;
  cashoutMines: () => Promise<any>;
  // Poker actions
  dealPoker: () => Promise<void>;
  actionPoker: (action: "play" | "fold") => Promise<void>;
}

// ─── API Config & Fetch Helper ───────────────────────────────────────────────

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5001/api`
    : "http://localhost:5001/api");

async function fetchWithAuth(path: string, body: any) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

function getBalance(): number {
  return useGame.getState().balance;
}

function setBalance(b: number): void {
  useGame.getState().setBalance(b);
}

// ─── Bot helpers (used only in offline/simulation mode) ───────────────────────

const BOT_NAMES = [
  "VelvetAce",
  "LuckyMira",
  "CasinoKing",
  "GoldenJade",
  "RoyalFlush",
  "NeonDrake",
  "MidnightFox",
  "HighRoller",
  "DiamondEye",
  "SilverWolf",
  "CosmicBet",
  "AceHunter",
  "NovaStar",
  "CrimsonQ",
  "VortexPro",
  "PhoenixBet",
  "ZenMaster",
  "TurboMax",
  "IronLuck",
  "ShadowPlay",
];

function randomBot(choices: string[]): LiveBetEntry {
  const amount = Math.round((Math.random() * 150 + 5) * 100) / 100;
  return {
    player:
      BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 99),
    amount,
    choice: choices[Math.floor(Math.random() * choices.length)],
  };
}

export const useLiveGame = create<LiveGameState>()((set, get) => ({
  phase: "betting",
  gameType: null,
  betAmount: 10,
  selectedChoice: "",
  countdown: 0,
  roundResult: "",
  lastWin: 0,
  history: [],
  bets: [],
  myBet: null,
  roundId: 0,
  sessionId: null,
  rouletteNumber: -1,
  playerCards: [],
  dealerCards: [],
  playerValue: 0,
  dealerValue: 0,
  blackjackPhase: "betting",
  playerBacCards: [],
  bankerBacCards: [],
  wheelResult: 0,
  wheelMultiplier: 1,
  pokerPlayerCards: [],
  pokerDealerCards: [],
  pokerHandRank: "",
  dreamSegment: 0,
  dreamMultiplierActive: false,
  minesCount: 3,
  revealedCount: 0,
  currentMultiplier: 1,
  hitMine: false,

  setGameType: (t) => set({ gameType: t, phase: "betting", selectedChoice: "" }),
  setBetAmount: (n) => set({ betAmount: Math.max(1, Math.round(n * 100) / 100) }),
  setSelectedChoice: (c) => set({ selectedChoice: c }),

  // Generalized placeBet for one-shot games
  placeBet: async () => {
    const s = get();
    if (!s.gameType) return;

    try {
      const res = await fetchWithAuth("/live/play", {
        gameType: s.gameType,
        betAmount: s.betAmount,
        choice: s.selectedChoice,
      });

      // Deduct bet & update balance locally
      setBalance(res.newBalance);

      const choices = getChoicesForGame(s.gameType);
      const botCount = 5 + Math.floor(Math.random() * 10);
      const bots = Array.from({ length: botCount }, () => randomBot(choices));

      const myBet: LiveBetEntry = {
        player: "You",
        amount: s.betAmount,
        choice: s.selectedChoice,
        isYou: true,
      };

      set({
        phase: "playing",
        bets: [myBet, ...bots],
        myBet,
        roundId: s.roundId + 1,
        // Pre-store round outcomes returned by server
        rouletteNumber: res.data?.number !== undefined ? res.data.number : -1,
        playerCards: res.data?.playerBacCards || [],
        dealerCards: res.data?.bankerBacCards || [],
        playerBacCards: res.data?.playerBacCards || [],
        bankerBacCards: res.data?.bankerBacCards || [],
        wheelResult: res.data?.binIdx !== undefined ? res.data.binIdx : res.data?.segment || 0,
        wheelMultiplier: res.data?.multiplier || 1,
        dreamSegment: res.data?.segment || 0,
        // Store resolved outcomes
        roundResult: res.result,
        lastWin: res.payout,
      });

      return res;
    } catch (err: any) {
      console.error("Live placeBet error:", err.message);
      throw err;
    }
  },

  startRound: () => {
    set({ phase: "playing" });
  },

  finishRound: (result, won, payout, extras) => {
    const s = get();
    const record: LiveRoundRecord = {
      id: s.roundId,
      result,
      won,
      payout,
      betAmount: s.betAmount,
      endedAt: Date.now(),
    };

    const updatedBets = s.bets.map((b) => {
      if (b.isYou) {
        return { ...b, won, payout };
      }
      const botWon = Math.random() < 0.45;
      return { ...b, won: botWon, payout: botWon ? b.amount * (1 + Math.random() * 2) : 0 };
    });

    set({
      phase: "result",
      roundResult: result,
      lastWin: payout,
      history: [record, ...s.history].slice(0, 30),
      bets: updatedBets,
      myBet: s.myBet ? { ...s.myBet, won, payout } : null,
      ...extras,
    });
  },

  resetRound: () => {
    set({
      phase: "betting",
      roundResult: "",
      lastWin: 0,
      myBet: null,
      bets: [],
      sessionId: null,
      rouletteNumber: -1,
      playerCards: [],
      dealerCards: [],
      playerValue: 0,
      dealerValue: 0,
      blackjackPhase: "betting",
      playerBacCards: [],
      bankerBacCards: [],
      wheelResult: 0,
      wheelMultiplier: 1,
      pokerPlayerCards: [],
      pokerDealerCards: [],
      pokerHandRank: "",
      dreamSegment: 0,
      dreamMultiplierActive: false,
      revealedCount: 0,
      currentMultiplier: 1,
      hitMine: false,
    });
  },

  // ─── Blackjack Actions ───────────────────────────────────────────────────────

  dealBlackjack: async () => {
    const s = get();
    try {
      const res = await fetchWithAuth("/live/blackjack/deal", { betAmount: s.betAmount });
      setBalance(res.newBalance);

      const myBet: LiveBetEntry = {
        player: "You",
        amount: s.betAmount,
        choice: "deal",
        isYou: true,
      };

      if (res.phase === "result") {
        // Natural Blackjack
        set({
          phase: "result",
          sessionId: res.sessionId,
          playerCards: res.playerCards,
          dealerCards: res.dealerCards,
          playerValue: res.playerValue,
          dealerValue: res.dealerValue,
          myBet,
          bets: [myBet],
          blackjackPhase: "result",
        });
        get().finishRound("Blackjack!", true, res.payout);
      } else {
        set({
          phase: "playing",
          sessionId: res.sessionId,
          playerCards: res.playerCards,
          dealerCards: res.dealerCards,
          playerValue: res.playerValue,
          dealerValue: res.dealerValue,
          blackjackPhase: "player",
          myBet,
          bets: [myBet],
        });
      }
    } catch (err: any) {
      console.error("Blackjack deal error:", err.message);
      throw err;
    }
  },

  hit: async () => {
    const s = get();
    if (!s.sessionId) return;
    try {
      const res = await fetchWithAuth("/live/blackjack/hit", { sessionId: s.sessionId });
      if (res.phase === "result") {
        set({ playerCards: res.playerCards, playerValue: res.playerValue });
        setTimeout(() => {
          get().finishRound(res.roundResult, res.won, res.payout, {
            blackjackPhase: "result",
          });
        }, 500);
      } else {
        set({ playerCards: res.playerCards, playerValue: res.playerValue });
      }
    } catch (err: any) {
      console.error("Blackjack hit error:", err.message);
    }
  },

  stand: async () => {
    const s = get();
    if (!s.sessionId) return;
    try {
      set({ blackjackPhase: "dealer" });
      const res = await fetchWithAuth("/live/blackjack/stand", { sessionId: s.sessionId });

      // Update balance
      setBalance(res.newBalance);

      setTimeout(() => {
        get().finishRound(res.roundResult, res.won, res.payout, {
          blackjackPhase: "result",
          dealerCards: res.dealerCards,
          dealerValue: res.dealerValue,
        });
      }, 600);
    } catch (err: any) {
      console.error("Blackjack stand error:", err.message);
    }
  },

  doubleDown: async () => {
    const s = get();
    if (!s.sessionId) return;
    try {
      const res = await fetchWithAuth("/live/blackjack/double", { sessionId: s.sessionId });

      // Update balance
      setBalance(res.newBalance);

      if (res.phase === "result") {
        set({ playerCards: res.playerCards, playerValue: res.playerValue });
        setTimeout(() => {
          get().finishRound(res.roundResult, res.won, res.payout, {
            blackjackPhase: "result",
            dealerCards: res.dealerCards,
            dealerValue: res.dealerValue,
            betAmount: s.betAmount * 2, // Double bet representation
          });
        }, 500);
      }
    } catch (err: any) {
      console.error("Blackjack double down error:", err.message);
    }
  },

  // ─── Mines Actions ───────────────────────────────────────────────────────────

  startMines: async (mineCount) => {
    const s = get();
    try {
      const res = await fetchWithAuth("/live/mines/start", {
        betAmount: s.betAmount,
        mineCount,
      });

      setBalance(res.newBalance);

      const myBet: LiveBetEntry = {
        player: "You",
        amount: s.betAmount,
        choice: "mines",
        isYou: true,
      };

      set({
        phase: "playing",
        sessionId: res.sessionId,
        minesCount: res.minesCount,
        revealedCount: 0,
        currentMultiplier: 1.0,
        hitMine: false,
        myBet,
        bets: [myBet],
      });
    } catch (err: any) {
      console.error("Mines start error:", err.message);
      throw err;
    }
  },

  revealMines: async (tileId) => {
    const s = get();
    if (!s.sessionId) return;
    try {
      const res = await fetchWithAuth("/live/mines/reveal", {
        sessionId: s.sessionId,
        tileId,
      });

      if (res.phase === "result") {
        if (res.hitMine) {
          set({ hitMine: true, revealedCount: res.revealedCount, currentMultiplier: 0 });
          setTimeout(() => {
            get().finishRound("BOOM!", false, 0);
          }, 800);
        } else {
          // Clean board safe tiles cleared
          setBalance(res.newBalance);
          set({ revealedCount: res.revealedCount, currentMultiplier: res.currentMultiplier });
          setTimeout(() => {
            get().finishRound(res.roundResult, true, res.payout);
          }, 500);
        }
      } else {
        set({ revealedCount: res.revealedCount, currentMultiplier: res.currentMultiplier });
      }

      return res;
    } catch (err: any) {
      console.error("Mines reveal error:", err.message);
      throw err;
    }
  },

  cashoutMines: async () => {
    const s = get();
    if (!s.sessionId) return;
    try {
      const res = await fetchWithAuth("/live/mines/cashout", { sessionId: s.sessionId });

      setBalance(res.newBalance);

      get().finishRound(res.roundResult, true, res.payout);
      return res;
    } catch (err: any) {
      console.error("Mines cashout error:", err.message);
      throw err;
    }
  },

  // ─── Poker Actions ───────────────────────────────────────────────────────────

  dealPoker: async () => {
    const s = get();
    try {
      const res = await fetchWithAuth("/live/poker/deal", { betAmount: s.betAmount });

      setBalance(res.newBalance);

      const myBet: LiveBetEntry = {
        player: "You",
        amount: s.betAmount,
        choice: "ante",
        isYou: true,
      };

      set({
        phase: "playing",
        sessionId: res.sessionId,
        pokerPlayerCards: res.pokerPlayerCards,
        pokerHandRank: res.pokerHandRank,
        myBet,
        bets: [myBet],
      });
    } catch (err: any) {
      console.error("Poker deal error:", err.message);
      throw err;
    }
  },

  actionPoker: async (action) => {
    const s = get();
    if (!s.sessionId) return;
    try {
      const res = await fetchWithAuth("/live/poker/action", {
        sessionId: s.sessionId,
        action,
      });

      if (res.newBalance !== undefined) {
        setBalance(res.newBalance);
      }

      const extras: Partial<LiveGameState> = {};
      if (res.pokerDealerCards) {
        extras.pokerDealerCards = res.pokerDealerCards;
      }

      get().finishRound(res.roundResult, res.won, res.payout, extras);
    } catch (err: any) {
      console.error("Poker action error:", err.message);
    }
  },
}));

// Helper: choices per game type for bots
function getChoicesForGame(type: LiveGameType | null): string[] {
  switch (type) {
    case "roulette":
      return ["red", "black", "green", "odd", "even", "1-18", "19-36"];
    case "blackjack":
      return ["hit", "stand"];
    case "baccarat":
      return ["player", "banker", "tie"];
    case "wheel":
      return ["1", "2", "5", "10", "20", "40"];
    case "poker":
      return ["ante"];
    case "dreamcatcher":
      return ["1", "2", "5", "10", "20", "40"];
    default:
      return ["bet"];
  }
}

// ─── Exported Constants & Helpers ─────────────────────────────────────────────

export const ROULETTE_NUMBERS = [
  { num: 0, color: "green" },
  { num: 32, color: "red" },
  { num: 15, color: "black" },
  { num: 19, color: "red" },
  { num: 4, color: "black" },
  { num: 21, color: "red" },
  { num: 2, color: "black" },
  { num: 25, color: "red" },
  { num: 17, color: "black" },
  { num: 34, color: "red" },
  { num: 6, color: "black" },
  { num: 27, color: "red" },
  { num: 13, color: "black" },
  { num: 36, color: "red" },
  { num: 11, color: "black" },
  { num: 30, color: "red" },
  { num: 8, color: "black" },
  { num: 23, color: "red" },
  { num: 10, color: "black" },
  { num: 5, color: "red" },
  { num: 24, color: "black" },
  { num: 16, color: "red" },
  { num: 33, color: "black" },
  { num: 1, color: "red" },
  { num: 20, color: "black" },
  { num: 14, color: "red" },
  { num: 31, color: "black" },
  { num: 9, color: "red" },
  { num: 22, color: "black" },
  { num: 18, color: "red" },
  { num: 29, color: "black" },
  { num: 7, color: "red" },
  { num: 28, color: "black" },
  { num: 12, color: "red" },
  { num: 35, color: "black" },
  { num: 3, color: "red" },
  { num: 26, color: "black" },
];

export const RED_NUMBERS = new Set(
  ROULETTE_NUMBERS.filter((n) => n.color === "red").map((n) => n.num),
);

const BLACKJACK_CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]; // A-K
export function handValue(cards: number[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = BLACKJACK_CARD_VALUES[c % 13];
    if (v === 1) aces++;
    total += v;
  }
  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces--;
  }
  return total;
}

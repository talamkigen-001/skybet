"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGame, sendWsEvent } from "@/lib/game-store";
import { useLocale, formatMoney } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: number;
  player: string;
  initials: string;
  type: "shared" | "msg" | "system";
  text?: string;
  multiplier?: number;
  bet?: number;
  win?: number;
  roundMult?: number;
  timestamp?: string;
  isYou?: boolean;
}

const PLAYERS = [
  "XxUxwQqsgBP",
  "Kgabedi 0717",
  "Kateryna I.",
  "Chesnok",
  "Noroc77",
  "FlyingMira",
  "GoldenJet",
  "AceRider",
  "LunarFox",
  "Cosmo",
];

function rand<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function initials(name: string | undefined | null) {
  return (
    (name || "")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 2)
      .toUpperCase() || "PL"
  );
}

// Color palette derived from username for avatar
const AVATAR_COLORS = [
  "from-violet-500/60 to-indigo-500/60",
  "from-emerald-500/60 to-cyan-500/60",
  "from-rose-500/60 to-orange-500/60",
  "from-amber-500/60 to-yellow-500/60",
  "from-sky-500/60 to-blue-500/60",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function ChatFeed() {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const idRef = useRef(0);
  const history = useGame((s) => s.history);
  const gameWsConnected = useGame((s) => s.wsConnected);
  const currency = useLocale((s) => s.currency);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsListenerRef = useRef<((ev: MessageEvent) => void) | null>(null);

  // Resolve authenticated username once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const username =
          session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Player";
        setMyUsername(username);
      }
    });
  }, []);

  // Listen for WebSocket chat events dispatched from game-store
  useEffect(() => {
    setWsConnected(gameWsConnected);

    // The game-store owns the single WS connection. We hook into it via a
    // custom browser event that index.ts dispatches for "chat" frames.
    const handler = (e: Event) => {
      const { username, message, created_at } = (e as CustomEvent).detail as {
        username: string;
        message: string;
        created_at: string;
      };
      addMessage({
        player: username,
        type: "msg",
        text: message,
        timestamp: created_at,
        isYou: username === myUsername,
      });
    };

    window.addEventListener("ws:chat", handler);
    return () => window.removeEventListener("ws:chat", handler);
  }, [gameWsConnected, myUsername]);

  // Auto-generate simulated shared bets when a new local round finishes
  useEffect(() => {
    const last = history[0];
    if (!last) return;
    const count = 1 + Math.floor(Math.random() * 2);
    const newItems: ChatMessage[] = Array.from({ length: count }, () => {
      const bet = Math.round((Math.random() * 5 + 0.1) * 100) / 100;
      const cashed =
        Math.random() < 0.5 ? Math.round((1 + Math.random() * (last.crash - 1)) * 100) / 100 : 0;
      const player = rand(PLAYERS);
      return {
        id: ++idRef.current,
        player,
        initials: initials(player),
        type: "shared",
        bet,
        multiplier: cashed || undefined,
        win: cashed ? bet * cashed : 0,
        roundMult: last.crash,
      };
    });
    setItems((prev) => [...newItems, ...prev].slice(0, 60));
  }, [history.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to top (newest message)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [items.length]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "initials">) => {
    setItems((prev) =>
      [
        {
          ...msg,
          id: ++idRef.current,
          initials: initials(msg.player),
        },
        ...prev,
      ].slice(0, 60),
    );
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text) return;

    // Optimistic local echo
    addMessage({ player: myUsername || "You", type: "msg", text, isYou: true });
    setDraft("");

    // Send over WS if connected; otherwise it just stays local
    if (!sendWsEvent("chat", { message: text })) {
      // offline — already echoed above, nothing more to do
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${wsConnected ? "bg-[var(--win)] animate-pulse" : "bg-amber-400"}`}
          />
          <span className="font-semibold text-sm">Live feed</span>
        </div>
        <div className="flex items-center gap-2">
          {wsConnected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--win)]/15 text-[var(--win)] font-medium">
              LIVE
            </span>
          )}
          <span className="text-[11px] text-muted-foreground font-mono-tabular">
            {377 + (history.length % 50)} online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.map((it) => (
          <div
            key={it.id}
            className={`rounded-xl p-2.5 text-xs transition-all ${
              it.isYou ? "bg-primary/10 border border-primary/20" : "bg-secondary/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`w-6 h-6 rounded-md bg-gradient-to-br ${avatarColor(it.player)} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}
              >
                {it.initials}
              </div>
              <span className="font-semibold truncate flex-1">{it.isYou ? "You" : it.player}</span>
              {it.type === "shared" && (
                <span className="text-[10px] text-muted-foreground">Shared a bet</span>
              )}
              {it.timestamp && (
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                  {new Date(it.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {it.type === "msg" || it.type === "system" ? (
              <div
                className={`pl-8 ${it.type === "system" ? "italic text-muted-foreground" : "text-foreground/90"}`}
              >
                {it.text}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-1 pl-8 text-[11px]">
                <span className="text-muted-foreground">Multiplier</span>
                <span className="text-right">
                  {it.multiplier ? (
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono-tabular font-semibold">
                      {it.multiplier.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
                <span className="text-muted-foreground">Round</span>
                <span className="text-right font-mono-tabular">x{it.roundMult?.toFixed(2)}</span>
                <span className="text-muted-foreground">Bet</span>
                <span className="text-right font-mono-tabular">
                  {formatMoney(it.bet ?? 0, currency)}
                </span>
                <span className="text-muted-foreground">Win</span>
                <span
                  className={`text-right font-mono-tabular ${it.win ? "text-[var(--win)]" : "text-muted-foreground"}`}
                >
                  {it.win ? formatMoney(it.win, currency) : "—"}
                </span>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center text-xs text-muted-foreground italic py-8">
            Live activity will appear here…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/40">
        {!myUsername && (
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            <a href="/auth" className="text-primary underline">
              Sign in
            </a>{" "}
            to chat
          </p>
        )}
        <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2">
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={myUsername ? "Enter a message…" : "Sign in to chat"}
            maxLength={200}
            disabled={!myUsername}
            aria-label="Chat message input"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            id="chat-send-btn"
            onClick={send}
            disabled={!myUsername || !draft.trim()}
            className="text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground text-right mt-1">{draft.length}/200</div>
      </div>
    </div>
  );
}

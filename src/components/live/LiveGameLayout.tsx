import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useGame } from "@/lib/game-store";
import { useLiveGame } from "@/lib/live-game-store";
import { CasinoTopBar } from "@/components/casino/CasinoTopBar";
import { CasinoFooter } from "@/components/casino/CasinoFooter";
import { LiveBetPanel } from "./LiveBetPanel";
import { LiveHistoryStrip } from "./LiveHistoryStrip";
import { useLocale, formatMoney } from "@/lib/locale";

interface Props {
  title: string;
  glyph: string;
  children: ReactNode;
  choices: { id: string; label: string; color?: string; payout?: string }[];
  onPlay: () => void;
  canPlay: boolean;
}

export function LiveGameLayout({ title, glyph, children, choices, onPlay, canPlay }: Props) {
  const balance = useGame((s) => s.balance);
  const currency = useLocale((s) => s.currency);
  const phase = useLiveGame((s) => s.phase);
  const history = useLiveGame((s) => s.history);
  const bets = useLiveGame((s) => s.bets);
  const [mobileTab, setMobileTab] = useState<"bets" | "history">("bets");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CasinoTopBar />

      <div className="max-w-[1600px] mx-auto w-full px-3 sm:px-4 pt-3 flex items-center justify-between">
        <Link
          to="/games/live"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          ← Back to live casino
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--win)] animate-pulse" />
            <span className="hidden sm:inline text-muted-foreground">Balance</span>
            <span className="font-mono-tabular font-semibold text-[var(--gold)]">
              {formatMoney(balance, currency)}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-3 sm:px-4 py-3 pb-3">
        <div className="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-[280px_1fr_300px]">
          {/* Left — Live bets (desktop) */}
          <aside className="hidden lg:block order-2 lg:order-1 lg:h-[78vh] lg:max-h-[820px]">
            <LiveBetsList bets={bets} phase={phase} />
          </aside>

          {/* Center — game */}
          <section className="order-1 lg:order-2 flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="font-display text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-primary via-[var(--gold)] to-accent bg-clip-text text-transparent truncate flex items-center gap-2">
                <span className="text-2xl">{glyph}</span>
                {title}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[var(--win)]/15 border border-[var(--win)]/30 text-xs font-semibold text-[var(--win)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--win)] animate-pulse" />
                  LIVE
                </div>
              </div>
            </div>

            <LiveHistoryStrip />

            {/* Game canvas area */}
            <div className="aspect-[16/10] md:aspect-[18/10] rounded-2xl overflow-hidden border border-border/60 bg-card relative">
              {children}
            </div>

            {/* Bet panel */}
            <LiveBetPanel choices={choices} onPlay={onPlay} canPlay={canPlay} />
          </section>

          {/* Right — history (desktop) */}
          <aside className="hidden lg:block order-3 lg:h-[78vh] lg:max-h-[820px]">
            <RoundHistory history={history} />
          </aside>

          {/* Mobile tab switcher */}
          <section className="lg:hidden order-4 col-span-1 flex flex-col gap-2 min-w-0">
            <div className="flex rounded-full bg-secondary/50 p-1 self-start">
              {(["bets", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition ${
                    mobileTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t === "bets" ? "Live bets" : "History"}
                </button>
              ))}
            </div>
            <div className="h-[40vh] min-h-[280px]">
              {mobileTab === "bets" ? (
                <LiveBetsList bets={bets} phase={phase} />
              ) : (
                <RoundHistory history={history} />
              )}
            </div>
          </section>
        </div>
      </main>

      <div className="hidden lg:block">
        <CasinoFooter />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveBetsList({
  bets,
  phase,
}: {
  bets: import("@/lib/live-game-store").LiveBetEntry[];
  phase: string;
}) {
  const currency = useLocale((s) => s.currency);

  return (
    <div className="glass-panel rounded-2xl p-3 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
        <div>
          <div className="text-[10px] uppercase tracking-wider">Live bets</div>
          <div className="text-foreground text-base font-bold font-mono-tabular">{bets.length}</div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/60 border border-border/50 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--win)] animate-pulse" />
          {phase === "playing" ? "In progress" : phase === "result" ? "Results" : "Open"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-1.5">
        {bets.map((b, i) => {
          const initials = (b.player || "PL").slice(0, 2).toUpperCase();
          return (
            <div
              key={i}
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-2 py-2 rounded-lg text-xs ${
                b.isYou ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40"
              }`}
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-[10px] font-bold">
                {initials}
              </div>
              <span className={`truncate font-medium ${b.isYou ? "text-primary" : ""}`}>
                {b.isYou ? "You" : b.player}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground capitalize">
                {b.choice}
              </span>
              <span
                className={`font-mono-tabular w-16 text-right text-[11px] ${
                  b.won === true
                    ? "text-[var(--win)]"
                    : b.won === false
                      ? "text-[var(--loss)]"
                      : "text-muted-foreground"
                }`}
              >
                {b.won !== undefined
                  ? b.won
                    ? `+${formatMoney(b.payout ?? 0, currency)}`
                    : "—"
                  : formatMoney(b.amount, currency)}
              </span>
            </div>
          );
        })}
        {bets.length === 0 && (
          <div className="text-center text-xs text-muted-foreground italic py-8">No bets yet</div>
        )}
      </div>
    </div>
  );
}

function RoundHistory({ history }: { history: import("@/lib/live-game-store").LiveRoundRecord[] }) {
  const currency = useLocale((s) => s.currency);

  return (
    <div className="glass-panel rounded-2xl p-3 flex flex-col h-full min-h-0">
      <div className="text-xs font-semibold mb-3 px-1">Round History</div>
      <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-1.5">
        {history.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/40 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${r.won ? "bg-[var(--win)]" : "bg-[var(--loss)]"}`}
              />
              <span className="font-medium">{r.result}</span>
            </div>
            <span
              className={`font-mono-tabular ${r.won ? "text-[var(--win)]" : "text-[var(--loss)]"}`}
            >
              {r.won
                ? `+${formatMoney(r.payout, currency)}`
                : `-${formatMoney(r.betAmount, currency)}`}
            </span>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center text-xs text-muted-foreground italic py-8">No rounds yet</div>
        )}
      </div>
    </div>
  );
}

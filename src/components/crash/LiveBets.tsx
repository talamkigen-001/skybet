"use client";
import { useState } from "react";
import { useGame } from "@/lib/game-store";
import { useLocale, formatMoney } from "@/lib/locale";

type Tab = "all" | "my" | "top";

export function LiveBets() {
  const [tab, setTab] = useState<Tab>("all");
  const bets = useGame((s) => s.bets);
  const phase = useGame((s) => s.phase);
  const multiplier = useGame((s) => s.multiplier);
  const history = useGame((s) => s.history);
  const currency = useLocale((s) => s.currency);

  let rows = bets;
  if (tab === "my") rows = bets.filter((b) => b.isYou);
  if (tab === "top") rows = [...bets].sort((a, b) => b.amount - a.amount).slice(0, 20);

  return (
    <div className="glass-panel rounded-2xl p-3 flex flex-col h-full min-h-0">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary/40 mb-3">
        {(["all", "my", "top"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-semibold py-2 rounded-lg uppercase tracking-wider transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
        <div>
          <div className="text-[10px] uppercase tracking-wider">Total bets</div>
          <div className="text-foreground text-base font-bold font-mono-tabular">{rows.length}</div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/60 border border-border/50 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--win)] animate-pulse" />
          {phase === "running"
            ? `${multiplier.toFixed(2)}x`
            : phase === "betting"
              ? "Pre-round"
              : `Round #${history[0]?.nonce ?? 0}`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-1.5">
        {rows.map((b, i) => {
          const isCashed = !!b.cashedAt;
          const crashedOut = phase === "crashed" && !b.cashedAt;
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
              <span
                className={`font-mono-tabular text-[11px] px-2 py-0.5 rounded-md ${
                  isCashed
                    ? "bg-[var(--win)]/15 text-[var(--win)]"
                    : "bg-background/60 text-muted-foreground"
                }`}
              >
                {isCashed ? `${b.cashedAt!.toFixed(2)}x` : "—"}
              </span>
              <span
                className={`font-mono-tabular w-16 text-right text-[11px] ${
                  isCashed
                    ? "text-[var(--win)]"
                    : crashedOut
                      ? "text-[var(--loss)]"
                      : "text-muted-foreground"
                }`}
              >
                {isCashed
                  ? formatMoney(b.amount * b.cashedAt!, currency)
                  : crashedOut
                    ? "—"
                    : formatMoney(b.amount, currency)}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="text-center text-xs text-muted-foreground italic py-8">No bets yet</div>
        )}
      </div>
    </div>
  );
}

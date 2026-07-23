"use client";
import { useLiveGame } from "@/lib/live-game-store";

export function LiveHistoryStrip() {
  const history = useLiveGame((s) => s.history);
  const phase = useLiveGame((s) => s.phase);
  const items = history.slice(0, 10);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-2 rounded-xl bg-secondary/30 border border-border/40">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
        {phase === "betting" ? "?" : phase === "playing" ? "▶" : "✓"}
      </div>
      {items.map((r) => {
        const color = r.won
          ? "bg-[var(--win)]/15 text-[var(--win)] border-[var(--win)]/30"
          : "bg-secondary/60 text-muted-foreground border-border/40";
        return (
          <div
            key={r.id}
            className={`shrink-0 font-mono-tabular text-xs font-semibold px-3 py-2 rounded-lg border ${color}`}
            title={r.result}
          >
            {r.result.length > 12 ? r.result.slice(0, 12) + "…" : r.result}
          </div>
        );
      })}
      {items.length === 0 && (
        <span className="text-xs text-muted-foreground italic px-2">Waiting for first round…</span>
      )}
      <div className="ml-auto shrink-0 w-9 h-9 rounded-lg bg-secondary/60 text-muted-foreground flex items-center justify-center">
        🕒
      </div>
    </div>
  );
}

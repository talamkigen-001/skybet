import { useGame } from "@/lib/game-store";
import { Link } from "@tanstack/react-router";

export function HistoryStrip() {
  const history = useGame((s) => s.history);
  const phase = useGame((s) => s.phase);
  const items = history.slice(0, 10);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-2 rounded-xl bg-secondary/30 border border-border/40">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
        {phase === "betting" ? "?" : phase === "running" ? "▶" : "✕"}
      </div>
      {items.map((r) => {
        const color =
          r.crash >= 10
            ? "bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/30"
            : r.crash >= 2
              ? "bg-[var(--win)]/15 text-[var(--win)] border-[var(--win)]/30"
              : "bg-secondary/60 text-muted-foreground border-border/40";
        return (
          <Link
            to="/fairness"
            search={{ nonce: r.nonce }}
            key={r.id}
            className={`shrink-0 font-mono-tabular text-xs font-semibold px-3 py-2 rounded-lg border ${color} hover:scale-105 transition-transform`}
            title={`Round #${r.nonce} — verify`}
          >
            {r.crash.toFixed(2)}x
          </Link>
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

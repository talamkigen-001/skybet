"use client";
import { useGame } from "@/lib/game-store";
import Link from "next/link";

export function HistoryBar() {
  const history = useGame((s) => s.history);
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      <span className="text-xs text-muted-foreground shrink-0 mr-1">Recent</span>
      {history.slice(0, 24).map((r) => {
        const color =
          r.crash >= 10
            ? "text-[var(--gold)] border-[var(--gold)]/40"
            : r.crash >= 2
              ? "text-[var(--win)] border-[var(--win)]/40"
              : "text-[var(--loss)] border-[var(--loss)]/40";
        return (
          <Link
            href={`/fairness?nonce=${r.nonce}`}
            key={r.id}
            className={`shrink-0 font-mono-tabular text-xs px-2.5 py-1 rounded-md border ${color} bg-secondary/40 hover:bg-secondary transition-colors`}
            title={`Round #${r.nonce} — verify`}
          >
            {r.crash.toFixed(2)}x
          </Link>
        );
      })}
      {history.length === 0 && (
        <span className="text-xs text-muted-foreground italic">
          History will appear after the first round.
        </span>
      )}
    </div>
  );
}

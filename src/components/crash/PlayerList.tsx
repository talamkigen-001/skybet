import { useGame } from "@/lib/game-store";

export function PlayerList() {
  const bets = useGame((s) => s.bets);
  const phase = useGame((s) => s.phase);
  const multiplier = useGame((s) => s.multiplier);

  const sorted = [...bets].sort((a, b) => b.amount - a.amount);

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold">Live players</h3>
        <span className="text-xs text-muted-foreground font-mono-tabular">
          {bets.length} in round
        </span>
      </div>
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-1">
        {sorted.map((b, i) => {
          const isCashed = !!b.cashedAt;
          const crashedOut = phase === "crashed" && !b.cashedAt;
          return (
            <div
              key={i}
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                b.isYou ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40"
              }`}
            >
              <span className={`truncate ${b.isYou ? "font-bold text-primary" : ""}`}>
                {b.player}
              </span>
              <span className="font-mono-tabular text-muted-foreground">{b.amount.toFixed(2)}</span>
              <span
                className={`font-mono-tabular w-16 text-right ${
                  isCashed
                    ? "text-[var(--win)]"
                    : crashedOut
                      ? "text-[var(--loss)]"
                      : "text-muted-foreground"
                }`}
              >
                {isCashed
                  ? `${b.cashedAt!.toFixed(2)}x`
                  : crashedOut
                    ? "—"
                    : phase === "running"
                      ? `${multiplier.toFixed(2)}x`
                      : "…"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

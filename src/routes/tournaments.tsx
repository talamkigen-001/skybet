import { createFileRoute } from "@tanstack/react-router";
import { CasinoLayout } from "@/components/casino/CasinoLayout";

export const Route = createFileRoute("/tournaments")({
  head: () => ({ meta: [{ title: "Tournaments — NOROC JETX" }] }),
  component: Tournaments,
});

const T = [
  { name: "Stellar Spin Showdown", pool: 50000, ends: "Sun 23:59", players: 1842, tag: "Slots" },
  { name: "Rocket Rush Weekly", pool: 25000, ends: "Fri 20:00", players: 924, tag: "Crash" },
  { name: "Live Royale", pool: 15000, ends: "Sat 22:00", players: 412, tag: "Live" },
  { name: "Jackpot Hunters", pool: 100000, ends: "End of month", players: 3211, tag: "Jackpot" },
];

function Tournaments() {
  return (
    <CasinoLayout>
      <div>
        <h1 className="font-display text-4xl font-extrabold">Tournaments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compete, climb the leaderboard, win the pool.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {T.map((t, i) => (
          <div key={t.name} className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                {t.tag}
              </span>
              <span className="text-[10px] text-muted-foreground">Ends · {t.ends}</span>
            </div>
            <h3 className="font-display text-xl font-bold">{t.name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-3xl font-extrabold text-[var(--gold)]">
                {t.pool.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">prize pool</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {t.players.toLocaleString()} players entered
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90">
                Join
              </button>
              <button className="h-10 px-4 rounded-full bg-secondary text-sm font-semibold hover:bg-muted">
                Leaderboard
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {[1, 2, 3].map((rank) => (
                <div
                  key={rank}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-secondary/40"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-5 text-center font-bold ${rank === 1 ? "text-[var(--gold)]" : rank === 2 ? "text-slate-300" : "text-amber-700"}`}
                    >
                      #{rank}
                    </span>
                    <span className="text-muted-foreground">Player{(i + 1) * rank * 37}</span>
                  </span>
                  <span className="font-mono-tabular">{(t.pool / (rank * 3)).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CasinoLayout>
  );
}

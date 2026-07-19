import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TopBar } from "@/components/crash/TopBar";
import { useGame } from "@/lib/game-store";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Noroc JetX" },
      { name: "description", content: "Distribution of recent crash points and round history." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const history = useGame((s) => s.history);

  const stats = useMemo(() => {
    if (history.length === 0) return { avg: 0, max: 0, min: 0, under2: 0, over10: 0 };
    const crashes = history.map((h) => h.crash);
    const avg = crashes.reduce((a, b) => a + b, 0) / crashes.length;
    return {
      avg,
      max: Math.max(...crashes),
      min: Math.min(...crashes),
      under2: crashes.filter((c) => c < 2).length,
      over10: crashes.filter((c) => c >= 10).length,
    };
  }, [history]);

  const buckets = useMemo(() => {
    const b = [
      { label: "1.00 – 1.50x", min: 1, max: 1.5, count: 0 },
      { label: "1.50 – 2.00x", min: 1.5, max: 2, count: 0 },
      { label: "2.00 – 5.00x", min: 2, max: 5, count: 0 },
      { label: "5.00 – 10.0x", min: 5, max: 10, count: 0 },
      { label: "10.0x+", min: 10, max: Infinity, count: 0 },
    ];
    for (const h of history) {
      const bk = b.find((x) => h.crash >= x.min && h.crash < x.max);
      if (bk) bk.count++;
    }
    return b;
  }, [history]);

  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-6">Statistics</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Rounds" value={history.length.toString()} />
          <StatCard label="Avg crash" value={`${stats.avg.toFixed(2)}x`} />
          <StatCard label="Highest" value={`${stats.max.toFixed(2)}x`} accent />
          <StatCard label="< 2.00x" value={stats.under2.toString()} />
          <StatCard label="≥ 10.0x" value={stats.over10.toString()} />
        </div>

        <h2 className="font-display font-semibold mb-3">Distribution</h2>
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          {buckets.map((b) => (
            <div key={b.label} className="grid grid-cols-[120px_1fr_40px] gap-3 items-center">
              <span className="text-xs text-muted-foreground font-mono-tabular">{b.label}</span>
              <div className="h-3 rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[var(--gold)]"
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono-tabular text-right">{b.count}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-2xl font-display font-bold font-mono-tabular ${
          accent ? "text-[var(--gold)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

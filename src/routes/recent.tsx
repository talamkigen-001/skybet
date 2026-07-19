import { createFileRoute, Link } from "@tanstack/react-router";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { GameGrid } from "@/components/casino/GameRow";
import { useCasino } from "@/lib/casino-store";
import { GAMES } from "@/lib/games-catalog";

export const Route = createFileRoute("/recent")({
  head: () => ({ meta: [{ title: "Recently Played — NOROC JETX" }] }),
  component: Recent,
});

function Recent() {
  const ids = useCasino((s) => s.recent);
  const games = ids.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as typeof GAMES;
  return (
    <CasinoLayout>
      <h1 className="font-display text-4xl font-extrabold">Recently played</h1>
      {games.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-3">↻</div>
          <p>You haven't played anything yet.</p>
          <Link
            to="/games/crash"
            className="mt-3 inline-block text-primary hover:underline text-sm font-semibold"
          >
            Try Noroc JetX →
          </Link>
        </div>
      ) : (
        <GameGrid games={games} />
      )}
    </CasinoLayout>
  );
}

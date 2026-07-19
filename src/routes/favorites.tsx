import { createFileRoute, Link } from "@tanstack/react-router";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { GameGrid } from "@/components/casino/GameRow";
import { useCasino } from "@/lib/casino-store";
import { GAMES } from "@/lib/games-catalog";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — NOROC JETX" }] }),
  component: Favorites,
});

function Favorites() {
  const favIds = useCasino((s) => s.favorites);
  const games = favIds.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as typeof GAMES;
  return (
    <CasinoLayout>
      <h1 className="font-display text-4xl font-extrabold">Favorites</h1>
      {games.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-3">♡</div>
          <p>No favorite games yet.</p>
          <Link
            to="/casino"
            className="mt-3 inline-block text-primary hover:underline text-sm font-semibold"
          >
            Browse the lobby →
          </Link>
        </div>
      ) : (
        <GameGrid games={games} />
      )}
    </CasinoLayout>
  );
}

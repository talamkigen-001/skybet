import { createFileRoute, notFound } from "@tanstack/react-router";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { GameGrid } from "@/components/casino/GameRow";
import { GAMES, CATEGORIES, type GameCategory } from "@/lib/games-catalog";

const VALID = new Set(CATEGORIES.map((c) => c.id).filter((c) => c !== "all"));

export const Route = createFileRoute("/casino/$category")({
  head: ({ params }) => ({
    meta: [{ title: `${capitalize(params.category)} — NOROC JETX` }],
  }),
  beforeLoad: (({ params }: any) => {
    if (!VALID.has(params.category as GameCategory)) throw notFound();
  }) as any,
  component: Category,
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Category() {
  const { category } = Route.useParams();
  const meta = CATEGORIES.find((c) => c.id === category)!;
  const games = GAMES.filter((g) => g.category === category);
  return (
    <CasinoLayout>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{meta.icon}</span>
        <div>
          <h1 className="font-display text-3xl font-extrabold">{meta.label}</h1>
          <p className="text-sm text-muted-foreground">{games.length} games</p>
        </div>
      </div>
      <GameGrid games={games} />
    </CasinoLayout>
  );
}

import { notFound } from "next/navigation";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { GameGrid } from "@/components/casino/GameRow";
import { GAMES, CATEGORIES, type GameCategory } from "@/lib/games-catalog";

const VALID = new Set(CATEGORIES.map((c) => c.id).filter((c) => c !== "all"));

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  if (!VALID.has(category as GameCategory)) {
    notFound();
  }

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

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return {
    title: `${capitalize(category)} — NOROC JETX`,
  };
}

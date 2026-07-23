import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games-catalog";
import { RouletteGame } from "@/components/live/RouletteGame";
import { CrashVariantGame } from "@/components/live/CrashVariantGame";
import { MinesGame } from "@/components/live/MinesGame";
import { PlinkoGame } from "@/components/live/PlinkoGame";
import { CrazyTimeGame } from "@/components/live/CrazyTimeGame";
import { CoinFlipGame } from "@/components/live/CoinFlipGame";

const SLUG_TO_COMPONENT: Record<string, React.ComponentType<any>> = {
  "lucky-jet": () => <CrashVariantGame slug="lucky-jet" title="Lucky Jet" glyph="🧑‍🚀" />,
  "speed-and-cash": () => (
    <CrashVariantGame slug="speed-and-cash" title="Speed & Cash" glyph="🏎️" />
  ),
  "rocket-queen": () => <CrashVariantGame slug="rocket-queen" title="Rocket Queen" glyph="👸" />,
  aviator: () => <CrashVariantGame slug="aviator" title="Aviator" glyph="✈️" />,
  jetx: () => <CrashVariantGame slug="jetx" title="JetX" glyph="🚀" />,
  mines: MinesGame,
  plinko: PlinkoGame,
  "crazy-time": CrazyTimeGame,
  "coin-flip": CoinFlipGame,
  "roulette-live": RouletteGame,
};

const VALID_SLUGS = new Set(Object.keys(SLUG_TO_COMPONENT));

export default async function LiveGameRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!VALID_SLUGS.has(slug)) {
    notFound();
  }

  const GameComponent = SLUG_TO_COMPONENT[slug];

  if (!GameComponent) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Game not found</h1>
          <p className="text-muted-foreground mt-2">This game doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return <GameComponent />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = GAMES.find((g) => g.slug === slug);
  return {
    title: game ? `${game.name} — Live Casino` : "Live Game",
    description: game ? `Play ${game.name} live with real-time betting.` : "Live casino game",
  };
}

// Original game catalog for 1win Live Casino.
export type GameCategory = "crash" | "live";

export type Badge = "new" | "hot" | "popular" | "exclusive";

export interface Game {
  id: string;
  name: string;
  slug: string;
  provider: string;
  category: GameCategory;
  rtp?: number;
  volatility?: "low" | "medium" | "high";
  badges?: Badge[];
  hue: [string, string];
  glyph: string;
  href?: string;
}

export const PROVIDERS = ["1win", "Spribe", "SmartSoft", "Evolution", "NorocStudios", "JetxLabs"];

const HUES: Array<[string, string]> = [
  ["#7c3aed", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#14b8a6"],
  ["#8b5cf6", "#6366f1"],
  ["#f43f5e", "#fb923c"],
];

function make(id: number, name: string, category: GameCategory, opts: Partial<Game> = {}): Game {
  const hue = HUES[id % HUES.length];
  return {
    id: `g${id}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    provider: PROVIDERS[id % PROVIDERS.length],
    category,
    rtp: 97 + ((id * 7) % 200) / 100,
    volatility: (["low", "medium", "high"] as const)[id % 3],
    hue,
    glyph: "♠",
    ...opts,
  };
}

export const GAMES: Game[] = [
  // 1win Top 10 Games in Live Casino
  make(1, "Lucky Jet", "live", {
    badges: ["hot", "exclusive"],
    href: "/games/live/lucky-jet",
    glyph: "🧑‍🚀",
    provider: "1win",
  }),
  make(2, "Speed & Cash", "live", {
    badges: ["hot"],
    href: "/games/live/speed-and-cash",
    glyph: "🏎️",
    provider: "1win",
  }),
  make(3, "Rocket Queen", "live", {
    badges: ["exclusive"],
    href: "/games/live/rocket-queen",
    glyph: "👸",
    provider: "1win",
  }),
  make(4, "Aviator", "live", {
    badges: ["popular"],
    href: "/games/live/aviator",
    glyph: "✈️",
    provider: "Spribe",
  }),
  make(5, "JetX", "live", {
    href: "/games/live/jetx",
    glyph: "🚀",
    provider: "SmartSoft",
  }),
  make(6, "Mines", "live", {
    badges: ["new"],
    href: "/games/live/mines",
    glyph: "💣",
    provider: "Spribe",
  }),
  make(7, "Plinko", "live", {
    href: "/games/live/plinko",
    glyph: "🔺",
    provider: "Spribe",
  }),
  make(8, "Crazy Time", "live", {
    badges: ["hot", "popular"],
    href: "/games/live/crazy-time",
    glyph: "🎡",
    provider: "Evolution",
  }),
  make(9, "Coin Flip", "live", {
    badges: ["new"],
    href: "/games/live/coin-flip",
    glyph: "🪙",
    provider: "Evolution",
  }),
  make(10, "Roulette Live", "live", {
    badges: ["popular"],
    href: "/games/live/roulette-live",
    glyph: "🎡",
    provider: "Evolution",
  }),

  // Keep a dummy crash game under category crash to keep any crash filters happy
  make(11, "Noroc JetX", "crash", {
    badges: ["hot"],
    href: "/games/crash",
    glyph: "🚀",
    provider: "1win",
  }),
];

export const CATEGORIES: { id: GameCategory | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All games", icon: "◎" },
  { id: "crash", label: "Crash", icon: "🚀" },
  { id: "live", label: "Live Casino", icon: "🎥" },
];

export function gamesBy(cat: GameCategory) {
  return GAMES.filter((g) => g.category === cat);
}

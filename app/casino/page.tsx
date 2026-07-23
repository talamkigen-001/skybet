"use client";

import { useMemo, useState } from "react";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { GameGrid } from "@/components/casino/GameRow";
import { GAMES, PROVIDERS, CATEGORIES, type GameCategory } from "@/lib/games-catalog";

type Sort = "popular" | "new" | "az" | "rtp";

export default function AllGames() {
  const [cat, setCat] = useState<GameCategory | "all">("all");
  const [prov, setProv] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("popular");

  const games = useMemo(() => {
    let g = [...GAMES];
    if (cat !== "all") g = g.filter((x) => x.category === cat);
    if (prov !== "all") g = g.filter((x) => x.provider === prov);
    if (sort === "az") g.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "rtp") g.sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0));
    else if (sort === "new")
      g.sort((a, b) => Number(b.badges?.includes("new")) - Number(a.badges?.includes("new")));
    else
      g.sort(
        (a, b) =>
          Number(b.badges?.includes("popular") || b.badges?.includes("hot")) -
          Number(a.badges?.includes("popular") || a.badges?.includes("hot")),
      );
    return g;
  }, [cat, prov, sort]);

  return (
    <CasinoLayout>
      <div>
        <h1 className="font-display text-3xl font-extrabold">Live Casino lobby</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {GAMES.length} original games · {PROVIDERS.length} studios
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center sticky top-16 z-30 -mx-3 px-3 py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`px-3 h-9 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                cat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 hover:bg-secondary"
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <select
          value={prov}
          onChange={(e) => setProv(e.target.value)}
          className="h-9 rounded-full bg-secondary/60 border border-border px-3 text-xs font-semibold"
        >
          <option value="all">All providers</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-9 rounded-full bg-secondary/60 border border-border px-3 text-xs font-semibold"
        >
          <option value="popular">Popular</option>
          <option value="new">Newest</option>
          <option value="az">A — Z</option>
          <option value="rtp">Highest RTP</option>
        </select>
      </div>

      {games.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">No games match these filters.</div>
      ) : (
        <GameGrid games={games} />
      )}
    </CasinoLayout>
  );
}

"use client";
import Link from "next/link";
import type { Game } from "@/lib/games-catalog";
import { GameCard } from "./GameCard";

export function GameRow({
  title,
  icon,
  games,
  viewAll,
}: {
  title: string;
  icon?: string;
  games: Game[];
  viewAll?: string;
}) {
  if (games.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          {title}
        </h2>
        {viewAll && (
          <Link
            href={viewAll}
            className="text-xs text-muted-foreground hover:text-primary font-semibold"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {games.slice(0, 12).map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </section>
  );
}

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}

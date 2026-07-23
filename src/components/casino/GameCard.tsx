"use client";
import Link from "next/link";
import { useCasino } from "@/lib/casino-store";
import type { Game, Badge } from "@/lib/games-catalog";
import { useGame } from "@/lib/game-store";

const BADGE_STYLE: Record<Badge, string> = {
  new: "bg-[var(--win)]/20 text-[var(--win)] border-[var(--win)]/40",
  hot: "bg-accent/20 text-accent border-accent/40",
  popular: "bg-primary/20 text-primary border-primary/40",
  exclusive: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40",
};

export function GameCard({ game }: { game: Game }) {
  const fav = useCasino((s) => s.favorites.includes(game.id));
  const toggle = useCasino((s) => s.toggleFavorite);
  const markPlayed = useCasino((s) => s.markPlayed);
  const balance = useGame((s) => s.balance);

  const playable = !!game.href;
  const inner = (
    <div
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-border/60 bg-card cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
      style={{ boxShadow: "0 6px 20px -8px rgba(0,0,0,0.5)" }}
    >
      {/* Thumbnail */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${game.hue[0]}, ${game.hue[1]})`,
        }}
      >
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.4), transparent 40%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-lg select-none transition-transform duration-500 group-hover:scale-110">
          {game.glyph}
        </div>
      </div>

      {/* Top badges */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 z-10">
        <div className="flex flex-wrap gap-1">
          {game.badges?.map((b) => (
            <span
              key={b}
              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLE[b]}`}
            >
              {b}
            </span>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(game.id);
          }}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className={`shrink-0 w-7 h-7 rounded-full grid place-items-center backdrop-blur-md transition-colors ${
            fav ? "bg-accent text-accent-foreground" : "bg-black/40 text-white/80 hover:bg-black/60"
          }`}
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
        {playable ? (
          <button
            onClick={() => markPlayed(game.id)}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:scale-105 transition-transform"
          >
            ▶ Play
          </button>
        ) : (
          <button
            disabled
            title="Coming soon"
            className="px-5 py-2 rounded-full bg-primary/70 text-primary-foreground text-sm font-bold cursor-not-allowed"
          >
            ▶ Play
          </button>
        )}
        <button
          disabled={!playable}
          className="px-4 py-1.5 rounded-full text-xs font-semibold border border-white/30 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Demo
        </button>
        {game.rtp && (
          <span className="text-[10px] text-white/70 font-mono-tabular mt-1">
            RTP {game.rtp.toFixed(2)}% · {game.volatility}
          </span>
        )}
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent z-10">
        <div className="text-sm font-semibold text-white truncate">{game.name}</div>
        <div className="text-[10px] text-white/60 truncate">{game.provider}</div>
      </div>
      {!playable && (
        <div className="absolute top-2 right-10 text-[9px] text-white/50">{balance ? "" : ""}</div>
      )}
    </div>
  );

  if (playable && game.href) {
    return (
      <Link href={game.href} onClick={() => markPlayed(game.id)}>
        {inner}
      </Link>
    );
  }
  return inner;
}

"use client";

import Link from "next/link";
import { CasinoTopBar } from "@/components/casino/CasinoTopBar";
import { CasinoFooter } from "@/components/casino/CasinoFooter";
import { GameCard } from "@/components/casino/GameCard";
import { gamesBy } from "@/lib/games-catalog";

export default function LiveCasinoLobby() {
  const liveGames = gamesBy("live");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CasinoTopBar />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 border border-border/40">
          <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(139,92,246,0.35), transparent 50%), radial-gradient(circle at 80% 50%, rgba(236,72,153,0.3), transparent 50%)",
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl">
                🎥
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--win)] animate-pulse" />
                <span className="text-xs font-semibold text-[var(--win)] uppercase tracking-wider">
                  Live now
                </span>
              </div>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
              1win Live Casino
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              Experience the thrill of real-time multiplayer gaming. Choose your favorite game,
              place bets, and win big with 100% functional simulation screens!
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/40 text-sm">
                <span>🎰</span>
                <span className="font-semibold">{liveGames.length} Premium Games</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/40 text-sm">
                <span>🏆</span>
                <span className="text-muted-foreground">Interactive Simulator</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/40 text-sm">
                <span>⚡</span>
                <span className="text-muted-foreground">Instant Play & Cashout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            ← Back to Live Casino
          </Link>
          <span className="text-xs text-muted-foreground font-mono-tabular">
            10 active tables online
          </span>
        </div>

        {/* Games grid */}
        <div>
          <h2 className="font-display text-2xl font-bold mb-5 flex items-center gap-2">
            <span className="text-2xl">🎥</span>
            Popular Games
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {liveGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon="🚀"
            title="Crash Games"
            desc="Lucky Jet, Speed & Cash, Rocket Queen, Aviator, JetX. Cash out before the crash!"
          />
          <InfoCard
            icon="💣"
            title="Instant Win"
            desc="Guess hidden gems in Mines, or drop balls down the Plinko peg board for massive multipliers."
          />
          <InfoCard
            icon="🎡"
            title="Live Dealer Shows"
            desc="Spin the giant wheel in Crazy Time, flip coin values, or play traditional European Roulette."
          />
        </div>
      </main>

      <CasinoFooter />
    </div>
  );
}

function InfoCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-5 hover:border-primary/30 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display font-bold text-base mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

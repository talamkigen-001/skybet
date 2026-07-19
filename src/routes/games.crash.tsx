import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game-store";
import { CrashGraph } from "@/components/crash/CrashGraph";
import { BetPanelV2 } from "@/components/crash/BetPanelV2";
import { LiveBets } from "@/components/crash/LiveBets";
import { ChatFeed } from "@/components/crash/ChatFeed";
import { HistoryStrip } from "@/components/crash/HistoryStrip";
import { MobileBetBar } from "@/components/crash/MobileBetBar";
import { CasinoTopBar } from "@/components/casino/CasinoTopBar";
import { CasinoFooter } from "@/components/casino/CasinoFooter";
import { useLocale, formatMoney } from "@/lib/locale";

export const Route = createFileRoute("/games/crash")({
  head: () => ({
    meta: [
      { title: "Noroc JetX — Provably Fair Crash Game" },
      {
        name: "description",
        content:
          "Real-time multiplayer crash betting with provably-fair rounds, auto-bet, and live cashout.",
      },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const init = useGame((s) => s.init);
  const balance = useGame((s) => s.balance);
  const currency = useLocale((s) => s.currency);
  const [mobileTab, setMobileTab] = useState<"bets" | "chat">("bets");

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CasinoTopBar />

      <div className="max-w-[1600px] mx-auto w-full px-3 sm:px-4 pt-3 flex items-center justify-between">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          ← Back to casino
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--win)] animate-pulse" />
            <span className="hidden sm:inline text-muted-foreground">Balance</span>
            <span className="font-mono-tabular font-semibold text-[var(--gold)]">
              {formatMoney(balance, currency)}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-3 sm:px-4 py-3 pb-[170px] lg:pb-3">
        <div className="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-[280px_1fr_300px]">
          {/* Left — Live bets (desktop only; mobile shows it inside tabs below) */}
          <aside className="hidden lg:block order-2 lg:order-1 lg:h-[78vh] lg:max-h-[820px]">
            <LiveBets />
          </aside>

          {/* Center — game */}
          <section className="order-1 lg:order-2 flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="font-display text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-primary via-[var(--gold)] to-accent bg-clip-text text-transparent truncate">
                NOROC JETX
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  className="w-9 h-9 rounded-lg bg-secondary/60 hover:bg-secondary text-sm"
                  aria-label="Sound"
                >
                  🔊
                </button>
                <button
                  className="w-9 h-9 rounded-lg bg-secondary/60 hover:bg-secondary text-sm"
                  aria-label="Music"
                >
                  🎵
                </button>
                <Link
                  to="/fairness"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-secondary/60 hover:bg-secondary text-xs"
                >
                  <span>?</span> How to play
                </Link>
              </div>
            </div>

            <HistoryStrip />

            <div className="aspect-[16/10] md:aspect-[18/10] rounded-2xl overflow-hidden border border-border/60 bg-card relative">
              <CrashGraph />
            </div>

            {/* Dual bet panels — desktop & tablet only; mobile uses sticky bar */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BetPanelV2 betIndex={0} variant="primary" />
              <BetPanelV2 betIndex={1} variant="accent" />
            </div>

            <div className="hidden lg:flex gap-3 text-xs text-muted-foreground">
              <Link to="/fairness" className="hover:text-primary">
                Provably fair →
              </Link>
              <Link to="/stats" className="hover:text-primary">
                Round stats →
              </Link>
            </div>
          </section>

          {/* Right — chat (desktop only; mobile shows it inside tabs below) */}
          <aside className="hidden lg:block order-3 lg:h-[78vh] lg:max-h-[820px]">
            <ChatFeed />
          </aside>

          {/* Mobile tab switcher for Bets / Chat */}
          <section className="lg:hidden order-4 col-span-1 flex flex-col gap-2 min-w-0">
            <div className="flex rounded-full bg-secondary/50 p-1 self-start">
              {(["bets", "chat"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition ${
                    mobileTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t === "bets" ? "Live bets" : "Chat"}
                </button>
              ))}
            </div>
            <div className="h-[60vh] min-h-[360px]">
              {mobileTab === "bets" ? <LiveBets /> : <ChatFeed />}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground pt-1">
              <Link to="/fairness" className="hover:text-primary">
                Provably fair →
              </Link>
              <Link to="/stats" className="hover:text-primary">
                Round stats →
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky bottom action bar — mobile/tablet only */}
      <MobileBetBar />

      <div className="hidden lg:block">
        <CasinoFooter />
      </div>
    </div>
  );
}

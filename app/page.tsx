"use client";

import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { HeroCarousel } from "@/components/casino/HeroCarousel";
import { GameRow } from "@/components/casino/GameRow";
import { gamesBy } from "@/lib/games-catalog";
import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const { t } = useTranslation();
  return (
    <CasinoLayout>
      <HeroCarousel />
      <GameRow
        title={t("sidebar.crash_games")}
        icon="🚀"
        games={gamesBy("crash")}
        viewAll="/casino/crash"
      />
      <GameRow
        title={t("sidebar.live_casino")}
        icon="🎥"
        games={gamesBy("live")}
        viewAll="/games/live"
      />
    </CasinoLayout>
  );
}

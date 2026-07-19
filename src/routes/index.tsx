import { createFileRoute } from "@tanstack/react-router";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { HeroCarousel } from "@/components/casino/HeroCarousel";
import { GameRow } from "@/components/casino/GameRow";
import { gamesBy } from "@/lib/games-catalog";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "1win — Live Casino" },
      { name: "description", content: "Play the best 1win crash games and live casino tables." },
      { property: "og:title", content: "1win Live Casino" },
      {
        property: "og:description",
        content: "Play crash games and live casino tables with instant cashouts.",
      },
    ],
  }),
  component: Home,
});

function Home() {
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

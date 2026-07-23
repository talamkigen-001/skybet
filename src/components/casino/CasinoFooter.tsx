"use client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function CasinoFooter() {
  const { t } = useTranslation();
  const cols = [
    {
      title: t("footer.games"),
      links: [
        ["Noroc JetX", "/games/crash"],
        [t("sidebar.crash_games"), "/casino/crash"],
        [t("sidebar.live_casino"), "/games/live"],
      ],
    },
    {
      title: t("footer.player"),
      links: [
        [t("sidebar.promotions"), "/promotions"],
        [t("sidebar.favorites"), "/favorites"],
        [t("sidebar.recently_played"), "/recent"],
      ],
    },
    {
      title: t("footer.fairness"),
      links: [
        [t("sidebar.provably_fair"), "/fairness"],
        [t("footer.round_stats"), "/stats"],
      ],
    },
    {
      title: t("footer.company"),
      links: [
        [t("footer.about"), "/"],
        [t("footer.terms"), "/"],
        [t("footer.privacy"), "/"],
        [t("footer.responsible_play"), "/"],
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t border-border/60 bg-card/40">
      <div className="max-w-[1600px] mx-auto px-6 py-10 grid gap-8 md:grid-cols-[1.4fr_repeat(4,_1fr)]">
        <div>
          <div className="flex items-center gap-2 font-display font-extrabold text-lg">
            <img
              src="/logo.png"
              alt="Noroc Bet Logo"
              className="h-16 w-auto object-contain drop-shadow-md"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground max-w-sm leading-relaxed">
            {t("footer.desc")}
          </p>
          <div className="mt-3 flex gap-2 text-muted-foreground">
            {["18+", "RG", "SSL", "PF"].map((t) => (
              <span
                key={t}
                className="text-[10px] px-2 py-1 rounded border border-border bg-secondary/40"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              {c.title}
            </div>
            <ul className="space-y-1.5">
              {c.links.map(([l, h]) => (
                <li key={l}>
                  <Link
                    href={h}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 1win Live Casino · {t("footer.copyright")}
      </div>
    </footer>
  );
}

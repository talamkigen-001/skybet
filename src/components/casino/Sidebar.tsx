"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCasino } from "@/lib/casino-store";
import { useTranslation, TranslationKeys } from "@/lib/i18n";

type NavItem = { to: string; labelKey: TranslationKeys; icon: string };

const TOP: NavItem[] = [
  { to: "/", labelKey: "sidebar.home", icon: "⌂" },
  { to: "/games/crash", labelKey: "sidebar.crash_games", icon: "🚀" },
  { to: "/casino/crash", labelKey: "sidebar.crash_games", icon: "☄" },
  { to: "/games/live", labelKey: "sidebar.live_casino", icon: "🎥" },
];

const BOTTOM: NavItem[] = [
  { to: "/promotions", labelKey: "sidebar.promotions", icon: "🎁" },
  { to: "/favorites", labelKey: "sidebar.favorites", icon: "♥" },
  { to: "/recent", labelKey: "sidebar.recently_played", icon: "↻" },
  { to: "/fairness", labelKey: "sidebar.provably_fair", icon: "✓" },
];

export function Sidebar() {
  const pathname = usePathname();
  const favCount = useCasino((s) => s.favorites.length);
  const { t } = useTranslation();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] border-r border-border/60 bg-card/40 backdrop-blur-md">
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <Section title={t("sidebar.browse")}>
          {TOP.map((i) => (
            <Item
              key={i.to}
              href={i.to}
              label={t(i.labelKey)}
              icon={i.icon}
              active={pathname === i.to}
            />
          ))}
        </Section>
        <Section title={t("sidebar.player")}>
          {BOTTOM.map((i) => (
            <Item
              key={i.to}
              href={i.to}
              label={t(i.labelKey)}
              icon={i.icon}
              active={pathname === i.to}
              badge={i.to === "/favorites" && favCount > 0 ? favCount : undefined}
            />
          ))}
        </Section>
      </nav>
      <div className="p-4 border-t border-border/60">
        <div className="rounded-xl p-3 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
          <div className="text-xs font-semibold text-primary">{t("sidebar.welcome_bonus")}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{t("sidebar.bonus_desc")}</div>
          <Link
            href="/promotions"
            className="mt-2 inline-flex text-xs font-semibold text-foreground hover:text-primary"
          >
            {t("sidebar.claim")}
          </Link>
        </div>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-primary/15 text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-primary/20 text-primary">
          {badge}
        </span>
      )}
    </Link>
  );
}

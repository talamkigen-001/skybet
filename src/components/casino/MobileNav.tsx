"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCasino } from "@/lib/casino-store";
import { Home, Rocket, Video, Gift, User, LogIn, Trophy } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const favCount = useCasino((s) => s.favorites.length);

  const ITEMS = [
    { href: "/", label: "Home", icon: Home },
    { href: "/games/crash", label: "Crash", icon: Rocket },
    { href: "/games/live", label: "Live", icon: Video },
    { href: "/promotions", label: "Promos", icon: Gift },
    {
      href: user ? "/profile" : "/auth",
      label: user ? "Profile" : "Sign In",
      icon: user ? User : LogIn,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-2xl border-t border-border/60 px-2 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-primary scale-110" : ""}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

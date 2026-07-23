"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game-store";
import { GAMES, PROVIDERS } from "@/lib/games-catalog";
import {
  CURRENCIES,
  LANGUAGES,
  formatMoney,
  convertMoney,
  useLocale,
  EXCHANGE_RATES,
  type CurrencyCode,
  type LanguageCode,
} from "@/lib/locale";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCasino } from "@/lib/casino-store";
import {
  Menu,
  Search,
  X,
  Wallet as WalletIcon,
  User as UserIcon,
  LogIn,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  Gift,
  Home,
  Rocket,
  Video,
  Heart,
  RotateCcw,
  CheckCircle,
  Trophy,
} from "lucide-react";

export function CasinoTopBar() {
  const balance = useGame((s) => s.balance);
  const { user, isAdmin } = useAuth();
  const store = useLocale();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const language = mounted ? store.language : "en";
  const currency = mounted ? store.currency : "EUR";
  const setLanguage = store.setLanguage;
  const queryClient = useQueryClient();
  const favCount = useCasino((s) => s.favorites.length);

  const setCurrency = async (c: CurrencyCode) => {
    const oldCurrency = store.currency;
    if (oldCurrency === c) return;

    // Convert local game balance & bet amounts directly for instant UI feedback
    const currentBalance = useGame.getState().balance;
    const newLocalBalance = convertMoney(currentBalance, oldCurrency, c);
    useGame.getState().setBalance(newLocalBalance);

    const currentBet = useGame.getState().betAmount;
    useGame.getState().setBetAmount(Math.max(1, convertMoney(currentBet, oldCurrency, c)));

    const currentBet2 = useGame.getState().betAmount2;
    useGame.getState().setBetAmount(Math.max(1, convertMoney(currentBet2, oldCurrency, c)));

    // Update locale state
    store.setCurrency(c);

    // Update Supabase wallet if user is authenticated
    if (user) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, bonus_balance, currency")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        const fromCurr = (wallet.currency as CurrencyCode) || oldCurrency;
        const newBalance = convertMoney(Number(wallet.balance), fromCurr, c);
        const newBonus = convertMoney(Number(wallet.bonus_balance), fromCurr, c);

        await supabase
          .from("wallets")
          .update({
            currency: c,
            balance: newBalance,
            bonus_balance: newBonus,
          })
          .eq("user_id", user.id);

        queryClient.invalidateQueries({ queryKey: ["wallet", user.id] });
      }
    }
  };

  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const localeRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
      if (localeRef.current && !localeRef.current.contains(e.target as Node)) setLocaleOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const results = q
    ? GAMES.filter(
        (g) =>
          g.name.toLowerCase().includes(q.toLowerCase()) ||
          g.provider.toLowerCase().includes(q.toLowerCase()),
      ).slice(0, 8)
    : [];

  const lang = LANGUAGES.find((l) => l.code === language)!;
  const curr = CURRENCIES.find((c) => c.code === currency)!;

  const NAV_ITEMS = [
    { href: "/", label: t("sidebar.home"), icon: Home },
    { href: "/games/crash", label: t("sidebar.crash_games"), icon: Rocket },
    { href: "/games/live", label: t("sidebar.live_casino"), icon: Video },
    { href: "/promotions", label: t("sidebar.promotions"), icon: Gift },
    { href: "/tournaments", label: "Tournaments", icon: Trophy },
    { href: "/favorites", label: t("sidebar.favorites"), icon: Heart, badge: favCount > 0 ? favCount : undefined },
    { href: "/recent", label: t("sidebar.recently_played"), icon: RotateCcw },
    { href: "/fairness", label: t("sidebar.provably_fair"), icon: CheckCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl transition-all">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Mobile Drawer Trigger + Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile & Tablet Drawer Trigger */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground border border-border/40 transition"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 bg-background/95 backdrop-blur-2xl border-r border-border/60 flex flex-col">
              <SheetHeader className="p-4 border-b border-border/40 text-left flex flex-row items-center justify-between">
                <SheetTitle className="text-left font-display font-bold text-lg flex items-center gap-2">
                  <img src="/logo.png" alt="Noroc Logo" className="h-10 w-auto object-contain" />
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Mobile Auth Status Header */}
                {!user ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border border-primary/30 flex flex-col gap-3">
                    <div className="text-xs font-bold text-foreground">Welcome to Noroc JetX</div>
                    <div className="text-[11px] text-muted-foreground">Sign in to play live games, deposit funds, and claim bonuses.</div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Link
                        href="/auth"
                        onClick={() => setDrawerOpen(false)}
                        className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center gap-1.5 shadow"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </Link>
                      <Link
                        href="/auth"
                        onClick={() => setDrawerOpen(false)}
                        className="h-9 px-3 rounded-xl bg-secondary hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-extrabold text-sm shadow">
                        {(user.email ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-foreground">{user.email}</div>
                        <div className="text-[10px] text-muted-foreground">Logged in</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Balance</span>
                      <span className="text-sm font-extrabold font-mono-tabular text-[var(--gold)]">
                        {formatMoney(balance, currency)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        href="/wallet"
                        onClick={() => setDrawerOpen(false)}
                        className="h-9 px-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <WalletIcon className="w-3.5 h-3.5" />
                        <span>Wallet</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setDrawerOpen(false)}
                        className="h-9 px-3 rounded-xl bg-secondary hover:bg-muted text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Mobile Nav Links */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                    Navigation
                  </div>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                          isActive
                            ? "bg-primary/15 text-primary font-bold shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Admin Link if Admin */}
                {isAdmin && (
                  <div className="pt-2 border-t border-border/40">
                    <Link
                      href="/admin"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[var(--gold)] hover:bg-secondary/60"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Drawer Footer Signout if logged in */}
              {user && (
                <div className="p-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={async () => {
                      setDrawerOpen(false);
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                    className="w-full h-10 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="Noroc Bet Logo"
              className="h-10 sm:h-14 md:h-16 w-auto object-contain drop-shadow-md transition-transform hover:scale-105"
            />
          </Link>
        </div>

        {/* Center: Responsive Search Input */}
        <div ref={searchRef} className="relative flex-1 max-w-sm sm:max-w-md md:max-w-xl mx-1 sm:mx-2">
          <div className="flex items-center gap-2 rounded-full bg-secondary/60 border border-border/60 px-3 sm:px-4 h-9 sm:h-10 focus-within:ring-1 focus-within:ring-primary transition-all">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            <input
              value={q}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              placeholder={t("topbar.search_games")}
              className="flex-1 bg-transparent outline-none text-xs sm:text-sm placeholder:text-muted-foreground"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-panel p-2 sm:p-3 z-50 max-h-[60vh] overflow-y-auto shadow-2xl border border-border/60">
              {q && results.length === 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground p-3 text-center">
                  {`No matches for "${q}"`}
                </div>
              )}
              {results.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-2">
                    Games
                  </div>
                  {results.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        if (g.href) router.push(g.href);
                        else router.push(`/casino/${g.category}`);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary text-left transition"
                    >
                      <span
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg grid place-items-center text-base sm:text-lg shrink-0"
                        style={{ background: `linear-gradient(135deg, ${g.hue[0]}, ${g.hue[1]})` }}
                      >
                        {g.glyph}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs sm:text-sm font-bold truncate">{g.name}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {g.provider} · {g.category}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Currency/Language Picker + Login & Wallet Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Language & Currency Popover Selector */}
          <div ref={localeRef} className="relative">
            <button
              type="button"
              onClick={() => setLocaleOpen((v) => !v)}
              className="h-9 sm:h-10 px-2 sm:px-3 rounded-full bg-secondary/60 border border-border/60 text-xs font-bold flex items-center gap-1 sm:gap-1.5 hover:bg-secondary transition"
              aria-label="Language and currency"
            >
              <span className="text-sm sm:text-base leading-none">{lang.flag}</span>
              <span className="text-[11px] sm:text-xs font-mono-tabular font-bold">{curr.code}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {localeOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] rounded-2xl glass-panel p-3 z-50 grid grid-cols-2 gap-3 shadow-2xl border border-border/60">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground px-1 pb-1">
                    Language
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code as LanguageCode);
                          setLocaleOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-secondary ${
                          language === l.code ? "bg-primary/15 text-primary font-bold" : ""
                        }`}
                      >
                        <span className="text-sm leading-none">{l.flag}</span>
                        <span className="flex-1 truncate font-medium">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground px-1 pb-1">
                    Currency
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code as CurrencyCode);
                          setLocaleOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-secondary ${
                          currency === c.code ? "bg-primary/15 text-primary font-bold" : ""
                        }`}
                      >
                        <span className="truncate font-bold">{c.code}</span>
                        <span className="text-muted-foreground text-[10px]">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auth Action Buttons (ALWAYS Visible on Phone, Tablet & Desktop) */}
          {!user ? (
            <Link
              href="/auth"
              className="h-9 sm:h-10 px-3 sm:px-4 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-extrabold rounded-xl hover:brightness-110 transition shadow-md flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("topbar.sign_in")}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Wallet Balance Pill */}
              <Link
                href="/wallet"
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 transition flex items-center gap-1.5 shadow-inner"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-black text-[10px] font-extrabold shrink-0">
                  $
                </div>
                <div className="text-xs sm:text-sm font-extrabold font-mono-tabular text-[var(--gold)] tracking-tight">
                  {formatMoney(balance, currency)}
                </div>
              </Link>

              {/* User Menu Popover */}
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-extrabold shadow-md hover:shadow-lg transition outline-none text-xs sm:text-sm shrink-0"
                  >
                    {(user.email ?? "?").slice(0, 1).toUpperCase()}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-56 p-2 rounded-2xl glass-panel shadow-2xl border-border/40"
                >
                  <div className="px-3 py-2 border-b border-border/40 mb-1">
                    <div className="text-xs font-bold text-foreground truncate">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserOpen(false);
                        router.push("/wallet");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-secondary text-xs sm:text-sm font-bold flex items-center gap-2"
                    >
                      <WalletIcon className="w-4 h-4 text-emerald-400" />
                      <span>{t("topbar.wallet")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserOpen(false);
                        router.push("/profile");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-secondary text-xs sm:text-sm font-semibold flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-sky-400" />
                      <span>{t("topbar.profile")}</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserOpen(false);
                          router.push("/admin");
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-secondary text-xs sm:text-sm text-[var(--gold)] font-bold flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        <span>{t("topbar.admin_dashboard")}</span>
                      </button>
                    )}
                    <div className="my-1 border-t border-border/40" />
                    <button
                      type="button"
                      onClick={async () => {
                        setUserOpen(false);
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-destructive/20 text-destructive text-xs sm:text-sm font-bold flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t("topbar.sign_out")}</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

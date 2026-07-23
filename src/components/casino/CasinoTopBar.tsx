"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game-store";
import { GAMES, PROVIDERS } from "@/lib/games-catalog";
import {
  CURRENCIES,
  LANGUAGES,
  formatMoney,
  useLocale,
  EXCHANGE_RATES,
  type CurrencyCode,
  type LanguageCode,
} from "@/lib/locale";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function CasinoTopBar() {
  const balance = useGame((s) => s.balance);
  const { user, isAdmin, signOut } = useAuth();
  const store = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const language = mounted ? store.language : "en";
  const currency = mounted ? store.currency : "EUR";
  const setLanguage = store.setLanguage;
  const queryClient = useQueryClient();
  const setCurrency = async (c: CurrencyCode) => {
    store.setCurrency(c);
    if (user) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, bonus_balance, currency")
        .eq("user_id", user.id)
        .maybeSingle();
      if (wallet && wallet.currency !== c) {
        const rate = EXCHANGE_RATES[c] / EXCHANGE_RATES[wallet.currency as CurrencyCode];
        const newBalance = Number((Number(wallet.balance) * rate).toFixed(2));
        const newBonus = Number((Number(wallet.bonus_balance) * rate).toFixed(2));
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 min-h-[120px] py-2 flex items-center gap-3 sm:gap-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-extrabold text-lg shrink-0"
        >
          <img
            src="/logo.png"
            alt="Noroc Bet Logo"
            className="h-[100px] w-auto object-contain drop-shadow-md"
          />
        </Link>

        <div ref={searchRef} className="relative flex-1 max-w-xl">
          <div className="flex items-center gap-2 rounded-full bg-secondary/60 border border-border px-4 h-10 focus-within:ring-1 focus-within:ring-primary">
            <span className="text-muted-foreground">🔍</span>
            <input
              value={q}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              placeholder={t("topbar.search_games")}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-panel p-3 z-50 max-h-[60vh] overflow-y-auto">
              {q && results.length === 0 && (
                <div className="text-sm text-muted-foreground p-3">{`No matches for "${q}"`}</div>
              )}
              {results.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-2">
                    Games
                  </div>
                  {results.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        if (g.href) router.push(g.href);
                        else router.push(`/casino/${g.category}`);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary text-left"
                    >
                      <span
                        className="w-9 h-9 rounded-md grid place-items-center text-lg shrink-0"
                        style={{ background: `linear-gradient(135deg, ${g.hue[0]}, ${g.hue[1]})` }}
                      >
                        {g.glyph}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{g.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">
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

        <div className="flex items-center gap-2 shrink-0">
          <div ref={localeRef} className="relative">
            <button
              onClick={() => setLocaleOpen((v) => !v)}
              className="h-10 px-3 rounded-full bg-secondary/60 border border-border text-xs font-semibold flex items-center gap-2 hover:bg-secondary"
              aria-label="Language and currency"
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="hidden sm:inline uppercase">{lang.code}</span>
              <span className="text-muted-foreground">·</span>
              <span>{curr.code}</span>
              <span className="text-[10px] text-muted-foreground">▾</span>
            </button>
            {localeOpen && (
              <div className="absolute right-0 top-full mt-2 w-[320px] rounded-2xl glass-panel p-3 z-50 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-1 pb-1">
                    Language
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code as LanguageCode);
                          setLocaleOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-secondary ${
                          language === l.code ? "bg-primary/15 text-primary font-semibold" : ""
                        }`}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className="flex-1 truncate">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-1 pb-1">
                    Currency
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCurrency(c.code as CurrencyCode);
                          setLocaleOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-secondary ${
                          currency === c.code ? "bg-primary/15 text-primary font-semibold" : ""
                        }`}
                      >
                        <span className="truncate">{c.code}</span>
                        <span className="text-muted-foreground">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!user ? (
            <Link
              href="/auth"
              className="hidden sm:inline-flex px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap shadow-sm text-sm"
            >
              {t("topbar.sign_in")}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/50 transition-colors shadow-inner"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-black text-[10px] font-bold">
                  $
                </div>
                <div className="text-sm font-bold font-mono-tabular tracking-tight">
                  {formatMoney(balance, currency)}
                </div>
              </Link>

              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-md hover:shadow-lg transition-all outline-none">
                    {(user.email ?? "?").slice(0, 1).toUpperCase()}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-56 p-2 rounded-2xl glass-panel shadow-2xl border-border/40"
                >
                  <div className="px-3 py-2 border-b border-border/40 mb-2">
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setUserOpen(false);
                        router.push("/wallet");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm font-semibold"
                    >
                      {t("topbar.wallet")}
                    </button>
                    <button
                      onClick={() => {
                        setUserOpen(false);
                        router.push("/profile");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm"
                    >
                      {t("topbar.profile")}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserOpen(false);
                          router.push("/admin");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm text-[var(--gold)] font-semibold"
                      >
                        🛡 {t("topbar.admin_dashboard")}
                      </button>
                    )}
                    <div className="my-1 border-t border-border/40" />
                    <button
                      onClick={async () => {
                        setUserOpen(false);
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-destructive/20 text-destructive text-sm"
                    >
                      {t("topbar.sign_out")}
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

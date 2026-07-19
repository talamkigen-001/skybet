import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
] as const;

export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "RON", symbol: "lei", label: "Romanian Leu" },
  { code: "MDL", symbol: "L", label: "Moldovan Leu" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "PLN", symbol: "zł", label: "Polish Złoty" },
  { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
  { code: "TRY", symbol: "₺", label: "Turkish Lira" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

interface LocaleState {
  language: LanguageCode;
  currency: CurrencyCode;
  setLanguage: (l: LanguageCode) => void;
  setCurrency: (c: CurrencyCode) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      language: "en",
      currency: "EUR",
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "noroc-jetx-locale-v1" },
  ),
);

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatMoney(amount: number, code: CurrencyCode): string {
  const sym = currencySymbol(code);
  const value = amount.toFixed(2);
  // Postfix for codes that read naturally after the number
  if (code === "RON" || code === "PLN" || code === "SEK" || code === "CHF") {
    return `${value} ${sym}`;
  }
  return `${sym}${value}`;
}

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  EUR: 1.0,
  USD: 1.08,
  RON: 4.97,
  MDL: 19.25,
  GBP: 0.85,
  PLN: 4.31,
  UAH: 43.5,
  CHF: 0.96,
  SEK: 11.2,
  TRY: 35.1,
};

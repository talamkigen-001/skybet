import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
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
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "HUF", symbol: "Ft", label: "Hungarian Forint" },
  { code: "MDL", symbol: "L", label: "Moldovan Leu" },
  { code: "TJS", symbol: "SM", label: "Tajikistani Somoni" },
  { code: "RON", symbol: "lei", label: "Romanian Leu" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "PLN", symbol: "zł", label: "Polish Złoty" },
  { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
  { code: "TRY", symbol: "₺", label: "Turkish Lira" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  EUR: 1.0,
  USD: 1.14,
  HUF: 395.0,
  MDL: 19.25,
  TJS: 12.1,
  RON: 4.97,
  GBP: 0.85,
  PLN: 4.31,
  UAH: 43.5,
  CHF: 0.96,
  SEK: 11.2,
  TRY: 35.1,
};

export function convertMoney(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to || isNaN(amount)) return amount;
  const fromRate = EXCHANGE_RATES[from] ?? 1.0;
  const toRate = EXCHANGE_RATES[to] ?? 1.0;
  const amountInEUR = amount / fromRate;
  return Number((amountInEUR * toRate).toFixed(2));
}

interface LocaleState {
  language: LanguageCode;
  currency: CurrencyCode;
  setLanguage: (l: LanguageCode) => void;
  setCurrency: (c: CurrencyCode) => void;
}

const LANG_TO_CURRENCY: Record<LanguageCode, CurrencyCode> = {
  ro: "MDL",
  hu: "HUF",
  ru: "TJS",
  tr: "TRY",
  pl: "PLN",
  uk: "UAH",
  de: "EUR",
  fr: "EUR",
  es: "EUR",
  it: "EUR",
  nl: "EUR",
  pt: "EUR",
  en: "USD",
};

const CURRENCY_TO_LANG: Record<CurrencyCode, LanguageCode> = {
  MDL: "ro",
  RON: "ro",
  HUF: "hu",
  TJS: "ru",
  TRY: "tr",
  PLN: "pl",
  UAH: "uk",
  EUR: "de",
  GBP: "en",
  USD: "en",
  CHF: "de",
  SEK: "en",
};

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      language: "en",
      currency: "USD",
      setLanguage: (language) => {
        const autoCurr = LANG_TO_CURRENCY[language];
        set({ language, currency: autoCurr || "USD" });
      },
      setCurrency: (currency) => {
        const autoLang = CURRENCY_TO_LANG[currency];
        set({ currency, language: autoLang || "en" });
      },
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
  if (
    code === "RON" ||
    code === "PLN" ||
    code === "SEK" ||
    code === "CHF" ||
    code === "HUF" ||
    code === "MDL" ||
    code === "TJS"
  ) {
    return `${value} ${sym}`;
  }
  return `${sym}${value}`;
}

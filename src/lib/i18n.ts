import { useEffect, useState } from "react";
import { useLocale } from "./locale";
import { en } from "../locales/en";
import { ro } from "../locales/ro";
import { ru } from "../locales/ru";
import { hu } from "../locales/hu";

const dictionaries = {
  en,
  ro,
  ru,
  hu,
} as const;

type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}${D}${Join<Extract<R, string[]>, D>}`
        : never
      : string;

export type TranslationKeys = Join<PathsToStringProps<typeof en>, ".">;

function getNestedTranslation(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj) as string;
}

export function useTranslation() {
  const store = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const language = mounted ? store.language : "en";
  // Default to english if the dictionary doesn't exist
  const dictionary = (dictionaries as any)[language] || en;

  const t = (key: TranslationKeys): string => {
    // Fallback to English if translation is missing in selected language
    return getNestedTranslation(dictionary, key) || getNestedTranslation(en, key) || key;
  };

  return { t, language };
}

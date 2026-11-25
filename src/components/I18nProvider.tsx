"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

type I18nValue = {
  locale: Locale;
  t: Translator;
};

const I18nContext = createContext<I18nValue | null>(null);

const fallbackValue: I18nValue = {
  locale: DEFAULT_LOCALE,
  t: createTranslator(DEFAULT_LOCALE),
};

/**
 * Carries the server-resolved locale to client components. Both dictionaries
 * live in the client bundle, so SSR and hydration use the same language and a
 * switch does not need to fetch anything.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value) {
    return value;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("useI18n was called outside an I18nProvider");
  }
  return fallbackValue;
}

export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

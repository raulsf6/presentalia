import type { Locale } from "@/lib/i18n/config";
import {
  en,
  type MessageKey,
  type MessageParams,
} from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";

export type Translator = (key: MessageKey, params?: MessageParams) => string;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, es };

function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(locale: Locale): Translator {
  const dictionary = dictionaries[locale];
  return (key, params) => interpolate(dictionary[key] ?? en[key], params);
}

/** Locale-aware date formatting. `Intl` is built in; no i18n dependency. */
export function formatDate(
  locale: Locale,
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

/**
 * The request's language. The cookie wins; otherwise the browser's
 * Accept-Language decides. Call this inside the Suspense content that already
 * reads request data so the route keeps its static shell.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }
  const headerStore = await headers();
  return negotiateLocale(headerStore.get("accept-language"));
});

export async function getTranslator(): Promise<Translator> {
  return createTranslator(await getLocale());
}

"use server";

import { cookies } from "next/headers";

import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/lib/i18n/config";

/** Persists the language preference. The client then refreshes the route. */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

import { describe, expect, test } from "vitest";

import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "@/lib/i18n/config";

describe("isLocale", () => {
  test("accepts only configured locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale("ES")).toBe(false);
  });
});

describe("negotiateLocale", () => {
  test("falls back to English without a usable header", () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("fr-FR,fr;q=0.9")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("*")).toBe(DEFAULT_LOCALE);
  });

  test("returns the first supported language by quality", () => {
    expect(negotiateLocale("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(negotiateLocale("fr-FR,fr;q=0.9,es;q=0.8,en;q=0.7")).toBe("es");
    expect(negotiateLocale("es;q=0.4,en;q=0.8")).toBe("en");
  });

  test("uses header order when qualities tie", () => {
    expect(negotiateLocale("en-US,es;q=0.9")).toBe("en");
    expect(negotiateLocale("es-ES,en;q=0.9")).toBe("es");
  });

  test("ignores zero-quality entries", () => {
    expect(negotiateLocale("es;q=0,en;q=0.5")).toBe("en");
  });
});

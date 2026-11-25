export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Long-lived, client-readable preference. Never contains sensitive data. */
export const LOCALE_COOKIE = "presentalia_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Picks the first supported language from an Accept-Language header.
 * Ties keep header order; `q=0` and `*` are ignored.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const entries = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [rawTag, ...rawParams] = part.trim().split(";");
      let quality = 1;
      for (const rawParam of rawParams) {
        const [rawKey, rawValue] = rawParam.trim().split("=");
        if (rawKey === "q") {
          const parsed = Number.parseFloat(rawValue ?? "");
          if (!Number.isNaN(parsed)) {
            quality = parsed;
          }
        }
      }
      return {
        tag: (rawTag ?? "").trim().toLowerCase(),
        quality,
        index,
      };
    })
    .filter(
      (entry) => entry.tag.length > 0 && entry.tag !== "*" && entry.quality > 0,
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    );

  for (const { tag } of entries) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) {
      return primary;
    }
  }
  return DEFAULT_LOCALE;
}

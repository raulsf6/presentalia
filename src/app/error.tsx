"use client";

import { useSyncExternalStore } from "react";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";

const subscribe = () => () => {};

function getSnapshot(): Locale {
  return isLocale(document.documentElement.lang)
    ? document.documentElement.lang
    : "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

/**
 * Error boundaries must be client components, so this follows the lang the
 * pre-paint script already set. The first server render is English; the
 * boundary then follows the page language.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const t = createTranslator(locale);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6">
      <div className="card flex flex-col items-start gap-4 p-8">
        <h1 className="font-display text-ink text-2xl">
          {t("errorPage.title")}
        </h1>
        <p className="text-muted text-sm font-semibold">
          {t("errorPage.detail")}
        </p>
        <button type="button" onClick={reset} className="btn">
          {t("errorPage.retry")}
        </button>
        {error.digest ? (
          <p className="text-muted font-mono text-xs">ref: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleAction } from "@/actions/locale";
import { useT } from "@/components/I18nProvider";
import { LOCALES, type Locale } from "@/lib/i18n/config";

const LABELS: Record<Locale, string> = {
  en: "EN",
  es: "ES",
};

const NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/** ES/EN toggle used in the app bar, login, and join pages. */
export function LocaleSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) {
      return;
    }
    startTransition(async () => {
      await setLocaleAction(next);
      document.documentElement.setAttribute("lang", next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("locale.label")}
      className={`border-ink/20 inline-flex shrink-0 items-center gap-0.5 rounded-md border-[2px] bg-white p-0.5 ${
        className ?? ""
      }`}
    >
      {LOCALES.map((option) => {
        const selected = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            title={NAMES[option]}
            aria-pressed={selected}
            disabled={pending}
            onClick={() => choose(option)}
            className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold tracking-[0.04em] transition disabled:opacity-50 ${
              selected
                ? "bg-ink text-cream"
                : "text-muted hover:text-ink focus-visible:outline-ink focus-visible:outline-2 focus-visible:outline-offset-1"
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

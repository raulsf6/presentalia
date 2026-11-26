import { Suspense } from "react";

import { BackLink } from "@/components/BackLink";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";

/** The shell stays language-neutral; the localized content streams in. */
export default function NotFound() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6"
        >
          <div className="card flex flex-col gap-3 p-8">
            <span className="bg-ink/10 h-7 w-48 animate-pulse rounded-md" />
            <span className="bg-ink/10 h-4 w-full animate-pulse rounded" />
          </div>
        </main>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}

async function NotFoundContent() {
  const locale = await getLocale();
  const t = createTranslator(locale);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6">
      <div className="card flex flex-col items-start gap-4 p-8">
        <h1 className="font-display text-ink text-2xl">
          {t("notFound.title")}
        </h1>
        <p className="text-muted text-sm font-semibold">
          {t("notFound.detail")}
        </p>
        <BackLink href="/talks" label={t("notFound.back")} />
      </div>
    </main>
  );
}

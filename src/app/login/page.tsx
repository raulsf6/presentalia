import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { MagicLinkForm } from "@/components/MagicLinkForm";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";

/** The login card is small and has no database work; render it per request. */
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <div className="card flex flex-col gap-6 p-8">
          <div className="flex items-start justify-between gap-3">
            <span className="font-display text-ink text-lg">
              Presentalia<span className="text-coral">.</span>
            </span>
            <LocaleSwitcher locale={locale} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-ink text-xl">
              {t("login.title")}
            </h1>
            <p className="text-muted text-sm font-semibold">
              {t("login.subtitle")}
            </p>
          </div>
          <Suspense fallback={null}>
            <LoginMessages searchParams={searchParams} locale={locale} />
          </Suspense>
          <MagicLinkForm />
        </div>
      </main>
    </I18nProvider>
  );
}

async function LoginMessages({
  searchParams,
  locale,
}: {
  searchParams: PageProps<"/login">["searchParams"];
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  const params = await searchParams;
  const t = createTranslator(locale);
  const linkExpired = params?.error === "auth";
  const accessDenied = params?.error === "denied";

  return (
    <>
      {linkExpired ? (
        <p role="alert" className="alert alert-err">
          {t("login.linkExpired")}
        </p>
      ) : null}
      {accessDenied ? (
        <p role="alert" className="alert alert-err">
          {t("login.accessDenied")}
        </p>
      ) : null}
    </>
  );
}

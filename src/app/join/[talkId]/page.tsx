import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { JoinTalkForm } from "@/components/JoinTalkForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator, formatDate } from "@/lib/i18n/translate";
import { loadPublicTalk } from "@/lib/talks/talk-guests-db";
import { loadTalkAccess } from "@/lib/talks/membership";
import { isTalkId } from "@/lib/talks/talk-guests";

export default function JoinPage({ params }: PageProps<"/join/[talkId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({
  params,
}: {
  params: PageProps<"/join/[talkId]">["params"];
}) {
  const { talkId } = await params;
  if (!isTalkId(talkId)) {
    notFound();
  }

  // Existing guests, staff, and rostered members go straight to the talk.
  const access = await loadTalkAccess(talkId);
  if (access) {
    redirect(`/talks/${talkId}`);
  }

  const talk = await loadPublicTalk(talkId);
  if (!talk) {
    notFound();
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-12">
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="font-display text-ink text-lg">
              Presentalia<span className="text-coral">.</span>
            </span>
            <LocaleSwitcher locale={locale} />
          </div>
          <h1 className="font-display text-ink mt-4 text-2xl">{talk.name}</h1>
          {talk.heldAt ? (
            <p className="text-muted mt-1 text-sm font-semibold">
              {formatDate(locale, talk.heldAt, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
          {talk.description ? (
            <p className="text-ink/75 mt-3 text-sm font-semibold">
              {talk.description}
            </p>
          ) : null}
        </div>

        <section className="card p-6">
          {talk.anonymousJoinOpen ? (
            <JoinTalkForm talkId={talkId} />
          ) : (
            <div className="flex flex-col gap-2">
              <h2 className="text-ink font-bold">{t("join.closedTitle")}</h2>
              <p className="text-ink/75 text-sm font-semibold">
                {t("join.closedDetail")}
              </p>
            </div>
          )}
        </section>
      </main>
    </I18nProvider>
  );
}

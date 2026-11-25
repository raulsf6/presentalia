import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeckPlanEditor } from "@/components/DeckPlanEditor";
import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SlidesActions } from "@/components/SlidesActions";
import { loadDeckPlan } from "@/lib/deck/deck-plan";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator, formatDate } from "@/lib/i18n/translate";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";

export default function SlidesPage({
  params,
}: PageProps<"/talks/[talkId]/slides">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SlidesContent params={params} />
    </Suspense>
  );
}

async function SlidesContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/slides">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  const plan = access.talk.slidesUpdatedAt ? await loadDeckPlan(talkId) : null;
  const locale = await getLocale();
  const t = createTranslator(locale);

  const uploadedLabel = access.talk.slidesUpdatedAt
    ? formatDate(locale, access.talk.slidesUpdatedAt, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-ink text-2xl">
              {t("slides.title")}
            </h1>
            <p className="text-muted mt-1 text-sm font-semibold">
              {t("slides.subtitle", { name: access.talk.name })}
            </p>
            <p className="text-muted mt-2 text-xs font-semibold">
              {uploadedLabel
                ? t("slides.currentPdf", { date: uploadedLabel })
                : t("slides.noPdf")}
            </p>
          </div>
          <SlidesActions talkId={talkId} uploadedLabel={uploadedLabel} />
        </div>

        {plan && access.talk.slidesUpdatedAt ? (
          <div className="card p-6">
            <div className="mb-5">
              <p className="section-label">{t("slides.deckPlan")}</p>
              <p className="text-muted mt-2 text-sm font-semibold">
                {t("slides.deckPlanHint")}
              </p>
            </div>
            <DeckPlanEditor
              key={access.talk.slidesUpdatedAt.toISOString()}
              talkId={talkId}
              slidesUpdatedAt={access.talk.slidesUpdatedAt.toISOString()}
              initial={plan}
            />
          </div>
        ) : (
          <div className="card mx-auto max-w-2xl p-6">
            <p className="text-muted text-sm font-semibold">
              {t("slides.uploadHint")}
            </p>
          </div>
        )}
      </main>
    </I18nProvider>
  );
}

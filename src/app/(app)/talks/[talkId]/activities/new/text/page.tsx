import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { TextForm } from "@/components/TextForm";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";

export default function NewTextActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/text">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewTextActivityContent params={params} />
    </Suspense>
  );
}

async function NewTextActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/text">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-lg px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-display text-ink text-2xl">
            {t("activities.newText")}
          </h1>
          <Link
            href={`/talks/${talkId}/activities/new`}
            className="linky shrink-0"
          >
            {t("activities.back")}
          </Link>
        </div>
        <div className="card p-6">
          <TextForm talkId={talkId} />
        </div>
      </main>
    </I18nProvider>
  );
}

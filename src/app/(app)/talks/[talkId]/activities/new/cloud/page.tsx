import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/BackLink";
import { CloudForm } from "@/components/CloudForm";
import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";

export default function NewCloudActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/cloud">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewCloudActivityContent params={params} />
    </Suspense>
  );
}

async function NewCloudActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/cloud">["params"];
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
            {t("activities.newCloud")}
          </h1>
          <BackLink
            href={`/talks/${talkId}/activities/new`}
            label={t("activities.back")}
          />
        </div>
        <div className="card p-6">
          <CloudForm talkId={talkId} />
        </div>
      </main>
    </I18nProvider>
  );
}

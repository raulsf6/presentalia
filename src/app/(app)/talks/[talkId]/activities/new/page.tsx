import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ChartIcon, CloudIcon, QuizIcon, TextIcon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n/dictionaries/en";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";

const TYPES: ReadonlyArray<{
  href: "poll" | "quiz" | "text" | "cloud";
  label: MessageKey;
  detail: MessageKey;
  icon: typeof ChartIcon;
  box: string;
}> = [
  {
    href: "poll",
    label: "activity.type.poll",
    detail: "activities.detail.poll",
    icon: ChartIcon,
    box: "bg-coral text-ink",
  },
  {
    href: "quiz",
    label: "activity.type.quiz",
    detail: "activities.detail.quiz",
    icon: QuizIcon,
    box: "bg-green text-white",
  },
  {
    href: "text",
    label: "activity.type.text",
    detail: "activities.detail.text",
    icon: TextIcon,
    box: "bg-amber text-ink",
  },
  {
    href: "cloud",
    label: "activity.type.cloud",
    detail: "activities.detail.cloud",
    icon: CloudIcon,
    box: "bg-tan text-ink",
  },
];

export default function NewActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewActivityContent params={params} />
    </Suspense>
  );
}

async function NewActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new">["params"];
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
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-ink text-2xl">
            {t("activities.new")}
          </h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {t("activities.chooseSubtitle", { name: access.talk.name })}
          </p>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="section-label">{t("activities.types")}</h2>
          {TYPES.map(({ href, label, detail, icon: Icon, box }) => (
            <Link
              key={href}
              href={`/talks/${talkId}/activities/new/${href}`}
              className="card card-hover flex items-center gap-4 p-4"
            >
              <span
                className={`border-ink shadow-hard-sm flex size-11 shrink-0 items-center justify-center rounded-lg border-[2.5px] ${box}`}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ink font-bold">{t(label)}</span>
                <span className="text-muted text-xs font-semibold">
                  {t(detail)}
                </span>
              </span>
              <span className="text-muted ml-auto shrink-0 text-sm font-bold">
                {t("activities.create")}
              </span>
            </Link>
          ))}
        </section>
      </main>
    </I18nProvider>
  );
}

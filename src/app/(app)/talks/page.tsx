import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { UserIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth/auth";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator, formatDate } from "@/lib/i18n/translate";
import { loadTalkList } from "@/lib/talks/membership";

export default function TalksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TalksContent />
    </Suspense>
  );
}

async function TalksContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rows = await loadTalkList(user.id, user.role);
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-ink text-2xl">
              {user.role === "admin"
                ? t("talks.title.all")
                : t("talks.title.yours")}
            </h1>
            <p className="text-muted mt-1 text-sm font-semibold">
              {user.role === "admin"
                ? t("talks.subtitle.admin")
                : user.role === "presenter"
                  ? t("talks.subtitle.presenter")
                  : t("talks.subtitle.attendee")}
            </p>
          </div>
          {user.role !== "attendee" ? (
            <Link href="/talks/new" className="btn btn-small shrink-0">
              {t("talks.new")}
            </Link>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="empty">
            {user.role === "admin"
              ? t("talks.empty.admin")
              : user.role === "presenter"
                ? t("talks.empty.presenter")
                : t("talks.empty.attendee")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((talk) => {
              const ownerEmail = talk.ownerEmail;
              return (
                <li key={talk.id}>
                  <Link
                    href={`/talks/${talk.id}`}
                    prefetch={true}
                    className="card card-hover flex flex-col gap-1 p-4"
                  >
                    <span className="text-ink font-bold">{talk.name}</span>
                    {talk.heldAt ? (
                      <span className="text-muted text-xs font-bold">
                        {formatDate(locale, talk.heldAt, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    ) : null}
                    {talk.description ? (
                      <span className="text-ink/75 text-sm font-semibold">
                        {talk.description}
                      </span>
                    ) : null}
                    {user.role === "admin" && talk.createdBy ? (
                      <span className="text-muted flex items-center gap-1.5 text-xs font-bold">
                        <UserIcon className="size-3.5 shrink-0" />
                        <span className="sr-only">{t("talks.owner")}</span>
                        <span className="truncate font-mono">
                          {ownerEmail ?? t("common.noEmail")}
                        </span>
                      </span>
                    ) : null}
                    <span className="mt-1 flex gap-2 text-xs">
                      {talk.slidesUpdatedAt ? (
                        <span className="chip chip-slide">
                          {t("talks.slidesAvailable")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </I18nProvider>
  );
}

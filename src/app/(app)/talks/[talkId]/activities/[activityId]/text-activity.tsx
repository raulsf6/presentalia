import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { I18nProvider } from "@/components/I18nProvider";
import { TextAnswerForm } from "@/components/TextAnswerForm";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  hasTextAnswer,
  loadTextWorkspace,
  type ActivityDetail,
} from "@/lib/activities/activity-workspace";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isAttendee, type TalkAccess } from "@/lib/talks/membership";

/**
 * Text-type activity: the editable workspace for managers and the answer form
 * for attendees. Everything after launch lives on the results page, which also
 * carries the rank/publish controls for managers.
 */
export async function TextActivity({
  activity,
  access,
}: {
  activity: ActivityDetail;
  access: TalkAccess;
}) {
  const talkId = activity.talkId;
  const activityId = activity.id;
  const status = activity.status as ActivityStatus;
  const resultsHref = `/talks/${talkId}/activities/${activityId}/results`;

  const config = await loadTextWorkspace(access, activityId);
  if (!config) {
    notFound();
  }

  if (!isAttendee(access) && status !== "ready") {
    redirect(resultsHref);
  }
  if (isAttendee(access) && (status === "locked" || status === "closed")) {
    redirect(resultsHref);
  }
  if (isAttendee(access) && status === "active") {
    if (await hasTextAnswer(access, activityId)) {
      redirect(resultsHref);
    }
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          {isAttendee(access) ? (
            <Link href={`/talks/${talkId}`} className="linky">
              ← {access.talk.name}
            </Link>
          ) : null}
          <div className="ml-auto">
            {status === "active" ? (
              <span className="chip chip-live">
                <span className="pulse-dot" />
                {t("status.live")}
              </span>
            ) : null}
          </div>
        </div>

        <h1 className="font-display text-ink mb-4 text-2xl">{config.prompt}</h1>
        <p className="text-muted mb-8 text-sm font-semibold">
          {t("activity.rankedFor", { criteria: config.criteria })}
        </p>

        {!isAttendee(access) ? (
          <section className="card flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <h2 className="section-label">{t("activity.howItWorks")}</h2>
              <p className="text-ink/75 text-sm font-semibold">
                {t("activity.textHow")}
              </p>
              <p className="text-ink/75 text-sm font-semibold">
                {config.resultsIdentifiable
                  ? t("activity.textResultsIdentifiable")
                  : t("activity.textResultsAnonymous")}
              </p>
              <p className="text-ink/75 text-sm font-semibold">
                {t("activity.textNoIdentity")}
              </p>
            </div>
            <ActivityAdminControls
              activityId={activityId}
              kind="text"
              status="ready"
            />
          </section>
        ) : status === "ready" ? (
          <p className="empty">{t("activity.notOpen.text")}</p>
        ) : (
          <section className="card p-6">
            <TextAnswerForm
              activityId={activityId}
              criteria={config.criteria}
            />
          </section>
        )}
      </main>
    </I18nProvider>
  );
}

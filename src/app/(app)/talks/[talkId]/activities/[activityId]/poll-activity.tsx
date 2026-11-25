import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { I18nProvider } from "@/components/I18nProvider";
import { VoteForm } from "@/components/VoteForm";
import {
  hasPollVote,
  loadPollWorkspace,
  type ActivityDetail,
} from "@/lib/activities/activity-workspace";
import type { ActivityStatus } from "@/lib/activities/polls";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isAttendee, type TalkAccess } from "@/lib/talks/membership";

/**
 * Poll-type activity: the editable workspace for managers, the vote page for
 * attendees. Once launched or closed there is nothing to manage here —
 * results is the destination, and it carries the close control.
 */
export async function PollActivity({
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

  const poll = await loadPollWorkspace(access, activityId);
  if (!poll) {
    notFound();
  }

  if (!isAttendee(access) && status !== "ready") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "closed") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "active") {
    if (await hasPollVote(access, activityId)) {
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

        <h1 className="font-display text-ink mb-8 text-2xl">{poll.question}</h1>

        {!isAttendee(access) ? (
          <section className="card flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-3">
              <h2 className="section-label">{t("activity.answerOptions")}</h2>
              <ol className="text-ink list-inside list-decimal space-y-2 text-sm font-semibold">
                {poll.options.map((option) => (
                  <li key={option.id}>{option.label}</li>
                ))}
              </ol>
              <p className="text-ink/75 text-sm font-semibold">
                {poll.resultsIdentifiable
                  ? t("activity.resultsIdentifiable")
                  : t("activity.resultsAnonymous")}
              </p>
            </div>
            <ActivityAdminControls
              activityId={activityId}
              kind="poll"
              status="ready"
            />
          </section>
        ) : status === "ready" ? (
          <p className="empty">{t("activity.notOpen.poll")}</p>
        ) : (
          <section className="card p-6">
            <VoteForm activityId={activityId} options={poll.options} />
          </section>
        )}
      </main>
    </I18nProvider>
  );
}

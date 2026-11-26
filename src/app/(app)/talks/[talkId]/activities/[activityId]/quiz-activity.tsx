import { notFound, redirect } from "next/navigation";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { BackLink } from "@/components/BackLink";
import { I18nProvider } from "@/components/I18nProvider";
import { VoteForm } from "@/components/VoteForm";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  hasQuizVote,
  loadQuizWorkspace,
  type ActivityDetail,
} from "@/lib/activities/activity-workspace";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { isAttendee, type TalkAccess } from "@/lib/talks/membership";

/**
 * Quiz-type activity: the editable workspace for managers and the vote page for
 * attendees. Everything after launch lives on the results page, which also
 * carries the close control.
 */
export async function QuizActivity({
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

  const quiz = await loadQuizWorkspace(access, activityId);
  if (!quiz) {
    notFound();
  }
  // Never pass correctness through to the client vote form: it is part of
  // the attendee payload and would reveal the answer.
  const voteOptions = quiz.options.map(({ id, label }) => ({ id, label }));

  if (!isAttendee(access) && status !== "ready") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "closed") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "active") {
    if (await hasQuizVote(access, activityId)) {
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
            <BackLink
              href={`/talks/${talkId}`}
              label={t("remote.backToTalk")}
            />
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

        <h1 className="font-display text-ink mb-8 text-2xl">{quiz.question}</h1>

        {!isAttendee(access) ? (
          <section className="card flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-3">
              <h2 className="section-label">{t("activity.answerOptions")}</h2>
              <ol className="text-ink list-inside list-decimal space-y-2 text-sm font-semibold">
                {quiz.options.map((option) => (
                  <li key={option.id}>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {option.label}
                      {option.isCorrect ? (
                        <span className="chip chip-slide text-[0.65rem]">
                          {t("activity.correctAnswer")}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-ink/75 text-sm font-semibold">
                {quiz.resultsIdentifiable
                  ? t("activity.resultsIdentifiable")
                  : t("activity.resultsAnonymous")}
              </p>
              <p className="text-ink/75 text-sm font-semibold">
                {t("activity.correctHidden")}
              </p>
            </div>
            <ActivityAdminControls
              activityId={activityId}
              kind="quiz"
              status="ready"
            />
          </section>
        ) : status === "ready" ? (
          <p className="empty">{t("activity.notOpen.quiz")}</p>
        ) : (
          <section className="card p-6">
            <VoteForm
              activityId={activityId}
              kind="quiz"
              options={voteOptions}
            />
          </section>
        )}
      </main>
    </I18nProvider>
  );
}

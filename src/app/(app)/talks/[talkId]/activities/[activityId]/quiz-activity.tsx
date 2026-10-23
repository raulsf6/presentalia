import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { VoteForm } from "@/components/VoteForm";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  hasQuizVote,
  loadQuizWorkspace,
  type ActivityDetail,
} from "@/lib/activities/activity-workspace";
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

  return (
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
              LIVE
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="font-display text-ink mb-8 text-2xl">{quiz.question}</h1>

      {!isAttendee(access) ? (
        <section className="card flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-3">
            <h2 className="section-label">Answer options</h2>
            <ol className="text-ink list-inside list-decimal space-y-2 text-sm font-semibold">
              {quiz.options.map((option) => (
                <li key={option.id}>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {option.label}
                    {option.isCorrect ? (
                      <span className="chip chip-slide text-[0.65rem]">
                        ✓ Correct answer
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-ink/75 text-sm font-semibold">
              Results are{" "}
              {quiz.resultsIdentifiable
                ? "identifiable — voter names will be shown to all results viewers."
                : "anonymous — voter identities will not appear in results."}
            </p>
            <p className="text-ink/75 text-sm font-semibold">
              The correct answer is hidden from everyone until you close the
              quiz.
            </p>
          </div>
          <ActivityAdminControls
            activityId={activityId}
            kind="quiz"
            status="ready"
          />
        </section>
      ) : status === "ready" ? (
        <p className="empty">
          The quiz hasn&apos;t opened yet. Check back when the speaker launches
          it.
        </p>
      ) : (
        <section className="card p-6">
          <VoteForm activityId={activityId} kind="quiz" options={voteOptions} />
        </section>
      )}
    </main>
  );
}

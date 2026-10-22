import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { quizOptions, quizVotes, quizzes, type ActivityRow } from "@/db/schema";
import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { VoteForm } from "@/components/VoteForm";
import type { ActivityStatus } from "@/lib/activities";
import { attendeeVoteKey, isAttendee, type TalkAccess } from "@/lib/membership";

/**
 * Quiz-type activity: the editable workspace for managers, the vote page for
 * attendees. Once launched or closed, results is the destination and carries
 * the close control.
 */
export async function QuizActivity({
  activity,
  access,
}: {
  activity: ActivityRow;
  access: TalkAccess;
}) {
  const db = getDb();
  const talkId = activity.talkId;
  const activityId = activity.id;
  const status = activity.status as ActivityStatus;
  const resultsHref = `/talks/${talkId}/activities/${activityId}/results`;

  const quizRows = await db
    .select({
      question: quizzes.question,
      resultsIdentifiable: quizzes.resultsIdentifiable,
      optionId: quizOptions.id,
      optionLabel: quizOptions.label,
      isCorrect: quizOptions.isCorrect,
    })
    .from(quizzes)
    .leftJoin(quizOptions, eq(quizOptions.quizId, quizzes.activityId))
    .where(eq(quizzes.activityId, activityId))
    .orderBy(asc(quizOptions.position));
  const quiz = quizRows[0];
  if (!quiz) {
    notFound();
  }
  const options = quizRows.flatMap((row) =>
    row.optionId && row.optionLabel
      ? [
          {
            id: row.optionId,
            label: row.optionLabel,
            isCorrect: row.isCorrect ?? false,
          },
        ]
      : [],
  );
  // Never pass correctness through to the client vote form: it is part of
  // the attendee payload and would reveal the answer.
  const voteOptions = options.map(({ id, label }) => ({ id, label }));

  if (!isAttendee(access) && status !== "ready") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "closed") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "active") {
    const key = attendeeVoteKey(access);
    const ownVotes = await db
      .select({ optionId: quizVotes.optionId })
      .from(quizVotes)
      .where(
        and(
          eq(quizVotes.quizId, activityId),
          "userId" in key
            ? eq(quizVotes.userId, key.userId)
            : eq(quizVotes.guestId, key.guestId),
        ),
      )
      .limit(1);
    if (ownVotes.length > 0) {
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
              {options.map((option) => (
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

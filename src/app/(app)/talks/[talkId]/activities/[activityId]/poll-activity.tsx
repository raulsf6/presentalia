import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { pollOptions, pollVotes, polls, type ActivityRow } from "@/db/schema";
import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { VoteForm } from "@/components/VoteForm";
import { attendeeVoteKey, isAttendee, type TalkAccess } from "@/lib/membership";
import type { ActivityStatus } from "@/lib/polls";

/**
 * Poll-type activity: the draft workspace for managers, the vote page for
 * attendees. Once launched or closed there is nothing to manage here —
 * results is the destination, and it carries the close control.
 */
export async function PollActivity({
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

  const pollRows = await db
    .select({
      question: polls.question,
      resultsIdentifiable: polls.resultsIdentifiable,
      optionId: pollOptions.id,
      optionLabel: pollOptions.label,
    })
    .from(polls)
    .leftJoin(pollOptions, eq(pollOptions.pollId, polls.activityId))
    .where(eq(polls.activityId, activityId))
    .orderBy(asc(pollOptions.position));
  const poll = pollRows[0];
  if (!poll) {
    notFound();
  }
  const options = pollRows.flatMap((row) =>
    row.optionId && row.optionLabel
      ? [{ id: row.optionId, label: row.optionLabel }]
      : [],
  );

  if (!isAttendee(access) && status !== "draft") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "closed") {
    redirect(resultsHref);
  }

  if (isAttendee(access) && status === "active") {
    const key = attendeeVoteKey(access);
    const ownVotes = await db
      .select({ optionId: pollVotes.optionId })
      .from(pollVotes)
      .where(
        and(
          eq(pollVotes.pollId, activityId),
          "userId" in key
            ? eq(pollVotes.userId, key.userId)
            : eq(pollVotes.guestId, key.guestId),
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
          ) : (
            <span className="chip chip-draft">Draft</span>
          )}
        </div>
      </div>

      <h1 className="font-display text-ink mb-8 text-2xl">{poll.question}</h1>

      {!isAttendee(access) ? (
        <section className="card flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-3">
            <h2 className="section-label">Answer options</h2>
            <ol className="text-ink list-inside list-decimal space-y-2 text-sm font-semibold">
              {options.map((option) => (
                <li key={option.id}>{option.label}</li>
              ))}
            </ol>
            <p className="text-ink/75 text-sm font-semibold">
              Results are{" "}
              {poll.resultsIdentifiable
                ? "identifiable — voter names will be shown to all results viewers."
                : "anonymous — voter identities will not appear in results."}
            </p>
          </div>
          <ActivityAdminControls
            activityId={activityId}
            kind="poll"
            status="draft"
          />
        </section>
      ) : status === "draft" ? (
        <p className="empty">
          The poll hasn&apos;t opened yet. Check back when the speaker launches
          it.
        </p>
      ) : (
        <section className="card p-6">
          <VoteForm activityId={activityId} options={options} />
        </section>
      )}
    </main>
  );
}

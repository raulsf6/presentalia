import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities, pollOptions, pollVotes, polls } from "@/db/schema";
import { PollAdminControls } from "@/components/PollAdminControls";
import { VoteForm } from "@/components/VoteForm";
import type { ActivityStatus } from "@/lib/polls";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function PollPage({
  params,
}: PageProps<"/talks/[talkId]/polls/[pollId]">) {
  const { talkId, pollId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  const db = getDb();
  const rows = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      status: activities.status,
      question: polls.question,
      resultsIdentifiable: polls.resultsIdentifiable,
    })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.id, pollId))
    .limit(1);
  const options = await db
    .select({ id: pollOptions.id, label: pollOptions.label })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(asc(pollOptions.position));
  const data = { poll: rows[0] ?? null, options };
  const poll = data.poll;
  if (!poll || poll.talkId !== talkId) {
    notFound();
  }

  const status = poll.status as ActivityStatus;
  const resultsHref = `/talks/${talkId}/polls/${pollId}/results`;

  if (access.access === "member" && status === "closed") {
    redirect(resultsHref);
  }

  let alreadyVoted = false;
  if (access.access === "member" && status === "active") {
    const ownVotes = await db
      .select({ optionId: pollVotes.optionId })
      .from(pollVotes)
      .where(
        and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, access.user.id)),
      )
      .limit(1);
    alreadyVoted = ownVotes.length > 0;
    if (alreadyVoted) {
      redirect(resultsHref);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        {access.access === "member" ? (
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
          ) : status === "closed" ? (
            <span className="chip chip-closed uppercase">Closed</span>
          ) : (
            <span className="chip chip-draft">Draft</span>
          )}
        </div>
      </div>

      <h1 className="font-display text-ink mb-8 text-2xl font-extrabold">
        {poll.question}
      </h1>

      {access.access !== "member" ? (
        <section className="card flex flex-col gap-6 p-6">
          {status === "draft" ? (
            <>
              <div className="flex flex-col gap-3">
                <h2 className="section-label">Answer options</h2>
                <ol className="text-ink list-inside list-decimal space-y-2 text-sm font-semibold">
                  {data.options.map((option) => (
                    <li key={option.id}>{option.label}</li>
                  ))}
                </ol>
                <p className="text-ink/75 text-sm font-semibold">
                  Results are{" "}
                  {poll.resultsIdentifiable
                    ? "identifiable — voter email addresses will be shown to all results viewers."
                    : "anonymous — voter identities will not appear in results."}
                </p>
              </div>
              <PollAdminControls pollId={pollId} status="draft" />
            </>
          ) : (
            <>
              <p className="text-ink/75 text-sm font-semibold">
                {status === "active"
                  ? "Voting is open. The question, options, and results identity setting are locked."
                  : "This poll is closed and read-only."}
              </p>
              <Link href={resultsHref} className="btn btn-ghost w-fit">
                View live results →
              </Link>
              {status === "active" ? (
                <PollAdminControls pollId={pollId} status="active" />
              ) : null}
            </>
          )}
        </section>
      ) : status === "draft" ? (
        <p className="empty">
          The poll hasn&apos;t opened yet. Check back when the speaker launches
          it.
        </p>
      ) : status === "active" && !alreadyVoted ? (
        <section className="card p-6">
          <VoteForm pollId={pollId} options={data.options} />
        </section>
      ) : null}
    </main>
  );
}

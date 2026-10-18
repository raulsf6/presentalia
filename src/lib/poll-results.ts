import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activities,
  pollOptions,
  pollVoteCounts,
  pollVotes,
  polls,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { getTalkAccessForUser } from "@/lib/membership";
import {
  computeResults,
  type ActivityStatus,
  type PollResultsPayload,
} from "@/lib/polls";

type PollSource = {
  id: string;
  talkId: string;
  question: string;
  status: string;
  resultsIdentifiable: boolean;
  closedAt: Date | null;
};

export type PollResultsSource = {
  poll: PollSource | null;
  options: { id: string; label: string }[];
  counts: { optionId: string; votes: number }[];
  votes?: { optionId: string; email: string }[];
};

/**
 * Converts query results into the public results shape. Anonymous mode
 * always drops voter identities, even if a caller accidentally supplies
 * vote rows — a second guard against email leakage.
 */
export function buildPollResultsPayload(
  source: PollResultsSource,
): PollResultsPayload | null {
  if (!source.poll) {
    return null;
  }
  const counts = Object.fromEntries(
    source.counts.map((row) => [row.optionId, row.votes]),
  );
  const { rows, total } = computeResults(source.options, counts);
  return {
    poll: {
      id: source.poll.id,
      talkId: source.poll.talkId,
      question: source.poll.question,
      status: source.poll.status as ActivityStatus,
      resultsIdentifiable: source.poll.resultsIdentifiable,
      closedAt: source.poll.closedAt?.toISOString() ?? null,
    },
    rows,
    total,
    voters: source.poll.resultsIdentifiable ? (source.votes ?? []) : null,
  };
}

/** Loads results through the owner connection after checking app-layer talk access. */
export async function loadPollResults(
  pollId: string,
  viewer: SessionUser,
): Promise<PollResultsPayload | null> {
  const db = getDb();
  const pollRows = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      question: polls.question,
      status: activities.status,
      resultsIdentifiable: polls.resultsIdentifiable,
      closedAt: activities.closedAt,
    })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.id, pollId))
    .limit(1);
  const poll = pollRows[0] ?? null;
  if (!poll || !(await getTalkAccessForUser(viewer, poll.talkId))) {
    return null;
  }

  const options = await db
    .select({ id: pollOptions.id, label: pollOptions.label })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(asc(pollOptions.position));
  const countRows = await db
    .select({
      optionId: pollVoteCounts.optionId,
      votes: pollVoteCounts.votes,
    })
    .from(pollVoteCounts)
    .where(eq(pollVoteCounts.pollId, pollId));

  // Never query the votes table in anonymous mode: it contains email
  // identities even though the result display omits them.
  const voteRows = poll.resultsIdentifiable
    ? await db
        .select({ optionId: pollVotes.optionId, email: pollVotes.voterEmail })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId))
    : undefined;

  return buildPollResultsPayload({
    poll,
    options,
    counts: countRows,
    votes: voteRows,
  });
}

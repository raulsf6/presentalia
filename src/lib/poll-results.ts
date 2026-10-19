import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  pollOptions,
  pollVoteCounts,
  pollVotes,
  polls,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { getTalkAccessForUser, type TalkAccess } from "@/lib/membership";
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

const POLL_RESULTS_CACHE_TTL_MS = 2_000;
const POLL_RESULTS_CACHE_LIMIT = 200;

type CachedPollResults = {
  talkId: string;
  payload: PollResultsPayload;
  expiresAt: number;
};

declare global {
  var __presentaliaPollResults: Map<string, CachedPollResults> | undefined;
}

/**
 * Live results are polled by every viewer every five seconds. A very short
 * in-instance cache absorbs concurrent reads without showing results that are
 * more than two seconds old. Authorization is still checked before a cached
 * payload is returned.
 */
function pollResultsCache(): Map<string, CachedPollResults> {
  if (!globalThis.__presentaliaPollResults) {
    globalThis.__presentaliaPollResults = new Map();
  }
  return globalThis.__presentaliaPollResults;
}

function readCachedPollResults(pollId: string): CachedPollResults | null {
  const cache = pollResultsCache();
  const entry = cache.get(pollId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(pollId);
    return null;
  }
  return entry;
}

function writeCachedPollResults(
  pollId: string,
  talkId: string,
  payload: PollResultsPayload,
): void {
  const cache = pollResultsCache();
  cache.set(pollId, {
    talkId,
    payload,
    expiresAt: Date.now() + POLL_RESULTS_CACHE_TTL_MS,
  });
  if (cache.size > POLL_RESULTS_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

/** Test seam: drops every cached result so the next read reaches Postgres. */
export function clearPollResultsCache(): void {
  pollResultsCache().clear();
}

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

export type LoadPollResultsOptions = {
  db?: Db;
  /** Pass the request's already-loaded talk access to avoid re-checking it. */
  access?: TalkAccess;
};

/** Loads results through the owner connection after checking app-layer talk access. */
export async function loadPollResults(
  pollId: string,
  viewer: SessionUser,
  { db = getDb(), access: providedAccess }: LoadPollResultsOptions = {},
): Promise<PollResultsPayload | null> {
  const cached = readCachedPollResults(pollId);
  if (cached) {
    const access =
      providedAccess?.talk.id === cached.talkId
        ? providedAccess
        : await getTalkAccessForUser(viewer, cached.talkId, db);
    return access ? cached.payload : null;
  }

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
  if (!poll) {
    return null;
  }

  // Access and the option/count rows are independent; fetch them together.
  const accessPromise =
    providedAccess?.talk.id === poll.talkId
      ? Promise.resolve(providedAccess)
      : getTalkAccessForUser(viewer, poll.talkId, db);
  const optionRowsPromise = db
    .select({
      id: pollOptions.id,
      label: pollOptions.label,
      votes: pollVoteCounts.votes,
    })
    .from(pollOptions)
    .leftJoin(
      pollVoteCounts,
      and(
        eq(pollVoteCounts.pollId, pollOptions.pollId),
        eq(pollVoteCounts.optionId, pollOptions.id),
      ),
    )
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(asc(pollOptions.position));

  const [access, optionRows] = await Promise.all([
    accessPromise,
    optionRowsPromise,
  ]);
  if (!access) {
    return null;
  }

  const options = optionRows.map(({ id, label }) => ({ id, label }));
  const counts = optionRows.flatMap((row) =>
    row.votes === null ? [] : [{ optionId: row.id, votes: row.votes }],
  );

  // Never query the votes table in anonymous mode: it contains email
  // identities even though the result display omits them.
  const voteRows = poll.resultsIdentifiable
    ? await db
        .select({ optionId: pollVotes.optionId, email: pollVotes.voterEmail })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId))
    : undefined;

  const payload = buildPollResultsPayload({
    poll,
    options,
    counts,
    votes: voteRows,
  });
  if (payload && payload.poll.status !== "draft") {
    writeCachedPollResults(pollId, poll.talkId, payload);
  }
  return payload;
}

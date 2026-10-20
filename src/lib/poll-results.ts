import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  appUsers,
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

type CachedPollData = {
  data: Pick<PollResultsSource, "options" | "counts" | "votes">;
  expiresAt: number;
};

declare global {
  var __presentaliaPollResults: Map<string, CachedPollData> | undefined;
}

/**
 * Live results are polled by every viewer every five seconds. A very short
 * in-instance cache absorbs concurrent reads of the option/count/vote data.
 * The poll row itself is always read fresh so launching or closing a poll is
 * reflected immediately; only vote totals may trail by up to two seconds.
 */
function pollResultsCache(): Map<string, CachedPollData> {
  if (!globalThis.__presentaliaPollResults) {
    globalThis.__presentaliaPollResults = new Map();
  }
  return globalThis.__presentaliaPollResults;
}

function readCachedPollData(pollId: string): CachedPollData | null {
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

function writeCachedPollData(
  pollId: string,
  data: Pick<PollResultsSource, "options" | "counts" | "votes">,
): void {
  const cache = pollResultsCache();
  cache.set(pollId, {
    data,
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
  // Always read the poll itself. Status changes (launch/close) must be
  // immediate even if the option/count data is still cached.
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

  const accessPromise =
    providedAccess?.talk.id === poll.talkId
      ? Promise.resolve(providedAccess)
      : getTalkAccessForUser(viewer, poll.talkId, db);

  const cached = readCachedPollData(pollId);
  if (cached) {
    const access = await accessPromise;
    return access ? buildPollResultsPayload({ poll, ...cached.data }) : null;
  }

  // Access and the option/count rows are independent; fetch them together.
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

  // Never load voter identities in anonymous mode; the result display would
  // omit them anyway. Emails come from the app-owned user mirror.
  const votes = poll.resultsIdentifiable
    ? (
        await db
          .select({ optionId: pollVotes.optionId, email: appUsers.email })
          .from(pollVotes)
          .innerJoin(appUsers, eq(appUsers.id, pollVotes.userId))
          .where(eq(pollVotes.pollId, pollId))
      ).flatMap((row) =>
        row.email === null
          ? []
          : [{ optionId: row.optionId, email: row.email }],
      )
    : undefined;

  const data = { options, counts, votes };
  writeCachedPollData(pollId, data);
  return buildPollResultsPayload({ poll, ...data });
}

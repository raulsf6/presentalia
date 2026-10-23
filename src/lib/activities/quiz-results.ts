import { and, asc, eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  appUsers,
  quizOptions,
  quizVoteCounts,
  quizVotes,
  quizzes,
  talkGuests,
} from "@/db/schema";
import {
  computeResults,
  type ActivityStatus,
  type ChoiceResultsRow,
} from "@/lib/activities/activities";
import { attendeeVoteKey, isAttendee, type TalkAccess } from "@/lib/talks/membership";

export type QuizResultsRow = ChoiceResultsRow;

export type QuizResultsPayload = {
  quiz: {
    id: string;
    talkId: string;
    question: string;
    status: ActivityStatus;
    resultsIdentifiable: boolean;
    closedAt: string | null;
    correctOptionId: string | null;
    correctVotes: number | null;
  };
  needsVote: boolean;
  showResults: boolean;
  /** Labels only; safe to show while the live tally and answer stay hidden. */
  options: { optionId: string; label: string }[];
  rows: QuizResultsRow[];
  total: number | null;
  voters: { optionId: string; name: string }[] | null;
  viewer: { optionId: string; correct: boolean } | null;
};

export type QuizViewer = {
  /** True for rostered attendees and guests; managers never see live results. */
  isAttendee: boolean;
  hasVoted: boolean;
  optionId: string | null;
};

type QuizSource = {
  id: string;
  talkId: string;
  question: string;
  status: string;
  resultsIdentifiable: boolean;
  closedAt: Date | null;
};

export type QuizResultsSource = {
  quiz: QuizSource | null;
  options: { id: string; label: string; isCorrect: boolean }[];
  counts: { optionId: string; votes: number }[];
  votes?: { optionId: string; name: string }[];
  viewer: QuizViewer;
  projector: boolean;
};

export type QuizResultsVisibility = {
  needsVote: boolean;
  showResults: boolean;
};

/**
 * Active quizzes leak nothing to the room: members must vote first, and
 * managers/projectors wait for the close. Closed quizzes are readable by
 * anyone with talk access.
 */
export function getQuizResultsVisibility(input: {
  status: ActivityStatus;
  viewer: QuizViewer;
  projector: boolean;
}): QuizResultsVisibility {
  if (input.status === "closed") {
    return { needsVote: false, showResults: true };
  }
  if (input.status === "ready") {
    return { needsVote: false, showResults: false };
  }
  const needsVote = input.viewer.isAttendee && !input.viewer.hasVoted;
  const showResults =
    input.viewer.isAttendee && input.viewer.hasVoted && !input.projector;
  return { needsVote, showResults };
}

/**
 * Converts query results into the public quiz results shape. Correctness
 * fields are gated on `closed`, so an active payload cannot identify the
 * answer even if the caller supplies the option's `isCorrect` flag.
 */
export function buildQuizResultsPayload(
  source: QuizResultsSource,
): QuizResultsPayload | null {
  if (!source.quiz) {
    return null;
  }
  const status = source.quiz.status as ActivityStatus;
  const visibility = getQuizResultsVisibility({
    status,
    viewer: source.viewer,
    projector: source.projector,
  });
  const counts = Object.fromEntries(
    source.counts.map((row) => [row.optionId, row.votes]),
  );
  const { rows, total } = computeResults(source.options, counts);
  const correctOption =
    source.options.find((option) => option.isCorrect) ?? null;
  const closed = status === "closed";

  return {
    quiz: {
      id: source.quiz.id,
      talkId: source.quiz.talkId,
      question: source.quiz.question,
      status,
      resultsIdentifiable: source.quiz.resultsIdentifiable,
      closedAt: source.quiz.closedAt?.toISOString() ?? null,
      correctOptionId: closed ? (correctOption?.id ?? null) : null,
      correctVotes:
        closed && correctOption ? (counts[correctOption.id] ?? 0) : null,
    },
    needsVote: visibility.needsVote,
    showResults: visibility.showResults,
    options: source.options.map((option) => ({
      optionId: option.id,
      label: option.label,
    })),
    rows: visibility.showResults ? rows : [],
    total: visibility.showResults ? total : null,
    voters:
      visibility.showResults && source.quiz.resultsIdentifiable
        ? (source.votes ?? [])
        : null,
    viewer:
      closed && source.viewer.hasVoted && source.viewer.optionId
        ? {
            optionId: source.viewer.optionId,
            correct: source.viewer.optionId === correctOption?.id,
          }
        : null,
  };
}

type QuizResultsData = Pick<QuizResultsSource, "options" | "counts" | "votes">;

const QUIZ_RESULTS_CACHE_TTL_MS = 2_000;
const QUIZ_RESULTS_CACHE_LIMIT = 200;

type CachedQuizResults = {
  data: QuizResultsData;
  expiresAt: number;
};

declare global {
  var __presentaliaQuizResults: Map<string, CachedQuizResults> | undefined;
}

/**
 * Live results are polled by every viewer every five seconds. Cache only the
 * options, counts, and visible identities for a very short time. The quiz row
 * is always read fresh so closing the quiz reveals the answer immediately,
 * and the viewer-specific payload is built per request so one viewer's vote
 * or role never leaks into another's response.
 */
function quizResultsCache(): Map<string, CachedQuizResults> {
  if (!globalThis.__presentaliaQuizResults) {
    globalThis.__presentaliaQuizResults = new Map();
  }
  return globalThis.__presentaliaQuizResults;
}

function readCachedQuizData(quizId: string): QuizResultsData | null {
  const cache = quizResultsCache();
  const entry = cache.get(quizId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(quizId);
    return null;
  }
  return entry.data;
}

function writeCachedQuizData(quizId: string, data: QuizResultsData): void {
  const cache = quizResultsCache();
  cache.set(quizId, {
    data,
    expiresAt: Date.now() + QUIZ_RESULTS_CACHE_TTL_MS,
  });
  if (cache.size > QUIZ_RESULTS_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

/**
 * Drops cached quiz data so the next read hits Postgres. Pass a quiz id to
 * clear one quiz (used after a vote); omit it to clear everything (tests).
 */
export function clearQuizResultsCache(quizId?: string): void {
  if (quizId) {
    quizResultsCache().delete(quizId);
  } else {
    quizResultsCache().clear();
  }
}

export type LoadQuizResultsOptions = {
  db?: Db;
  /** Projector views never receive live percentages or response counts. */
  projector?: boolean;
};

function viewerState(
  access: TalkAccess,
  vote: { optionId: string } | undefined,
): QuizViewer {
  return {
    isAttendee: isAttendee(access),
    hasVoted: Boolean(vote),
    optionId: vote?.optionId ?? null,
  };
}

async function loadViewerVote(
  quizId: string,
  access: TalkAccess,
  db: Db,
): Promise<{ optionId: string } | undefined> {
  const key = attendeeVoteKey(access);
  const [vote] = await db
    .select({ optionId: quizVotes.optionId })
    .from(quizVotes)
    .where(
      and(
        eq(quizVotes.quizId, quizId),
        "userId" in key
          ? eq(quizVotes.userId, key.userId)
          : eq(quizVotes.guestId, key.guestId),
      ),
    )
    .limit(1);
  return vote;
}

/** Loads results through the owner connection after checking app-layer talk access. */
export async function loadQuizResults(
  quizId: string,
  access: TalkAccess,
  { db = getDb(), projector = false }: LoadQuizResultsOptions = {},
): Promise<QuizResultsPayload | null> {
  // Always read the quiz itself. Status changes (launch/close) must be
  // immediate even if the option/count data is still cached.
  const quizRows = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      question: quizzes.question,
      status: activities.status,
      resultsIdentifiable: quizzes.resultsIdentifiable,
      closedAt: activities.closedAt,
    })
    .from(activities)
    .innerJoin(quizzes, eq(quizzes.activityId, activities.id))
    .where(eq(activities.id, quizId))
    .limit(1);
  const quiz = quizRows[0] ?? null;
  if (!quiz || access.talk.id !== quiz.talkId) {
    return null;
  }

  const cached = readCachedQuizData(quizId);
  if (cached) {
    const vote = await loadViewerVote(quizId, access, db);
    return buildQuizResultsPayload({
      quiz,
      ...cached,
      viewer: viewerState(access, vote),
      projector,
    });
  }

  // The options and the viewer's own vote are independent; fetch them
  // together.
  const optionRowsPromise = db
    .select({
      id: quizOptions.id,
      label: quizOptions.label,
      isCorrect: quizOptions.isCorrect,
      votes: quizVoteCounts.votes,
    })
    .from(quizOptions)
    .leftJoin(
      quizVoteCounts,
      and(
        eq(quizVoteCounts.quizId, quizOptions.quizId),
        eq(quizVoteCounts.optionId, quizOptions.id),
      ),
    )
    .where(eq(quizOptions.quizId, quizId))
    .orderBy(asc(quizOptions.position));
  const votePromise = loadViewerVote(quizId, access, db);

  const [optionRows, vote] = await Promise.all([
    optionRowsPromise,
    votePromise,
  ]);

  const options = optionRows.map(({ id, label, isCorrect }) => ({
    id,
    label,
    isCorrect,
  }));
  const counts = optionRows.flatMap((row) =>
    row.votes === null ? [] : [{ optionId: row.id, votes: row.votes }],
  );

  // Identities are only part of the public payload when the quiz is
  // identifiable. Query them for every non-ready state so the short cache can
  // serve both manager and attendee requests without exposing them early.
  // Names come from the app-owned user mirror or the guest row.
  const votes =
    quiz.resultsIdentifiable && quiz.status !== "ready"
      ? (
          await db
            .select({
              optionId: quizVotes.optionId,
              name: sql<
                string | null
              >`coalesce(${appUsers.email}, ${talkGuests.username})`,
            })
            .from(quizVotes)
            .leftJoin(appUsers, eq(appUsers.id, quizVotes.userId))
            .leftJoin(talkGuests, eq(talkGuests.id, quizVotes.guestId))
            .where(eq(quizVotes.quizId, quizId))
        ).flatMap((row) =>
          row.name === null ? [] : [{ optionId: row.optionId, name: row.name }],
        )
      : undefined;

  const data: QuizResultsData = { options, counts, votes };
  if (quiz.status !== "ready") {
    writeCachedQuizData(quizId, data);
  }

  return buildQuizResultsPayload({
    quiz,
    ...data,
    viewer: viewerState(access, vote),
    projector,
  });
}

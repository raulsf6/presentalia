import { asc, desc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  appUsers,
  talkGuests,
  textActivities,
  textAnswers,
  textRankingRuns,
  textRankings,
} from "@/db/schema";
import type { ActivityStatus } from "@/lib/activities";
import { attendeeVoteKey, type TalkAccess } from "@/lib/membership";
export type TextResultsMode = "waiting" | "ranking" | "ranked" | "unranked";

export type TextResultsAnswer = {
  id: string;
  body: string;
  name: string | null;
  createdAt: Date;
};

export type TextResultsRun = {
  status: "running" | "succeeded" | "failed";
  error: string | null;
  model: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  summary: string | null;
} | null;

export type TextResultsRanking = {
  answerId: string;
  rank: number | null;
  rationale: string | null;
  dropReason: string | null;
};

export type TextResultsSource = {
  activity: {
    id: string;
    talkId: string;
    prompt: string;
    criteria: string;
    status: ActivityStatus;
    resultsIdentifiable: boolean;
    closedAt: Date | null;
  };
  answers: TextResultsAnswer[];
  run: TextResultsRun;
  rankings: TextResultsRanking[];
  viewer: { isAttendee: boolean; hasAnswered: boolean };
  projector: boolean;
};

export type TextResultsRow = {
  answerId: string;
  rank: number | null;
  body: string;
  rationale: string | null;
  name: string | null;
};

export type TextResultsPayload = {
  activity: {
    id: string;
    talkId: string;
    prompt: string;
    criteria: string;
    status: ActivityStatus;
    resultsIdentifiable: boolean;
    closedAt: string | null;
    totalAnswers: number;
  };
  mode: TextResultsMode;
  needsVote: boolean;
  run: {
    status: "running" | "succeeded" | "failed";
    error: string | null;
    model: string | null;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  rows: TextResultsRow[];
  dropped: { answerId: string; body: string; reason: string }[] | null;
  summary: string | null;
  droppedCount: number;
  viewer: { hasAnswered: boolean };
};

/**
 * Builds the payload from already-loaded rows. Visibility is decided here so
 * the route and the page cannot disagree:
 *   - nothing the room wrote before `closed`, except a manager preview while
 *     `locked` (non-projector) and the unranked fallback after close;
 *   - dropped answers and run metadata are manager-only;
 *   - emails need closed + identifiable + non-projector.
 */
export function buildTextResultsPayload(
  source: TextResultsSource,
): TextResultsPayload {
  const { activity, viewer, projector } = source;
  const closed = activity.status === "closed";
  const isManager = !viewer.isAttendee;
  const publishedRun =
    closed && source.run?.status === "succeeded" ? source.run : null;

  const mode: TextResultsMode = closed
    ? publishedRun
      ? "ranked"
      : "unranked"
    : activity.status === "locked" && source.run?.status === "running"
      ? "ranking"
      : "waiting";

  const showNames = closed && activity.resultsIdentifiable && !projector;
  const nameFor = (answer: TextResultsAnswer): string | null =>
    showNames ? answer.name : null;

  const byId = new Map(source.answers.map((answer) => [answer.id, answer]));
  let rows: TextResultsRow[];

  if (publishedRun) {
    rows = source.rankings
      .filter((ranking) => ranking.rank !== null && ranking.dropReason === null)
      .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
      .flatMap((ranking) => {
        const answer = byId.get(ranking.answerId);
        return answer
          ? [
              {
                answerId: answer.id,
                rank: ranking.rank,
                body: answer.body,
                rationale: ranking.rationale,
                name: nameFor(answer),
              },
            ]
          : [];
      });
  } else if (
    closed ||
    (activity.status === "locked" && isManager && !projector)
  ) {
    rows = [...source.answers]
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id),
      )
      .map((answer) => ({
        answerId: answer.id,
        rank: null,
        body: answer.body,
        rationale: null,
        name: nameFor(answer),
      }));
  } else {
    rows = [];
  }

  const dropped =
    closed && publishedRun && isManager && !projector
      ? source.rankings.flatMap((ranking) => {
          const answer = byId.get(ranking.answerId);
          return ranking.dropReason !== null && answer
            ? [
                {
                  answerId: answer.id,
                  body: answer.body,
                  reason: ranking.dropReason,
                },
              ]
            : [];
        })
      : null;

  return {
    activity: {
      id: activity.id,
      talkId: activity.talkId,
      prompt: activity.prompt,
      criteria: activity.criteria,
      status: activity.status,
      resultsIdentifiable: activity.resultsIdentifiable,
      closedAt: activity.closedAt?.toISOString() ?? null,
      totalAnswers: source.answers.length,
    },
    mode,
    needsVote:
      viewer.isAttendee && activity.status === "active" && !viewer.hasAnswered,
    run:
      isManager && !projector && activity.status !== "draft" && source.run
        ? {
            status: source.run.status,
            error: source.run.error,
            model: source.run.model,
            startedAt: source.run.startedAt.toISOString(),
            finishedAt: source.run.finishedAt?.toISOString() ?? null,
          }
        : null,
    rows,
    dropped,
    summary: publishedRun?.summary ?? null,
    droppedCount: publishedRun
      ? source.rankings.filter((ranking) => ranking.dropReason !== null).length
      : 0,
    viewer: { hasAnswered: viewer.hasAnswered },
  };
}

export type LoadTextResultsOptions = {
  db?: Db;
  /** Projector views never receive names or manager metadata. */
  projector?: boolean;
};

/** Loads results after the caller has authorized access to the activity's talk. */
export async function loadTextResults(
  activityId: string,
  access: TalkAccess,
  { db = getDb(), projector = false }: LoadTextResultsOptions = {},
): Promise<TextResultsPayload | null> {
  const [activity] = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      status: activities.status,
      closedAt: activities.closedAt,
      prompt: textActivities.prompt,
      criteria: textActivities.criteria,
      resultsIdentifiable: textActivities.resultsIdentifiable,
    })
    .from(activities)
    .innerJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity || access.talk.id !== activity.talkId) {
    return null;
  }

  const [answerRows, runRows] = await Promise.all([
    db
      .select({
        id: textAnswers.id,
        body: textAnswers.body,
        userId: textAnswers.userId,
        guestId: textAnswers.guestId,
        email: appUsers.email,
        guestName: talkGuests.username,
        createdAt: textAnswers.createdAt,
      })
      .from(textAnswers)
      .leftJoin(appUsers, eq(appUsers.id, textAnswers.userId))
      .leftJoin(talkGuests, eq(talkGuests.id, textAnswers.guestId))
      .where(eq(textAnswers.activityId, activityId))
      .orderBy(asc(textAnswers.createdAt), asc(textAnswers.id)),
    db
      .select({
        id: textRankingRuns.id,
        status: textRankingRuns.status,
        error: textRankingRuns.error,
        model: textRankingRuns.model,
        startedAt: textRankingRuns.startedAt,
        finishedAt: textRankingRuns.finishedAt,
        publishedAt: textRankingRuns.publishedAt,
        summary: textRankingRuns.summary,
      })
      .from(textRankingRuns)
      .where(eq(textRankingRuns.activityId, activityId))
      .orderBy(desc(textRankingRuns.startedAt)),
  ]);

  const published = runRows.find((run) => run.publishedAt !== null) ?? null;
  // A closed activity publishes exactly one run; a live one shows its latest
  // attempt so the presenter can see a failure.
  const run = activity.status === "closed" ? published : (runRows[0] ?? null);

  const rankingRows =
    run && run.status === "succeeded"
      ? await db
          .select({
            answerId: textRankings.answerId,
            rank: textRankings.rank,
            rationale: textRankings.rationale,
            dropReason: textRankings.dropReason,
          })
          .from(textRankings)
          .where(eq(textRankings.runId, run.id))
      : [];

  return buildTextResultsPayload({
    activity: {
      id: activity.id,
      talkId: activity.talkId,
      prompt: activity.prompt,
      criteria: activity.criteria,
      status: activity.status as ActivityStatus,
      resultsIdentifiable: activity.resultsIdentifiable,
      closedAt: activity.closedAt,
    },
    answers: answerRows.map((answer) => ({
      id: answer.id,
      body: answer.body,
      name: answer.email ?? answer.guestName,
      createdAt: answer.createdAt,
    })),
    run: run
      ? {
          status: run.status as "running" | "succeeded" | "failed",
          error: run.error,
          model: run.model,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          summary: run.summary,
        }
      : null,
    rankings: rankingRows,
    viewer: {
      isAttendee: access.access === "member" || access.access === "guest",
      hasAnswered: answerRows.some((answer) => {
        const key = attendeeVoteKey(access);
        return "userId" in key
          ? answer.userId === key.userId
          : answer.guestId === key.guestId;
      }),
    },
    projector,
  });
}

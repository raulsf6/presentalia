"use server";

import { and, asc, eq, isNotNull, lt } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb, type Db, type DbTx } from "@/db";
import {
  activities,
  textActivities,
  textAnswers,
  textRankingRuns,
  textRankings,
} from "@/db/schema";
import {
  canAcceptAnswers,
  canPublishUnranked,
  canRank,
  type ActivityStatus,
} from "@/lib/activities";
import { getSessionUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { isRosteredAttendee, requireTalkManager } from "@/lib/membership";
import { logServerError } from "@/lib/server-log";
import {
  RANKED_ANSWER_LIMIT,
  validateTextActivityInput,
  validateTextAnswer,
} from "@/lib/text-activity";
import {
  RANKING_PROMPT_VERSION,
  RANKING_STALE_MS,
  generateRankingWithGateway,
  rankTextAnswers,
  type RankingAnswer,
} from "@/lib/text-ranking";

export type TextActionResult = { ok: boolean; error?: string };
export type TextAnswerResult = { ok: boolean; error?: string; talkId?: string };

type PreparedRanking =
  | {
      ok: true;
      runId: string;
      answers: { id: string; body: string; createdAt: Date }[];
    }
  | { ok: false; error: string };

/** Create a draft text activity and its prompt/criterion atomically. */
export async function createTextActivityAction(
  talkId: string,
  _previous: TextActionResult,
  formData: FormData,
): Promise<TextActionResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const validation = validateTextActivityInput({
    prompt: String(formData.get("prompt") ?? ""),
    criteria: String(formData.get("criteria") ?? ""),
    resultsIdentifiable: formData.get("resultsIdentifiable") !== null,
  });
  if (!validation.ok) {
    return validation;
  }

  let activityId = "";
  await getDb().transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({ talkId, type: "text", status: "draft" })
      .returning({ id: activities.id });
    activityId = activity.id;
    await tx.insert(textActivities).values({
      activityId,
      prompt: validation.prompt,
      criteria: validation.criteria,
      resultsIdentifiable: validation.resultsIdentifiable,
    });
  });

  updateTag(`activities:${talkId}`);
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/activities`);
  redirect(`/talks/${talkId}/activities/${activityId}`);
}

/** Submit an attendee's one immutable answer while the activity is active. */
export async function submitTextAnswerAction(
  activityId: string,
  rawBody: string,
): Promise<TextAnswerResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You need to sign in to answer." };
  }

  const validation = validateTextAnswer(rawBody);
  if (!validation.ok) {
    return validation;
  }

  const db = getDb();
  let outcome: { ok: true; talkId: string } | { ok: false; error: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [activity] = await tx
        .select({ status: activities.status, talkId: activities.talkId })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1)
        .for("share", { of: activities });
      if (!activity) {
        return { ok: false, error: "You don't have access to this activity." };
      }
      if (!(await isRosteredAttendee(user, activity.talkId, tx))) {
        return { ok: false, error: "You don't have access to this activity." };
      }
      if (!canAcceptAnswers(activity.status as ActivityStatus)) {
        return {
          ok: false,
          error: "This activity is not accepting answers.",
        };
      }

      await tx.insert(textAnswers).values({
        activityId,
        userId: user.id,
        body: validation.body,
      });
      return { ok: true, talkId: activity.talkId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "You have already answered this activity." };
    }
    throw error;
  }
  if (!outcome.ok) {
    return outcome;
  }

  updateTag(`activities:${outcome.talkId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${activityId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${activityId}/results`);
  return { ok: true, talkId: outcome.talkId };
}

/**
 * Rank the answers and close the activity. Locks first, calls the model
 * outside any transaction, then stores the run and closes in one transaction.
 * A failure leaves the activity locked so the presenter can retry or publish
 * every answer.
 */
export async function rankTextActivityAction(
  activityId: string,
): Promise<TextActionResult> {
  const db = getDb();
  const [activity] = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      status: activities.status,
      prompt: textActivities.prompt,
      criteria: textActivities.criteria,
    })
    .from(activities)
    .innerJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity) {
    return {
      ok: false,
      error: "Activity not found or you don't have access.",
    };
  }

  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }
  if (!canRank(activity.status as ActivityStatus)) {
    return { ok: false, error: "This activity can no longer be ranked." };
  }

  await sweepStaleRuns(db, activityId);

  // Lock the activity and take the answer snapshot in one short transaction.
  // `FOR UPDATE` conflicts with the FOR SHARE lock in submitTextAnswerAction,
  // so an in-flight answer either lands before the lock and is ranked, or sees
  // `locked` and is rejected. The model call happens after this commits.
  let prepared: PreparedRanking;
  try {
    prepared = await db.transaction(async (tx): Promise<PreparedRanking> => {
      const [current] = await tx
        .select({ status: activities.status })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1)
        .for("update");
      if (!current) {
        return {
          ok: false,
          error: "Activity not found or you don't have access.",
        };
      }
      if (!canRank(current.status as ActivityStatus)) {
        return { ok: false, error: "This activity can no longer be ranked." };
      }

      const answers = await tx
        .select({
          id: textAnswers.id,
          body: textAnswers.body,
          createdAt: textAnswers.createdAt,
        })
        .from(textAnswers)
        .where(
          and(
            eq(textAnswers.activityId, activityId),
            isNotNull(textAnswers.userId),
          ),
        )
        .orderBy(asc(textAnswers.createdAt), asc(textAnswers.id));

      if (answers.length === 0) {
        return { ok: false, error: "There are no answers to rank." };
      }
      if (answers.length > RANKED_ANSWER_LIMIT) {
        return {
          ok: false,
          error: `Too many answers to rank (${answers.length}). Publish all answers instead.`,
        };
      }

      if (current.status === "active") {
        await tx
          .update(activities)
          .set({ status: "locked", launchedAt: new Date() })
          .where(
            and(eq(activities.id, activityId), eq(activities.status, "active")),
          );
      }

      const [run] = await tx
        .insert(textRankingRuns)
        .values({
          activityId,
          status: "running",
          model: process.env.RANKING_MODEL ?? null,
          promptVersion: RANKING_PROMPT_VERSION,
          criteriaSnapshot: activity.criteria,
          answerCount: answers.length,
        })
        .returning({ id: textRankingRuns.id });

      return { ok: true, runId: run.id, answers };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ranking is already running." };
    }
    throw error;
  }
  if (!prepared.ok) {
    return prepared;
  }

  const { runId, answers } = prepared;

  const rankingAnswers: RankingAnswer[] = answers.map((answer) => ({
    id: answer.id,
    text: answer.body,
    createdAt: answer.createdAt,
  }));

  let result;
  try {
    result = await rankTextAnswers(
      {
        prompt: activity.prompt,
        criteria: activity.criteria,
        answers: rankingAnswers,
      },
      generateRankingWithGateway,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ranking failed.";
    await db
      .update(textRankingRuns)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(textRankingRuns.id, runId));
    logServerError("text.rank", error, { activityId, runId });
    revalidateText(activity.talkId, activityId);
    return {
      ok: false,
      error: "Ranking failed. Retry or publish all answers.",
    };
  }

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const rows = [
        ...result.ranked.map((row) => ({
          runId,
          answerId: row.answerId,
          rank: row.rank,
          score: row.score,
          rationale: row.rationale,
          dropReason: null,
        })),
        ...result.dropped.map((row) => ({
          runId,
          answerId: row.answerId,
          rank: null,
          score: null,
          rationale: null,
          dropReason: row.reason,
        })),
      ];
      await tx.insert(textRankings).values(rows);
      await tx
        .update(textRankingRuns)
        .set({
          status: "succeeded",
          summary: result.summary,
          generationId: result.generationId,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          finishedAt: now,
          publishedAt: now,
        })
        .where(eq(textRankingRuns.id, runId));
      const closed = await tx
        .update(activities)
        .set({ status: "closed", closedAt: now })
        .where(
          and(eq(activities.id, activityId), eq(activities.status, "locked")),
        )
        .returning({ id: activities.id });
      if (closed.length === 0) {
        throw new Error("Activity was not in a rankable state.");
      }
    });
  } catch (error) {
    await db
      .update(textRankingRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: "Ranking could not be stored.",
      })
      .where(
        and(
          eq(textRankingRuns.id, runId),
          eq(textRankingRuns.status, "running"),
        ),
      );
    logServerError("text.rank.write", error, { activityId, runId });
    revalidateText(activity.talkId, activityId);
    return {
      ok: false,
      error: "Ranking could not be saved. Retry or publish all answers.",
    };
  }

  revalidateText(activity.talkId, activityId);
  return { ok: true };
}

/** Close without ranking. Also the escape hatch after a failed run. */
export async function publishTextUnrankedAction(
  activityId: string,
): Promise<TextActionResult> {
  const db = getDb();
  const [activity] = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
    })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity) {
    return {
      ok: false,
      error: "Activity not found or you don't have access.",
    };
  }

  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }

  // Serialize against the rank transaction so a run cannot start between the
  // check and the close. Stale runs are swept first, so a dead invocation does
  // not block the escape hatch.
  const outcome = await db.transaction(
    async (
      tx,
    ): Promise<{ ok: true; talkId: string } | { ok: false; error: string }> => {
      const [current] = await tx
        .select({ status: activities.status, talkId: activities.talkId })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1)
        .for("update");
      if (!current) {
        return {
          ok: false,
          error: "Activity not found or you don't have access.",
        };
      }
      if (!canPublishUnranked(current.status as ActivityStatus)) {
        return { ok: false, error: "This activity can no longer be closed." };
      }

      await sweepStaleRuns(tx, activityId);

      const [running] = await tx
        .select({ id: textRankingRuns.id })
        .from(textRankingRuns)
        .where(
          and(
            eq(textRankingRuns.activityId, activityId),
            eq(textRankingRuns.status, "running"),
          ),
        )
        .limit(1);
      if (running) {
        return {
          ok: false,
          error: "Ranking is still running. Wait for it to finish or time out.",
        };
      }

      await tx
        .update(activities)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(activities.id, activityId));
      return { ok: true, talkId: current.talkId };
    },
  );
  if (!outcome.ok) {
    return outcome;
  }

  revalidateText(outcome.talkId, activityId);
  return { ok: true };
}

/** A killed invocation must not block retries forever. */
async function sweepStaleRuns(
  db: Db | DbTx,
  activityId: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - RANKING_STALE_MS);
  await db
    .update(textRankingRuns)
    .set({
      status: "failed",
      finishedAt: new Date(),
      error: "Ranking timed out.",
    })
    .where(
      and(
        eq(textRankingRuns.activityId, activityId),
        eq(textRankingRuns.status, "running"),
        lt(textRankingRuns.startedAt, cutoff),
      ),
    );
}

function revalidateText(talkId: string, activityId: string): void {
  updateTag(`activities:${talkId}`);
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/activities`);
  revalidatePath(`/talks/${talkId}/activities/${activityId}`);
  revalidatePath(`/talks/${talkId}/activities/${activityId}/results`);
}

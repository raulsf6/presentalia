import { eq, inArray, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  polls,
  quizzes,
  talkDeckActivities,
  talks,
  textActivities,
} from "@/db/schema";
import type { ActivityStatus, ActivityType } from "@/lib/activities";
import { clampSlide } from "@/lib/slide-state";

export type DeckPlanEntry = {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  question: string;
};

export type DeckPlacement = {
  activityId: string;
  afterSlide: number;
  position: number;
};

export type DeckPlan = {
  activities: DeckPlanEntry[];
  placements: DeckPlacement[];
};

export type DeckPlanInput = {
  pageCount: number;
  placements: { activityId: string; afterSlide: number }[];
};

export type DeckPlanResult = { ok: true } | { ok: false; error: string };

const MAX_PAGES = 2_000;

const activityQuestion = sql<string>`coalesce(${polls.question}, ${quizzes.question}, ${textActivities.prompt})`;

/** Every activity and every placement of a talk, for the plan editor. */
export async function loadDeckPlan(
  talkId: string,
  db: Db = getDb(),
): Promise<DeckPlan> {
  const activityRows = await db
    .select({
      id: activities.id,
      type: activities.type,
      status: activities.status,
      question: activityQuestion,
    })
    .from(activities)
    .leftJoin(polls, eq(polls.activityId, activities.id))
    .leftJoin(quizzes, eq(quizzes.activityId, activities.id))
    .leftJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(activities.createdAt);

  const placementRows = await db
    .select({
      activityId: talkDeckActivities.activityId,
      afterSlide: talkDeckActivities.afterSlide,
      position: talkDeckActivities.position,
    })
    .from(talkDeckActivities)
    .innerJoin(activities, eq(activities.id, talkDeckActivities.activityId))
    .where(eq(activities.talkId, talkId))
    .orderBy(talkDeckActivities.afterSlide, talkDeckActivities.position);

  return {
    activities: activityRows.map((row) => ({
      id: row.id,
      type: row.type as ActivityType,
      status: row.status as ActivityStatus,
      question: row.question,
    })),
    placements: placementRows,
  };
}

/**
 * Replaces a talk's whole plan. A newly placed activity must be ready; one that
 * is already in the deck keeps its place when it goes live or closes.
 */
export async function saveDeckPlan(
  talkId: string,
  input: DeckPlanInput,
  db: Db = getDb(),
): Promise<DeckPlanResult> {
  const { pageCount, placements } = input;
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return { ok: false, error: "That deck's page count is not valid." };
  }

  const seen = new Set<string>();
  for (const placement of placements) {
    if (seen.has(placement.activityId)) {
      return {
        ok: false,
        error: "Each activity can only be placed once.",
      };
    }
    seen.add(placement.activityId);
    if (
      !Number.isInteger(placement.afterSlide) ||
      placement.afterSlide < 1 ||
      placement.afterSlide > pageCount - 1
    ) {
      return {
        ok: false,
        error: "Every activity must sit between two pages of the deck.",
      };
    }
  }

  return db.transaction(async (tx): Promise<DeckPlanResult> => {
    const [talk] = await tx
      .select({
        slide: talks.currentSlide,
        count: talks.slideCount,
        currentActivityId: talks.currentActivityId,
      })
      .from(talks)
      .where(eq(talks.id, talkId))
      .limit(1)
      .for("update");
    if (!talk) {
      return { ok: false, error: "Talk not found." };
    }

    const talkActivities = await tx
      .select({ id: activities.id, status: activities.status })
      .from(activities)
      .where(eq(activities.talkId, talkId));
    const statusById = new Map(
      talkActivities.map((activity) => [activity.id, activity.status]),
    );

    const placedRows = await tx
      .select({ activityId: talkDeckActivities.activityId })
      .from(talkDeckActivities)
      .innerJoin(activities, eq(activities.id, talkDeckActivities.activityId))
      .where(eq(activities.talkId, talkId));
    const alreadyPlaced = new Set(placedRows.map((row) => row.activityId));

    for (const placement of placements) {
      const status = statusById.get(placement.activityId);
      if (status === undefined) {
        return {
          ok: false,
          error: "That activity is not part of this talk.",
        };
      }
      if (status !== "ready" && !alreadyPlaced.has(placement.activityId)) {
        return {
          ok: false,
          error: "Only ready activities can be placed in the deck.",
        };
      }
    }

    await tx
      .delete(talkDeckActivities)
      .where(
        inArray(
          talkDeckActivities.activityId,
          tx
            .select({ id: activities.id })
            .from(activities)
            .where(eq(activities.talkId, talkId)),
        ),
      );

    if (placements.length > 0) {
      const nextPosition = new Map<number, number>();
      await tx.insert(talkDeckActivities).values(
        placements.map((placement) => {
          const position = nextPosition.get(placement.afterSlide) ?? 0;
          nextPosition.set(placement.afterSlide, position + 1);
          return {
            activityId: placement.activityId,
            afterSlide: placement.afterSlide,
            position,
          };
        }),
      );
    }

    const currentPlacement =
      talk.currentActivityId === null
        ? null
        : (placements.find(
            (placement) => placement.activityId === talk.currentActivityId,
          ) ?? null);
    const stepGone =
      talk.currentActivityId !== null &&
      (currentPlacement === null || currentPlacement.afterSlide !== talk.slide);

    const countChanged = talk.count !== pageCount;
    if (countChanged || stepGone) {
      await tx
        .update(talks)
        .set({
          slideCount: pageCount,
          currentSlide: clampSlide(talk.slide, pageCount),
          ...(stepGone ? { currentActivityId: null } : {}),
          slideRevision: sql`${talks.slideRevision} + 1`,
        })
        .where(eq(talks.id, talkId));
    }

    return { ok: true };
  });
}

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb, type Db, type DbTx } from "@/db";
import {
  activities,
  polls,
  quizzes,
  talkDeckActivities,
  talks,
  textActivities,
  type TalkRow,
} from "@/db/schema";
import type { ActivityStatus, ActivityType } from "@/lib/activities";

export type SlideDirection = "next" | "previous";

/** The activity on screen, with what the deck needs to label it. */
export type SlideActivity = {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  question: string;
};

/** The talk's live activity when the deck has moved past it. */
export type SlideLiveActivity = {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  question: string;
};

/** The position as clients see it: page, total, step, and a revision. */
export type SlidePosition = {
  slide: number;
  count: number | null;
  revision: number;
  activity: SlideActivity | null;
  live: SlideLiveActivity | null;
};

/** Everything the present screen polls for. */
export type SlideState = SlidePosition & {
  slidesUpdatedAt: string | null;
};

type Placement = {
  activityId: string;
  afterSlide: number;
  position: number;
};

/** Keeps a page inside the deck we know about, and never below the first. */
export function clampSlide(slide: number, count: number | null): number {
  if (count === null) {
    return Math.max(1, slide);
  }
  return Math.min(Math.max(1, slide), count);
}

const activityQuestion = sql<string>`coalesce(${polls.question}, ${quizzes.question}, ${textActivities.prompt})`;

const activityColumns = {
  id: activities.id,
  type: activities.type,
  status: activities.status,
  question: activityQuestion,
};

/** Reads one activity with its type-specific question. */
async function readActivity(
  db: Db | DbTx,
  activityId: string,
): Promise<SlideActivity | null> {
  const [row] = await db
    .select(activityColumns)
    .from(activities)
    .leftJoin(polls, eq(polls.activityId, activities.id))
    .leftJoin(quizzes, eq(quizzes.activityId, activities.id))
    .leftJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    type: row.type as ActivityType,
    status: row.status as ActivityStatus,
    question: row.question,
  };
}

/** The talk's live activity, or null when it is the one on screen. */
async function readLiveActivity(
  db: Db | DbTx,
  talkId: string,
  onScreenId: string | null,
): Promise<SlideLiveActivity | null> {
  const [row] = await db
    .select(activityColumns)
    .from(activities)
    .leftJoin(polls, eq(polls.activityId, activities.id))
    .leftJoin(quizzes, eq(quizzes.activityId, activities.id))
    .leftJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(
      and(
        eq(activities.talkId, talkId),
        inArray(activities.status, ["active", "locked"]),
      ),
    )
    .limit(1);
  if (!row || row.id === onScreenId) {
    return null;
  }
  return {
    id: row.id,
    type: row.type as ActivityType,
    status: row.status as ActivityStatus,
    question: row.question,
  };
}

/** Reads the talk's slide position, or null when the talk does not exist. */
export async function readSlideState(
  talkId: string,
  db: Db = getDb(),
): Promise<SlideState | null> {
  const [row] = await db
    .select({
      slide: talks.currentSlide,
      count: talks.slideCount,
      revision: talks.slideRevision,
      slidesUpdatedAt: talks.slidesUpdatedAt,
      currentActivityId: talks.currentActivityId,
    })
    .from(talks)
    .where(eq(talks.id, talkId))
    .limit(1);
  if (!row) {
    return null;
  }

  const [activity, live] = await Promise.all([
    row.currentActivityId
      ? readActivity(db, row.currentActivityId)
      : Promise.resolve(null),
    readLiveActivity(db, talkId, row.currentActivityId),
  ]);

  return {
    slide: clampSlide(row.slide, row.count),
    count: row.count,
    revision: row.revision,
    slidesUpdatedAt: row.slidesUpdatedAt?.toISOString() ?? null,
    activity,
    live,
  };
}

/** One step forward or backward through the pages and the activities. */
function nextStep(
  current: { slide: number; count: number | null; activityId: string | null },
  placements: Placement[],
): { slide: number; activityId: string | null } {
  const gap = (page: number) =>
    placements.filter((placement) => placement.afterSlide === page);

  if (current.activityId !== null) {
    const placement = placements.find(
      (candidate) => candidate.activityId === current.activityId,
    );
    if (placement) {
      const ordered = gap(placement.afterSlide);
      const index = ordered.findIndex(
        (candidate) => candidate.activityId === placement.activityId,
      );
      if (index >= 0 && index + 1 < ordered.length) {
        return {
          slide: placement.afterSlide,
          activityId: ordered[index + 1].activityId,
        };
      }
      return {
        slide: clampSlide(placement.afterSlide + 1, current.count),
        activityId: null,
      };
    }
  }

  if (current.count !== null && current.slide >= current.count) {
    return { slide: current.slide, activityId: null };
  }
  const ordered = gap(current.slide);
  if (ordered.length > 0) {
    return { slide: current.slide, activityId: ordered[0].activityId };
  }
  return {
    slide: clampSlide(current.slide + 1, current.count),
    activityId: null,
  };
}

function previousStep(
  current: { slide: number; count: number | null; activityId: string | null },
  placements: Placement[],
): { slide: number; activityId: string | null } {
  const gap = (page: number) =>
    placements.filter((placement) => placement.afterSlide === page);

  if (current.activityId !== null) {
    const placement = placements.find(
      (candidate) => candidate.activityId === current.activityId,
    );
    if (placement) {
      const ordered = gap(placement.afterSlide);
      const index = ordered.findIndex(
        (candidate) => candidate.activityId === placement.activityId,
      );
      if (index > 0) {
        return {
          slide: placement.afterSlide,
          activityId: ordered[index - 1].activityId,
        };
      }
      return {
        slide: clampSlide(placement.afterSlide, current.count),
        activityId: null,
      };
    }
    return { slide: current.slide, activityId: null };
  }

  if (current.slide <= 1) {
    return { slide: 1, activityId: null };
  }
  const page = clampSlide(current.slide - 1, current.count);
  const ordered = gap(page);
  if (ordered.length > 0) {
    return {
      slide: page,
      activityId: ordered[ordered.length - 1].activityId,
    };
  }
  return { slide: page, activityId: null };
}

/**
 * Moves one step in a single transaction, so two taps racing each other still
 * advance twice. The talk row lock serialises taps from the laptop and the
 * phone; the upper bound is the stored count when it is known.
 */
export async function moveSlide(
  talkId: string,
  direction: SlideDirection,
  db: Db = getDb(),
): Promise<SlidePosition | null> {
  return db.transaction(async (tx) => {
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
      return null;
    }

    const placements = await tx
      .select({
        activityId: talkDeckActivities.activityId,
        afterSlide: talkDeckActivities.afterSlide,
        position: talkDeckActivities.position,
      })
      .from(talkDeckActivities)
      .innerJoin(activities, eq(activities.id, talkDeckActivities.activityId))
      .where(eq(activities.talkId, talkId))
      .orderBy(
        talkDeckActivities.afterSlide,
        talkDeckActivities.position,
        talkDeckActivities.createdAt,
      );

    const target = (direction === "next" ? nextStep : previousStep)(
      {
        slide: talk.slide,
        count: talk.count,
        activityId: talk.currentActivityId,
      },
      placements,
    );

    const [updated] = await tx
      .update(talks)
      .set({
        currentSlide: target.slide,
        currentActivityId: target.activityId,
        slideRevision: sql`${talks.slideRevision} + 1`,
      })
      .where(eq(talks.id, talkId))
      .returning({
        slide: talks.currentSlide,
        count: talks.slideCount,
        revision: talks.slideRevision,
        currentActivityId: talks.currentActivityId,
      });
    if (!updated) {
      return null;
    }

    const [activity, live] = await Promise.all([
      updated.currentActivityId
        ? readActivity(tx, updated.currentActivityId)
        : Promise.resolve(null),
      readLiveActivity(tx, talkId, updated.currentActivityId),
    ]);

    return {
      slide: clampSlide(updated.slide, updated.count),
      count: updated.count,
      revision: updated.revision,
      activity,
      live,
    };
  });
}

/**
 * Stores the deck's page count. Only bumps the revision when something actually
 * changed, so repeated reports from a reconnecting screen are free.
 */
export async function reportSlideCount(
  talkId: string,
  count: number,
  db: Db = getDb(),
): Promise<SlidePosition | null> {
  const clamped = sql`least(greatest(${talks.currentSlide}, 1), ${count})`;
  const [row] = await db
    .update(talks)
    .set({
      slideCount: count,
      currentSlide: clamped,
      slideRevision: sql`case
        when ${talks.slideCount} is distinct from ${count}
          or ${talks.currentSlide} <> ${clamped}
        then ${talks.slideRevision} + 1
        else ${talks.slideRevision}
      end`,
    })
    .where(eq(talks.id, talkId))
    .returning({
      slide: talks.currentSlide,
      count: talks.slideCount,
      revision: talks.slideRevision,
      currentActivityId: talks.currentActivityId,
    });
  if (!row) {
    return null;
  }

  const [activity, live] = await Promise.all([
    row.currentActivityId
      ? readActivity(db, row.currentActivityId)
      : Promise.resolve(null),
    readLiveActivity(db, talkId, row.currentActivityId),
  ]);
  return {
    slide: clampSlide(row.slide, row.count),
    count: row.count,
    revision: row.revision,
    activity,
    live,
  };
}

/** Deletes every placement in a talk's deck. */
async function deletePlacements(tx: DbTx, talkId: string): Promise<void> {
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
}

/**
 * Records a completed upload: a new deck starts from its first page, forgets the
 * old page count and every placement, and counts as a position change so open
 * screens reload.
 */
export async function markSlidesUploaded(
  talkId: string,
  db: Db = getDb(),
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(talks)
      .set({
        slidesUpdatedAt: new Date(),
        currentSlide: 1,
        currentActivityId: null,
        slideCount: null,
        slideRevision: sql`${talks.slideRevision} + 1`,
      })
      .where(eq(talks.id, talkId))
      .returning({ id: talks.id });
    if (!row) {
      return false;
    }

    await deletePlacements(tx, talkId);
    return true;
  });
}

/**
 * Removes the deck: the talk has no PDF, no page count, no plan, and sits on
 * its first page again. The caller deletes the stored object.
 */
export async function clearSlides(
  talkId: string,
  db: Db = getDb(),
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(talks)
      .set({
        slidesUpdatedAt: null,
        currentSlide: 1,
        currentActivityId: null,
        slideCount: null,
        slideRevision: sql`${talks.slideRevision} + 1`,
      })
      .where(eq(talks.id, talkId))
      .returning({ id: talks.id });
    if (!row) {
      return false;
    }

    await deletePlacements(tx, talkId);
    return true;
  });
}

/** Turns a loaded talk row into the payload both screens poll for. */
export function slideStateFromTalk(talk: TalkRow): SlideState {
  return {
    slide: clampSlide(talk.currentSlide, talk.slideCount),
    count: talk.slideCount,
    revision: talk.slideRevision,
    slidesUpdatedAt: talk.slidesUpdatedAt?.toISOString() ?? null,
    activity: null,
    live: null,
  };
}

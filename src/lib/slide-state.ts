import { eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { talks, type TalkRow } from "@/db/schema";

export type SlideDirection = "next" | "previous";

/** The position as clients see it: page, total, and a monotonic revision. */
export type SlidePosition = {
  slide: number;
  count: number | null;
  revision: number;
};

/** Everything the present screen polls for. */
export type SlideState = SlidePosition & {
  slidesUpdatedAt: string | null;
};

/** Keeps a page inside the deck we know about, and never below the first. */
export function clampSlide(slide: number, count: number | null): number {
  if (count === null) {
    return Math.max(1, slide);
  }
  return Math.min(Math.max(1, slide), count);
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
    })
    .from(talks)
    .where(eq(talks.id, talkId))
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    slide: clampSlide(row.slide, row.count),
    count: row.count,
    revision: row.revision,
    slidesUpdatedAt: row.slidesUpdatedAt?.toISOString() ?? null,
  };
}

/**
 * Moves one page in a single statement, so two taps racing each other still
 * advance twice. The upper bound is the stored count when it is known; the
 * projector clamps the display to the document it actually loaded.
 */
export async function moveSlide(
  talkId: string,
  direction: SlideDirection,
  db: Db = getDb(),
): Promise<SlidePosition | null> {
  const [row] = await db
    .update(talks)
    .set({
      currentSlide: sql`case
        when ${direction} = 'next'
          then least(coalesce(${talks.slideCount}, ${talks.currentSlide} + 1), ${talks.currentSlide} + 1)
        else greatest(1, ${talks.currentSlide} - 1)
      end`,
      slideRevision: sql`${talks.slideRevision} + 1`,
    })
    .where(eq(talks.id, talkId))
    .returning({
      slide: talks.currentSlide,
      count: talks.slideCount,
      revision: talks.slideRevision,
    });
  return row ?? null;
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
    });
  return row ?? null;
}

/**
 * Records a completed upload: a new deck starts from its first page, forgets the
 * old page count, and counts as a position change so open screens reload.
 */
export async function markSlidesUploaded(
  talkId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .update(talks)
    .set({
      slidesUpdatedAt: new Date(),
      currentSlide: 1,
      slideCount: null,
      slideRevision: sql`${talks.slideRevision} + 1`,
    })
    .where(eq(talks.id, talkId))
    .returning({ id: talks.id });
  return Boolean(row);
}

/** Turns a loaded talk row into the payload both screens poll for. */
export function slideStateFromTalk(talk: TalkRow): SlideState {
  return {
    slide: clampSlide(talk.currentSlide, talk.slideCount),
    count: talk.slideCount,
    revision: talk.slideRevision,
    slidesUpdatedAt: talk.slidesUpdatedAt?.toISOString() ?? null,
  };
}

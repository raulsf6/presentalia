import { and, asc, eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { talkGuests, talks, type TalkRow } from "@/db/schema";

export type TalkGuestListRow = {
  id: string;
  username: string;
  joinedAt: Date;
};

/**
 * The join screen's talk view. A private or missing talk is indistinguishable
 * from an unknown one, so the caller can 404 both without leaking existence.
 */
export async function loadPublicTalk(
  talkId: string,
  db: Db = getDb(),
): Promise<TalkRow | null> {
  const [talk] = await db
    .select()
    .from(talks)
    .where(and(eq(talks.id, talkId), eq(talks.isPublic, true)))
    .limit(1);

  return talk ?? null;
}

/** Guests currently belonging to a talk, oldest first. */
export async function loadTalkGuests(
  talkId: string,
  db: Db = getDb(),
): Promise<TalkGuestListRow[]> {
  return db
    .select({
      id: talkGuests.id,
      username: talkGuests.username,
      joinedAt: talkGuests.joinedAt,
    })
    .from(talkGuests)
    .where(eq(talkGuests.talkId, talkId))
    .orderBy(asc(talkGuests.joinedAt), asc(talkGuests.username));
}

/** Number of guests currently belonging to a talk. */
export async function countTalkGuests(
  talkId: string,
  db: Db = getDb(),
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(talkGuests)
    .where(eq(talkGuests.talkId, talkId));
  return row?.count ?? 0;
}

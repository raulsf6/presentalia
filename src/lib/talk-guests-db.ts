import { asc, eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { talkGuests } from "@/db/schema";

export type TalkGuestListRow = {
  id: string;
  username: string;
  joinedAt: Date;
};

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

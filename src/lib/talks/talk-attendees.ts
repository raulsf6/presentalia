import { eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { talkGuests, talkRoster } from "@/db/schema";

export async function countTalkAttendees(
  talkId: string,
  db: Db = getDb(),
): Promise<number> {
  const [rosterRows, guestRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(talkRoster)
      .where(eq(talkRoster.talkId, talkId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(talkGuests)
      .where(eq(talkGuests.talkId, talkId)),
  ]);
  return (rosterRows[0]?.count ?? 0) + (guestRows[0]?.count ?? 0);
}

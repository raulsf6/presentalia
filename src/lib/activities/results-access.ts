import { getDb, type Db } from "@/db";
import { activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadTalkAccess, type TalkAccess } from "@/lib/talks/membership";

/** Resolves the request's access to the talk that owns an activity. */
export async function getActivityTalkAccess(
  activityId: string,
  db: Db = getDb(),
): Promise<TalkAccess | null> {
  const [row] = await db
    .select({ talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  return row ? loadTalkAccess(row.talkId, db) : null;
}

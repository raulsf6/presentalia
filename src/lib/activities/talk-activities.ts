import { desc, eq, sql } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { activities, polls, quizzes, textActivities } from "@/db/schema";

export type TalkActivitySummary = {
  id: string;
  type: string;
  status: string;
  question: string;
  createdAt: Date;
};

/**
 * Activity summaries for a talk. Read fresh: this powers the live overview,
 * where a push-triggered refresh must never be served a stale in-memory cache
 * from a different server instance.
 */
export async function loadTalkActivities(
  talkId: string,
  db: Db = getDb(),
): Promise<TalkActivitySummary[]> {
  return db
    .select({
      id: activities.id,
      type: activities.type,
      status: activities.status,
      question: sql<string>`coalesce(${polls.question}, ${quizzes.question}, ${textActivities.prompt})`,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(polls, eq(polls.activityId, activities.id))
    .leftJoin(quizzes, eq(quizzes.activityId, activities.id))
    .leftJoin(textActivities, eq(textActivities.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(desc(activities.createdAt));
}

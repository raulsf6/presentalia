import { desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import { activities, polls, quizzes } from "@/db/schema";

export type TalkActivitySummary = {
  id: string;
  type: string;
  status: string;
  question: string;
  createdAt: Date;
};

/**
 * Cached activity summaries for a talk. Activity actions invalidate the
 * talk's tag, so creating, launching, or closing an activity is reflected
 * immediately.
 */
export async function loadTalkActivities(
  talkId: string,
): Promise<TalkActivitySummary[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag("activities", `activities:${talkId}`);

  return getDb()
    .select({
      id: activities.id,
      type: activities.type,
      status: activities.status,
      question: sql<string>`coalesce(${polls.question}, ${quizzes.question})`,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(polls, eq(polls.activityId, activities.id))
    .leftJoin(quizzes, eq(quizzes.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(desc(activities.createdAt));
}

import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import { activities, polls } from "@/db/schema";

export type TalkActivitySummary = {
  id: string;
  status: string;
  question: string;
  createdAt: Date;
};

/**
 * Cached activity summaries for a talk. Poll actions invalidate the talk's
 * tag, so launching, creating, or closing a poll is reflected immediately.
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
      status: activities.status,
      question: polls.question,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(desc(activities.createdAt));
}

import { eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { activities } from "@/db/schema";
import type { TalkAccess } from "@/lib/membership";
import { loadPollResults } from "@/lib/poll-results";
import type { PollResultsPayload } from "@/lib/polls";
import { loadQuizResults, type QuizResultsPayload } from "@/lib/quiz-results";
import { loadTextResults, type TextResultsPayload } from "@/lib/text-results";

/** The activity payload the projected deck renders, selected by type. */
export type DeckActivityPayload =
  | { type: "poll"; payload: PollResultsPayload }
  | { type: "quiz"; payload: QuizResultsPayload }
  | { type: "text"; payload: TextResultsPayload };

/**
 * Loads an activity for the projector, whatever its status. The attendee
 * routes hide a ready activity; the deck must show it before the launch.
 *
 * Returns null when the activity does not exist, belongs to another talk, or
 * has no type-specific row.
 */
export async function loadDeckActivity(
  talkId: string,
  activityId: string,
  access: TalkAccess,
  db: Db = getDb(),
): Promise<DeckActivityPayload | null> {
  const [activity] = await db
    .select({ type: activities.type, talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity || activity.talkId !== talkId) {
    return null;
  }

  if (activity.type === "poll") {
    const payload = await loadPollResults(activityId, access, { db });
    return payload ? { type: "poll", payload } : null;
  }
  if (activity.type === "quiz") {
    const payload = await loadQuizResults(activityId, access, {
      db,
      projector: true,
    });
    return payload ? { type: "quiz", payload } : null;
  }
  if (activity.type === "text") {
    const payload = await loadTextResults(activityId, access, {
      db,
      projector: true,
    });
    return payload ? { type: "text", payload } : null;
  }
  return null;
}

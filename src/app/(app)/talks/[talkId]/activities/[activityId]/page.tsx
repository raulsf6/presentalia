import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { loadTalkAccess } from "@/lib/membership";
import { PollActivity } from "./poll-activity";

export const dynamic = "force-dynamic";

/**
 * Activity detail dispatcher: loads the activity, then renders the controls
 * owned by its type module. Unknown types 404 until they are implemented.
 */
export default async function ActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/[activityId]">) {
  const { talkId, activityId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  const [activity] = await getDb()
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity || activity.talkId !== talkId) {
    notFound();
  }

  switch (activity.type) {
    case "poll":
      return <PollActivity activity={activity} access={access} />;
    default:
      notFound();
  }
}

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { loadTalkAccess } from "@/lib/membership";
import { PollActivity } from "./poll-activity";

/**
 * Activity detail dispatcher: loads the activity, then renders the controls
 * owned by its type module. Unknown types 404 until they are implemented.
 */
export default function ActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/[activityId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActivityContent params={params} />
    </Suspense>
  );
}

async function ActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/[activityId]">["params"];
}) {
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

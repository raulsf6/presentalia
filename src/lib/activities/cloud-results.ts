import { asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import { activities, cloudActivities, cloudAnswers } from "@/db/schema";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  CLOUD_DISPLAY_LIMIT,
  buildCloudItems,
  type CloudIdeaEntry,
  type CloudItem,
} from "@/lib/activities/cloud-activity";
import {
  attendeeVoteKey,
  isManager,
  type TalkAccess,
} from "@/lib/talks/membership";

export type CloudResultsMode = "waiting" | "live" | "final";

export type CloudResultsSource = {
  activity: {
    id: string;
    talkId: string;
    prompt: string;
    status: ActivityStatus;
    closedAt: Date | null;
  };
  entries: CloudIdeaEntry[];
  viewer: { isAttendee: boolean; hasAnswered: boolean };
};

export type CloudResultsPayload = {
  activity: {
    id: string;
    talkId: string;
    prompt: string;
    status: ActivityStatus;
    closedAt: string | null;
    totalIdeas: number;
    uniqueIdeas: number;
  };
  mode: CloudResultsMode;
  needsVote: boolean;
  items: CloudItem[];
  hiddenIdeas: number;
  viewer: { hasAnswered: boolean };
};

/**
 * Applies the visibility rule in one place so the page and API cannot disagree:
 * the live cloud is for managers and the projector only. Attendees see a
 * thank-you until the activity closes, then the final cloud.
 */
export function buildCloudResultsPayload(
  source: CloudResultsSource,
): CloudResultsPayload {
  const { activity, viewer } = source;
  const allItems = buildCloudItems(source.entries);
  const closed = activity.status === "closed";
  const canSeeCloud = !viewer.isAttendee || closed;
  const items = canSeeCloud ? allItems.slice(0, CLOUD_DISPLAY_LIMIT) : [];

  return {
    activity: {
      id: activity.id,
      talkId: activity.talkId,
      prompt: activity.prompt,
      status: activity.status,
      closedAt: activity.closedAt?.toISOString() ?? null,
      totalIdeas: source.entries.length,
      uniqueIdeas: allItems.length,
    },
    mode: closed ? "final" : canSeeCloud ? "live" : "waiting",
    needsVote:
      viewer.isAttendee && activity.status === "active" && !viewer.hasAnswered,
    items,
    hiddenIdeas: canSeeCloud ? allItems.length - items.length : 0,
    viewer: { hasAnswered: viewer.hasAnswered },
  };
}

export type LoadCloudResultsOptions = {
  db?: Db;
};

/** Loads results after the caller has authorized access to the activity's talk. */
export async function loadCloudResults(
  activityId: string,
  access: TalkAccess,
  { db = getDb() }: LoadCloudResultsOptions = {},
): Promise<CloudResultsPayload | null> {
  const [activity] = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      status: activities.status,
      closedAt: activities.closedAt,
      prompt: cloudActivities.prompt,
    })
    .from(activities)
    .innerJoin(cloudActivities, eq(cloudActivities.activityId, activities.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity || access.talk.id !== activity.talkId) {
    return null;
  }

  const entries = await db
    .select({
      id: cloudAnswers.id,
      body: cloudAnswers.body,
      userId: cloudAnswers.userId,
      guestId: cloudAnswers.guestId,
      createdAt: cloudAnswers.createdAt,
    })
    .from(cloudAnswers)
    .where(eq(cloudAnswers.activityId, activityId))
    .orderBy(asc(cloudAnswers.createdAt), asc(cloudAnswers.id));

  const attendee = !isManager(access);
  const viewerKey = attendee ? attendeeVoteKey(access) : null;
  const hasAnswered =
    viewerKey === null
      ? false
      : entries.some((entry) =>
          "userId" in viewerKey
            ? entry.userId === viewerKey.userId
            : entry.guestId === viewerKey.guestId,
        );

  return buildCloudResultsPayload({
    activity: {
      id: activity.id,
      talkId: activity.talkId,
      prompt: activity.prompt,
      status: activity.status as ActivityStatus,
      closedAt: activity.closedAt,
    },
    entries: entries.map((entry) => ({
      id: entry.id,
      body: entry.body,
      createdAt: entry.createdAt,
    })),
    viewer: { isAttendee: attendee, hasAnswered },
  });
}

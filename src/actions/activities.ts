"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { getDb } from "@/db";
import { activities } from "@/db/schema";
import {
  canClose,
  canLaunch,
  type ActivityStatus,
} from "@/lib/activities/activities";
import { getSessionUser } from "@/lib/auth/auth";
import { isUniqueViolation } from "@/lib/platform/db-errors";
import { publishActivityStatusChanged } from "@/lib/platform/live-event-bus";
import { requireTalkManager } from "@/lib/talks/membership";

export type ActivityActionResult = { ok: boolean; error?: string };

/** Launch a ready activity. The partial unique index is the race backstop. */
export async function launchActivityAction(
  activityId: string,
): Promise<ActivityActionResult> {
  const user = await getSessionUser();
  if (!user?.email) {
    return { ok: false, error: "You need to sign in." };
  }
  const [activity] = await getDb()
    .select({ status: activities.status, talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity) {
    return {
      ok: false,
      error: "Activity not found or you don't have access.",
    };
  }
  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }
  if (!canLaunch(activity.status as ActivityStatus)) {
    return {
      ok: false,
      error: "This activity has already been launched or closed.",
    };
  }

  const db = getDb();
  const [otherActive] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.talkId, activity.talkId),
        inArray(activities.status, ["active", "locked"]),
        ne(activities.id, activityId),
      ),
    )
    .limit(1);
  if (otherActive) {
    return {
      ok: false,
      error: "Another activity is already live for this talk.",
    };
  }

  try {
    const updated = await db
      .update(activities)
      .set({ status: "active", launchedAt: new Date() })
      .where(and(eq(activities.id, activityId), eq(activities.status, "ready")))
      .returning({ id: activities.id });
    if (updated.length === 0) {
      return {
        ok: false,
        error: "This activity has already been launched or closed.",
      };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "Another activity is already live for this talk.",
      };
    }
    throw error;
  }

  updateTag(`activities:${activity.talkId}`);
  revalidatePath(`/talks/${activity.talkId}`);
  revalidatePath(`/talks/${activity.talkId}/activities`);
  revalidatePath(`/talks/${activity.talkId}/activities/${activityId}`);
  await publishActivityStatusChanged(activity.talkId, { activityId });
  return { ok: true };
}

/** Close an active activity. Closed activities stay read-only with results available. */
export async function closeActivityAction(
  activityId: string,
): Promise<ActivityActionResult> {
  const user = await getSessionUser();
  if (!user?.email) {
    return { ok: false, error: "You need to sign in." };
  }
  const [activity] = await getDb()
    .select({ status: activities.status, talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity) {
    return {
      ok: false,
      error: "Activity not found or you don't have access.",
    };
  }
  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }
  if (!canClose(activity.status as ActivityStatus)) {
    return { ok: false, error: "This activity is not active." };
  }

  const db = getDb();
  const [closedActivity] = await db
    .update(activities)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(activities.id, activityId), eq(activities.status, "active")))
    .returning({ id: activities.id, talkId: activities.talkId });
  if (!closedActivity) {
    return { ok: false, error: "This activity is not active." };
  }

  updateTag(`activities:${closedActivity.talkId}`);
  revalidatePath(`/talks/${closedActivity.talkId}`);
  revalidatePath(`/talks/${closedActivity.talkId}/activities`);
  revalidatePath(
    `/talks/${closedActivity.talkId}/activities/${closedActivity.id}`,
  );
  revalidatePath(
    `/talks/${closedActivity.talkId}/activities/${closedActivity.id}/results`,
  );
  await publishActivityStatusChanged(closedActivity.talkId, {
    activityId: closedActivity.id,
  });
  return { ok: true };
}

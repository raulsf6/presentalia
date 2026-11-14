"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { activities, cloudActivities, cloudAnswers } from "@/db/schema";
import {
  canAcceptAnswers,
  type ActivityStatus,
} from "@/lib/activities/activities";
import {
  validateCloudActivityInput,
  validateCloudIdea,
} from "@/lib/activities/cloud-activity";
import { publishActivityResultsChanged } from "@/lib/platform/live-event-bus";
import { isUniqueViolation } from "@/lib/platform/db-errors";
import {
  requireTalkManager,
  resolveTalkAttendee,
} from "@/lib/talks/membership";

export type CloudActionResult = { ok: boolean; error?: string };
export type CloudAnswerResult = {
  ok: boolean;
  error?: string;
  talkId?: string;
};

/** Create a ready idea cloud and its question atomically. */
export async function createCloudActivityAction(
  talkId: string,
  _previous: CloudActionResult,
  formData: FormData,
): Promise<CloudActionResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const validation = validateCloudActivityInput({
    prompt: String(formData.get("prompt") ?? ""),
  });
  if (!validation.ok) {
    return validation;
  }

  let activityId = "";
  await getDb().transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({ talkId, type: "cloud", status: "ready" })
      .returning({ id: activities.id });
    activityId = activity.id;
    await tx.insert(cloudActivities).values({
      activityId,
      prompt: validation.prompt,
    });
  });

  updateTag(`activities:${talkId}`);
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/activities`);
  redirect(`/talks/${talkId}/activities/${activityId}`);
}

/** Submit an attendee's one immutable idea while the activity is active. */
export async function submitCloudAnswerAction(
  activityId: string,
  rawBody: string,
): Promise<CloudAnswerResult> {
  const validation = validateCloudIdea(rawBody);
  if (!validation.ok) {
    return validation;
  }

  const db = getDb();
  const [activityRef] = await db
    .select({ talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activityRef) {
    return { ok: false, error: "You don't have access to this activity." };
  }

  const attendee = await resolveTalkAttendee(activityRef.talkId);
  if (!attendee) {
    return { ok: false, error: "You don't have access to this activity." };
  }

  let outcome: { ok: true; talkId: string } | { ok: false; error: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [activity] = await tx
        .select({ status: activities.status, talkId: activities.talkId })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1)
        .for("share", { of: activities });
      if (!activity) {
        return { ok: false, error: "You don't have access to this activity." };
      }
      if (!canAcceptAnswers(activity.status as ActivityStatus)) {
        return {
          ok: false,
          error: "This idea cloud is not accepting ideas.",
        };
      }

      await tx.insert(cloudAnswers).values({
        activityId,
        userId: attendee.kind === "member" ? attendee.user.id : null,
        guestId: attendee.kind === "guest" ? attendee.guest.id : null,
        body: validation.body,
      });
      return { ok: true, talkId: activity.talkId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "You have already submitted an idea." };
    }
    throw error;
  }
  if (!outcome.ok) {
    return outcome;
  }

  updateTag(`activities:${outcome.talkId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${activityId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${activityId}/results`);
  await publishActivityResultsChanged(outcome.talkId, activityId);
  return { ok: true, talkId: outcome.talkId };
}

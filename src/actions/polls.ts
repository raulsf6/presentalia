"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { activities, pollOptions, polls } from "@/db/schema";
import { canClose, canLaunch, validatePollInput } from "@/lib/polls";
import { isUniqueViolation } from "@/lib/db-errors";
import { getSessionUser } from "@/lib/auth";
import { requireTalkManager } from "@/lib/membership";

export type PollActionResult = { ok: boolean; error?: string };

/** Create a draft single-choice poll and its options atomically. */
export async function createPollAction(
  talkId: string,
  _previous: PollActionResult,
  formData: FormData,
): Promise<PollActionResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const validation = validatePollInput({
    question: String(formData.get("question") ?? ""),
    options: formData.getAll("options").map(String),
    resultsIdentifiable: formData.get("resultsIdentifiable") !== null,
  });
  if (!validation.ok) {
    return validation;
  }

  let pollId = "";
  await getDb().transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({ talkId, type: "poll", status: "draft" })
      .returning({ id: activities.id });
    pollId = activity.id;
    await tx.insert(polls).values({
      activityId: pollId,
      question: validation.question,
      resultsIdentifiable: validation.resultsIdentifiable,
    });
    await tx.insert(pollOptions).values(
      validation.options.map((label, position) => ({
        pollId,
        label,
        position,
      })),
    );
  });

  revalidatePath(`/talks/${talkId}/activities`);
  redirect(`/talks/${talkId}/activities/${pollId}`);
}

/** Launch a draft poll. The partial unique index is the race backstop. */
export async function launchPollAction(
  pollId: string,
): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user?.email) {
    return { ok: false, error: "You need to sign in." };
  }
  const [activity] = await getDb()
    .select()
    .from(activities)
    .where(eq(activities.id, pollId))
    .limit(1);
  if (!activity) {
    return { ok: false, error: "Poll not found or you don't have access." };
  }
  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }
  const db = getDb();
  if (!canLaunch(activity.status as "draft" | "active" | "closed")) {
    return {
      ok: false,
      error: "This poll has already been launched or closed.",
    };
  }

  const [otherActive] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.talkId, activity.talkId),
        eq(activities.status, "active"),
        ne(activities.id, pollId),
      ),
    )
    .limit(1);
  if (otherActive) {
    return {
      ok: false,
      error: "Another poll is already active for this talk.",
    };
  }

  try {
    const updated = await db
      .update(activities)
      .set({ status: "active", launchedAt: new Date() })
      .where(and(eq(activities.id, pollId), eq(activities.status, "draft")))
      .returning({ id: activities.id });
    if (updated.length === 0) {
      return {
        ok: false,
        error: "This poll has already been launched or closed.",
      };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "Another poll is already active for this talk.",
      };
    }
    throw error;
  }

  revalidatePath(`/talks/${activity.talkId}`);
  revalidatePath(`/talks/${activity.talkId}/activities`);
  revalidatePath(`/talks/${activity.talkId}/activities/${pollId}`);
  return { ok: true };
}

/** Close an active poll. Closed polls stay read-only with results available. */
export async function closePollAction(
  pollId: string,
): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user?.email) {
    return { ok: false, error: "You need to sign in." };
  }
  const [activity] = await getDb()
    .select({ status: activities.status, talkId: activities.talkId })
    .from(activities)
    .where(eq(activities.id, pollId))
    .limit(1);
  if (!activity) {
    return { ok: false, error: "Poll not found or you don't have access." };
  }
  const guard = await requireTalkManager(activity.talkId);
  if (!guard.ok) {
    return guard;
  }
  if (!canClose(activity.status as "draft" | "active" | "closed")) {
    return { ok: false, error: "This poll is not active." };
  }

  const db = getDb();
  const [closedActivity] = await db
    .update(activities)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(activities.id, pollId), eq(activities.status, "active")))
    .returning({ id: activities.id, talkId: activities.talkId });
  if (!closedActivity) {
    return { ok: false, error: "This poll is not active." };
  }

  revalidatePath(`/talks/${closedActivity.talkId}`);
  revalidatePath(`/talks/${closedActivity.talkId}/activities`);
  revalidatePath(`/talks/${closedActivity.talkId}/activities/${pollId}`);
  revalidatePath(
    `/talks/${closedActivity.talkId}/activities/${pollId}/results`,
  );
  return { ok: true };
}

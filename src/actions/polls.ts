"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { activities, pollOptions, polls } from "@/db/schema";
import { validatePollInput } from "@/lib/polls";
import { requireTalkManager } from "@/lib/membership";

export type PollActionResult = { ok: boolean; error?: string };

/** Create a ready single-choice poll and its options atomically. */
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
      .values({ talkId, type: "poll", status: "ready" })
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

  updateTag(`activities:${talkId}`);
  revalidatePath(`/talks/${talkId}/activities`);
  redirect(`/talks/${talkId}/activities/${pollId}`);
}

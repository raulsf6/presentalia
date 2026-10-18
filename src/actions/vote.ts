"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { activities, pollOptions, pollVotes, polls } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { getSessionUser } from "@/lib/auth";
import { isRosteredAttendee } from "@/lib/membership";
import { canVote } from "@/lib/polls";

export type VoteResult = { ok: boolean; error?: string };

/** Submit an attendee's one immutable choice for an active poll. */
export async function submitVoteAction(
  pollId: string,
  optionId: string,
): Promise<VoteResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You need to sign in to vote." };
  }
  if (!user.email) {
    return { ok: false, error: "Your account has no email address." };
  }

  const voterEmail = user.email.trim().toLowerCase();
  const db = getDb();
  let outcome: { ok: true; talkId: string } | { ok: false; error: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [poll] = await tx
        .select({ status: activities.status, talkId: activities.talkId })
        .from(activities)
        .innerJoin(polls, eq(polls.activityId, activities.id))
        .where(eq(activities.id, pollId))
        .limit(1)
        .for("share", { of: activities });
      if (!poll) {
        return { ok: false, error: "You don't have access to this poll." };
      }
      if (!(await isRosteredAttendee(user, poll.talkId, tx))) {
        return { ok: false, error: "You don't have access to this poll." };
      }
      if (!canVote(poll.status as "draft" | "active" | "closed")) {
        return { ok: false, error: "This poll is not open for voting." };
      }

      const [option] = await tx
        .select({ id: pollOptions.id })
        .from(pollOptions)
        .where(
          and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, pollId)),
        )
        .limit(1)
        .for("share");
      if (!option) {
        return { ok: false, error: "This vote was not accepted." };
      }

      await tx.insert(pollVotes).values({
        pollId,
        userId: user.id,
        optionId,
        voterEmail,
      });
      return { ok: true, talkId: poll.talkId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "You have already voted in this poll." };
    }
    throw error;
  }
  if (!outcome.ok) {
    return outcome;
  }

  revalidatePath(`/talks/${outcome.talkId}/polls/${pollId}`);
  revalidatePath(`/talks/${outcome.talkId}/polls/${pollId}/results`);
  redirect(`/talks/${outcome.talkId}/polls/${pollId}/results`);
}

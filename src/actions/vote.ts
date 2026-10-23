"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { activities, pollOptions, pollVotes, polls } from "@/db/schema";
import { isUniqueViolation } from "@/lib/platform/db-errors";
import { resolveTalkAttendee } from "@/lib/talks/membership";
import { canVote } from "@/lib/activities/polls";

export type VoteResult = { ok: boolean; error?: string; talkId?: string };

/** Submit an attendee's one immutable choice for an active poll. */
export async function submitVoteAction(
  pollId: string,
  optionId: string,
): Promise<VoteResult> {
  const db = getDb();
  const [pollRef] = await db
    .select({ talkId: activities.talkId })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.id, pollId))
    .limit(1);
  if (!pollRef) {
    return { ok: false, error: "You don't have access to this poll." };
  }

  const attendee = await resolveTalkAttendee(pollRef.talkId);
  if (!attendee) {
    return { ok: false, error: "You don't have access to this poll." };
  }

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
      if (!canVote(poll.status as "ready" | "active" | "closed")) {
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
        userId: attendee.kind === "member" ? attendee.user.id : null,
        guestId: attendee.kind === "guest" ? attendee.guest.id : null,
        optionId,
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

  revalidatePath(`/talks/${outcome.talkId}/activities/${pollId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${pollId}/results`);
  // The client navigates to the results after playing the vote celebration,
  // so success returns the talk id instead of redirecting here.
  return { ok: true, talkId: outcome.talkId };
}

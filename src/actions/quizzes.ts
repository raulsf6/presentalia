"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { activities, quizOptions, quizVotes, quizzes } from "@/db/schema";
import { canVote, type ActivityStatus } from "@/lib/activities";
import { getSessionUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { isRosteredAttendee, requireTalkManager } from "@/lib/membership";
import { clearQuizResultsCache } from "@/lib/quiz-results";
import { validateQuizInput } from "@/lib/quizzes";

export type QuizActionResult = { ok: boolean; error?: string };
export type QuizVoteResult = { ok: boolean; error?: string; talkId?: string };

/** Create a draft quiz and its options atomically. */
export async function createQuizAction(
  talkId: string,
  _previous: QuizActionResult,
  formData: FormData,
): Promise<QuizActionResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const rawCorrect = formData.get("correctIndex");
  const correctIndex =
    typeof rawCorrect === "string" && rawCorrect.trim() !== ""
      ? Number(rawCorrect)
      : Number.NaN;
  const validation = validateQuizInput({
    question: String(formData.get("question") ?? ""),
    options: formData.getAll("options").map(String),
    correctIndex,
    resultsIdentifiable: formData.get("resultsIdentifiable") !== null,
  });
  if (!validation.ok) {
    return validation;
  }

  let quizId = "";
  await getDb().transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({ talkId, type: "quiz", status: "draft" })
      .returning({ id: activities.id });
    quizId = activity.id;
    await tx.insert(quizzes).values({
      activityId: quizId,
      question: validation.question,
      resultsIdentifiable: validation.resultsIdentifiable,
    });
    await tx.insert(quizOptions).values(
      validation.options.map((label, position) => ({
        quizId,
        label,
        position,
        isCorrect: position === validation.correctIndex,
      })),
    );
  });

  updateTag(`activities:${talkId}`);
  revalidatePath(`/talks/${talkId}/activities`);
  redirect(`/talks/${talkId}/activities/${quizId}`);
}

/** Submit an attendee's one immutable choice for an active quiz. */
export async function submitQuizVoteAction(
  quizId: string,
  optionId: string,
): Promise<QuizVoteResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You need to sign in to vote." };
  }

  const db = getDb();
  let outcome: { ok: true; talkId: string } | { ok: false; error: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [quiz] = await tx
        .select({ status: activities.status, talkId: activities.talkId })
        .from(activities)
        .innerJoin(quizzes, eq(quizzes.activityId, activities.id))
        .where(eq(activities.id, quizId))
        .limit(1)
        .for("share", { of: activities });
      if (!quiz) {
        return { ok: false, error: "You don't have access to this quiz." };
      }
      if (!(await isRosteredAttendee(user, quiz.talkId, tx))) {
        return { ok: false, error: "You don't have access to this quiz." };
      }
      if (!canVote(quiz.status as ActivityStatus)) {
        return { ok: false, error: "This quiz is not open for voting." };
      }

      const [option] = await tx
        .select({ id: quizOptions.id })
        .from(quizOptions)
        .where(
          and(eq(quizOptions.id, optionId), eq(quizOptions.quizId, quizId)),
        )
        .limit(1)
        .for("share");
      if (!option) {
        return { ok: false, error: "This vote was not accepted." };
      }

      await tx.insert(quizVotes).values({
        quizId,
        userId: user.id,
        optionId,
      });
      return { ok: true, talkId: quiz.talkId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "You have already voted in this quiz." };
    }
    throw error;
  }
  if (!outcome.ok) {
    return outcome;
  }

  clearQuizResultsCache(quizId);
  revalidatePath(`/talks/${outcome.talkId}/activities/${quizId}`);
  revalidatePath(`/talks/${outcome.talkId}/activities/${quizId}/results`);
  // The client navigates to the results after playing the vote celebration,
  // so success returns the talk id instead of redirecting here.
  return { ok: true, talkId: outcome.talkId };
}

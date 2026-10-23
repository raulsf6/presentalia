import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/db";
import {
  activities,
  pollOptions,
  pollVotes,
  polls,
  quizOptions,
  quizVotes,
  quizzes,
  textActivities,
  textAnswers,
} from "@/db/schema";
import {
  attendeeVoteKey,
  loadTalkAccess,
  type TalkAccess,
} from "@/lib/talks/membership";

export type ActivityDetail = {
  id: string;
  talkId: string;
  type: string;
  status: string;
};

export type ActivityPageContext = {
  access: TalkAccess;
  activity: ActivityDetail;
};

export type PollWorkspace = {
  question: string;
  resultsIdentifiable: boolean;
  options: { id: string; label: string }[];
};

export type QuizWorkspace = {
  question: string;
  resultsIdentifiable: boolean;
  options: { id: string; label: string; isCorrect: boolean }[];
};

export type TextWorkspace = {
  prompt: string;
  criteria: string;
  resultsIdentifiable: boolean;
};

/**
 * Loads an activity only when it belongs to the talk the caller is already
 * authorized to see. The talk check lives here so every page, route, and deck
 * path shares one ownership rule instead of repeating it.
 */
export async function loadActivityForTalk(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<ActivityDetail | null> {
  const [activity] = await db
    .select({
      id: activities.id,
      talkId: activities.talkId,
      type: activities.type,
      status: activities.status,
    })
    .from(activities)
    .where(
      and(eq(activities.id, activityId), eq(activities.talkId, access.talk.id)),
    )
    .limit(1);

  return activity ?? null;
}

/** Resolves request access and loads an activity owned by the requested talk. */
export async function loadActivityPageContext(
  talkId: string,
  activityId: string,
  db: Db = getDb(),
): Promise<ActivityPageContext | null> {
  const access = await loadTalkAccess(talkId, db);
  if (!access || access.talk.id !== talkId) {
    return null;
  }

  const activity = await loadActivityForTalk(access, activityId, db);
  return activity ? { access, activity } : null;
}

/** Loads the poll editor and vote page data for an authorized manager or attendee. */
export async function loadPollWorkspace(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<PollWorkspace | null> {
  const rows = await db
    .select({
      question: polls.question,
      resultsIdentifiable: polls.resultsIdentifiable,
      optionId: pollOptions.id,
      optionLabel: pollOptions.label,
    })
    .from(polls)
    .innerJoin(activities, eq(activities.id, polls.activityId))
    .leftJoin(pollOptions, eq(pollOptions.pollId, polls.activityId))
    .where(
      and(
        eq(polls.activityId, activityId),
        eq(activities.talkId, access.talk.id),
        eq(activities.type, "poll"),
      ),
    )
    .orderBy(asc(pollOptions.position));

  const poll = rows[0];
  if (!poll) {
    return null;
  }

  return {
    question: poll.question,
    resultsIdentifiable: poll.resultsIdentifiable,
    options: rows.flatMap((row) =>
      row.optionId && row.optionLabel
        ? [{ id: row.optionId, label: row.optionLabel }]
        : [],
    ),
  };
}

/** Loads the quiz editor and vote page data for an authorized manager or attendee. */
export async function loadQuizWorkspace(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<QuizWorkspace | null> {
  const rows = await db
    .select({
      question: quizzes.question,
      resultsIdentifiable: quizzes.resultsIdentifiable,
      optionId: quizOptions.id,
      optionLabel: quizOptions.label,
      isCorrect: quizOptions.isCorrect,
    })
    .from(quizzes)
    .innerJoin(activities, eq(activities.id, quizzes.activityId))
    .leftJoin(quizOptions, eq(quizOptions.quizId, quizzes.activityId))
    .where(
      and(
        eq(quizzes.activityId, activityId),
        eq(activities.talkId, access.talk.id),
        eq(activities.type, "quiz"),
      ),
    )
    .orderBy(asc(quizOptions.position));

  const quiz = rows[0];
  if (!quiz) {
    return null;
  }

  return {
    question: quiz.question,
    resultsIdentifiable: quiz.resultsIdentifiable,
    options: rows.flatMap((row) =>
      row.optionId && row.optionLabel
        ? [
            {
              id: row.optionId,
              label: row.optionLabel,
              isCorrect: row.isCorrect ?? false,
            },
          ]
        : [],
    ),
  };
}

/** Loads the free-text editor and answer page data for an authorized viewer. */
export async function loadTextWorkspace(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<TextWorkspace | null> {
  const [text] = await db
    .select({
      prompt: textActivities.prompt,
      criteria: textActivities.criteria,
      resultsIdentifiable: textActivities.resultsIdentifiable,
    })
    .from(textActivities)
    .innerJoin(activities, eq(activities.id, textActivities.activityId))
    .where(
      and(
        eq(textActivities.activityId, activityId),
        eq(activities.talkId, access.talk.id),
        eq(activities.type, "text"),
      ),
    )
    .limit(1);

  return text ?? null;
}

/** True when this attendee already has a poll vote on the activity. */
export async function hasPollVote(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const key = attendeeVoteKey(access);
  const [vote] = await db
    .select({ pollId: pollVotes.pollId })
    .from(pollVotes)
    .where(
      and(
        eq(pollVotes.pollId, activityId),
        "userId" in key
          ? eq(pollVotes.userId, key.userId)
          : eq(pollVotes.guestId, key.guestId),
      ),
    )
    .limit(1);

  return vote !== undefined;
}

/** True when this attendee already has a quiz vote on the activity. */
export async function hasQuizVote(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const key = attendeeVoteKey(access);
  const [vote] = await db
    .select({ quizId: quizVotes.quizId })
    .from(quizVotes)
    .where(
      and(
        eq(quizVotes.quizId, activityId),
        "userId" in key
          ? eq(quizVotes.userId, key.userId)
          : eq(quizVotes.guestId, key.guestId),
      ),
    )
    .limit(1);

  return vote !== undefined;
}

/** True when this attendee already submitted an answer to the text activity. */
export async function hasTextAnswer(
  access: TalkAccess,
  activityId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const key = attendeeVoteKey(access);
  const [answer] = await db
    .select({ id: textAnswers.id })
    .from(textAnswers)
    .where(
      and(
        eq(textAnswers.activityId, activityId),
        "userId" in key
          ? eq(textAnswers.userId, key.userId)
          : eq(textAnswers.guestId, key.guestId),
      ),
    )
    .limit(1);

  return answer !== undefined;
}

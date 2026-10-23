import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import {
  hasPollVote,
  hasQuizVote,
  hasTextAnswer,
  loadActivityForTalk,
  loadPollWorkspace,
  loadQuizWorkspace,
  loadTextWorkspace,
} from "@/lib/activities/activity-workspace";
import type { TalkAccess } from "@/lib/talks/membership";
import {
  createDb,
  exec,
  makeUser,
  seedPoll,
  seedQuiz,
  seedTalk,
  seedTextActivity,
  setStatus,
} from "../../db/harness";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  const talkId = await seedTalk(pglite, "Talk", [], owner.id);
  const otherTalkId = await seedTalk(pglite, "Other", [], owner.id);
  const access: TalkAccess = {
    user: { id: owner.id, email: owner.email, role: "presenter" },
    talk: { id: talkId } as TalkAccess["talk"],
    access: "presenter",
  };
  const otherAccess: TalkAccess = {
    ...access,
    talk: { id: otherTalkId } as TalkAccess["talk"],
  };

  return { pglite, db, talkId, otherTalkId, access, otherAccess };
}

function memberAccess(
  talkId: string,
  user: { id: string; email: string },
): TalkAccess {
  return {
    user: { ...user, role: "attendee" },
    talk: { id: talkId } as TalkAccess["talk"],
    access: "member",
  };
}

function guestAccess(talkId: string, guestId: string): TalkAccess {
  return {
    guest: { id: guestId, talkId, username: "Sam" },
    talk: { id: talkId } as TalkAccess["talk"],
    access: "guest",
  };
}

describe("loadActivityForTalk", () => {
  test("returns an activity that belongs to the authorized talk", async () => {
    const { pglite, db, talkId, access } = await setup();
    const { pollId } = await seedPoll(pglite, talkId);

    const activity = await loadActivityForTalk(access, pollId, db);

    expect(activity).toMatchObject({
      id: pollId,
      talkId,
      type: "poll",
      status: "ready",
    });
  });

  test("returns null when the activity belongs to another talk", async () => {
    const { pglite, db, talkId, otherAccess } = await setup();
    const { pollId } = await seedPoll(pglite, talkId);

    await expect(
      loadActivityForTalk(otherAccess, pollId, db),
    ).resolves.toBeNull();
  });

  test("returns null for an unknown activity", async () => {
    const { db, access } = await setup();

    await expect(
      loadActivityForTalk(access, crypto.randomUUID(), db),
    ).resolves.toBeNull();
  });
});

describe("loadPollWorkspace", () => {
  test("returns the question, privacy choice, and options in order", async () => {
    const { pglite, db, talkId, access } = await setup();
    const { pollId, optionIds } = await seedPoll(pglite, talkId, {
      options: ["Framework A", "Framework B"],
    });

    const workspace = await loadPollWorkspace(access, pollId, db);

    expect(workspace).toEqual({
      question: "Which framework wins?",
      resultsIdentifiable: false,
      options: [
        { id: optionIds[0], label: "Framework A" },
        { id: optionIds[1], label: "Framework B" },
      ],
    });
  });

  test("returns null when the poll belongs to another talk", async () => {
    const { pglite, db, talkId, otherAccess } = await setup();
    const { pollId } = await seedPoll(pglite, talkId);

    await expect(
      loadPollWorkspace(otherAccess, pollId, db),
    ).resolves.toBeNull();
  });

  test("returns null when the activity is not a poll", async () => {
    const { pglite, db, talkId, access } = await setup();
    const { pollId } = await seedPoll(pglite, talkId);
    await pglite.query(
      "update public.activities set type = 'quiz' where id = $1",
      [pollId],
    );

    await expect(loadPollWorkspace(access, pollId, db)).resolves.toBeNull();
  });
});

describe("loadQuizWorkspace", () => {
  test("returns options with their correctness for managers", async () => {
    const { pglite, db, talkId, access } = await setup();
    const { quizId, optionIds } = await seedQuiz(pglite, talkId, {
      options: ["Framework A", "Framework B"],
      correctIndex: 1,
    });

    const workspace = await loadQuizWorkspace(access, quizId, db);

    expect(workspace).toEqual({
      question: "Which framework is correct?",
      resultsIdentifiable: false,
      options: [
        { id: optionIds[0], label: "Framework A", isCorrect: false },
        { id: optionIds[1], label: "Framework B", isCorrect: true },
      ],
    });
  });

  test("returns null when the quiz belongs to another talk", async () => {
    const { pglite, db, talkId, otherAccess } = await setup();
    const { quizId } = await seedQuiz(pglite, talkId);

    await expect(
      loadQuizWorkspace(otherAccess, quizId, db),
    ).resolves.toBeNull();
  });
});

describe("loadTextWorkspace", () => {
  test("returns the prompt, ranking criterion, and privacy choice", async () => {
    const { pglite, db, talkId, access } = await setup();
    const activityId = await seedTextActivity(pglite, talkId, {
      prompt: "What is the best next step?",
      criteria: "Most actionable",
      identifiable: true,
    });

    await expect(loadTextWorkspace(access, activityId, db)).resolves.toEqual({
      prompt: "What is the best next step?",
      criteria: "Most actionable",
      resultsIdentifiable: true,
    });
  });

  test("returns null when the text activity belongs to another talk", async () => {
    const { pglite, db, talkId, otherAccess } = await setup();
    const activityId = await seedTextActivity(pglite, talkId);

    await expect(
      loadTextWorkspace(otherAccess, activityId, db),
    ).resolves.toBeNull();
  });
});

describe("attendee vote checks", () => {
  test("hasPollVote sees a member's own vote", async () => {
    const { pglite, db, talkId, access } = await setup();
    const { pollId, optionIds } = await seedPoll(pglite, talkId);
    const voter = await makeUser(pglite, "voter@example.com");
    const voterAccess = memberAccess(talkId, voter);

    await expect(hasPollVote(voterAccess, pollId, db)).resolves.toBe(false);

    await exec(
      pglite,
      "insert into public.poll_votes (poll_id, user_id, option_id) values ($1, $2, $3)",
      [pollId, voter.id, optionIds[0]],
    );

    await expect(hasPollVote(voterAccess, pollId, db)).resolves.toBe(true);
    await expect(hasPollVote(access, pollId, db)).resolves.toBe(false);
  });

  test("hasPollVote sees a guest's own vote", async () => {
    const { pglite, db, talkId } = await setup();
    const { pollId, optionIds } = await seedPoll(pglite, talkId);
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    await exec(
      pglite,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );

    await expect(
      hasPollVote(guestAccess(talkId, guestId), pollId, db),
    ).resolves.toBe(true);
  });

  test("hasQuizVote sees a member's own vote", async () => {
    const { pglite, db, talkId } = await setup();
    const { quizId, optionIds } = await seedQuiz(pglite, talkId);
    const voter = await makeUser(pglite, "voter@example.com");
    const voterAccess = memberAccess(talkId, voter);

    await expect(hasQuizVote(voterAccess, quizId, db)).resolves.toBe(false);

    await exec(
      pglite,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [quizId, voter.id, optionIds[0]],
    );

    await expect(hasQuizVote(voterAccess, quizId, db)).resolves.toBe(true);
  });

  test("hasTextAnswer sees a member's own answer", async () => {
    const { pglite, db, talkId } = await setup();
    const activityId = await seedTextActivity(pglite, talkId);
    const voter = await makeUser(pglite, "voter@example.com");
    const voterAccess = memberAccess(talkId, voter);

    await expect(hasTextAnswer(voterAccess, activityId, db)).resolves.toBe(
      false,
    );

    await setStatus(pglite, activityId, "active");
    await exec(
      pglite,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, $2, $3)",
      [activityId, voter.id, "Ship it"],
    );

    await expect(hasTextAnswer(voterAccess, activityId, db)).resolves.toBe(
      true,
    );
  });
});

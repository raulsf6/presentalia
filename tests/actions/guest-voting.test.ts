import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { submitQuizVoteAction } from "@/actions/quizzes";
import { submitTextAnswerAction } from "@/actions/text";
import { submitVoteAction } from "@/actions/vote";
import {
  createDb,
  exec,
  seedPoll,
  seedQuiz,
  seedTalk,
  seedTextActivity,
  setStatus,
} from "../db/harness";

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  getSessionUser: vi.fn(),
  readGuestSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: () => mocks.db,
}));

vi.mock("@/lib/auth/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/talks/guest-session", () => ({
  readGuestSession: mocks.readGuestSession,
}));

vi.mock("@/lib/activities/quiz-results", () => ({
  clearQuizResultsCache: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}));

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;

  const talkId = await seedTalk(pglite, "Talk", []);
  await exec(pglite, "update public.talks set is_public = true where id = $1", [
    talkId,
  ]);
  const guestId = crypto.randomUUID();
  await exec(
    pglite,
    `insert into public.talk_guests
       (id, talk_id, username, username_normalized, token_hash)
     values ($1, $2, 'Sam', 'sam', 'hash')`,
    [guestId, talkId],
  );
  const guest = { id: guestId, talkId, username: "Sam" };
  mocks.getSessionUser.mockResolvedValue(null);
  mocks.readGuestSession.mockResolvedValue(guest);

  const poll = await seedPoll(pglite, talkId);
  const quiz = await seedQuiz(pglite, talkId);
  const textId = await seedTextActivity(pglite, talkId);

  return { pglite, db, talkId, guestId, poll, quiz, textId };
}

describe("guest voting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("records a guest's poll vote", async () => {
    const f = await setup();
    await setStatus(f.pglite, f.poll.pollId, "active");

    const result = await submitVoteAction(f.poll.pollId, f.poll.optionIds[0]);

    expect(result).toMatchObject({ ok: true, talkId: f.talkId });
    const votes = await exec(
      f.pglite,
      "select user_id, guest_id, option_id from public.poll_votes where poll_id = $1",
      [f.poll.pollId],
    );
    expect(votes).toEqual([
      {
        user_id: null,
        guest_id: f.guestId,
        option_id: f.poll.optionIds[0],
      },
    ]);
  });

  test("refuses a guest's second poll vote", async () => {
    const f = await setup();
    await setStatus(f.pglite, f.poll.pollId, "active");
    await submitVoteAction(f.poll.pollId, f.poll.optionIds[0]);

    const again = await submitVoteAction(f.poll.pollId, f.poll.optionIds[1]);

    expect(again).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already voted/i),
    });
  });

  test("records a guest's quiz vote", async () => {
    const f = await setup();
    await setStatus(f.pglite, f.quiz.quizId, "active");

    const result = await submitQuizVoteAction(
      f.quiz.quizId,
      f.quiz.optionIds[0],
    );

    expect(result).toMatchObject({ ok: true, talkId: f.talkId });
    const votes = await exec(
      f.pglite,
      "select guest_id from public.quiz_votes where quiz_id = $1",
      [f.quiz.quizId],
    );
    expect(votes).toEqual([{ guest_id: f.guestId }]);
  });

  test("records a guest's text answer", async () => {
    const f = await setup();
    await setStatus(f.pglite, f.textId, "active");

    const result = await submitTextAnswerAction(
      f.textId,
      "Ship the small thing.",
    );

    expect(result).toMatchObject({ ok: true, talkId: f.talkId });
    const answers = await exec(
      f.pglite,
      "select user_id, guest_id, body from public.text_answers where activity_id = $1",
      [f.textId],
    );
    expect(answers).toEqual([
      {
        user_id: null,
        guest_id: f.guestId,
        body: "Ship the small thing.",
      },
    ]);
  });

  test("denies a guest when the guest session is no longer valid", async () => {
    const f = await setup();
    await setStatus(f.pglite, f.poll.pollId, "active");
    mocks.readGuestSession.mockResolvedValue(null);

    await expect(
      submitVoteAction(f.poll.pollId, f.poll.optionIds[0]),
    ).resolves.toMatchObject({ ok: false });
    const votes = await exec(f.pglite, "select poll_id from public.poll_votes");
    expect(votes).toHaveLength(0);
  });
});

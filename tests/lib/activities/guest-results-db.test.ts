import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { GuestTalkAccess } from "@/lib/talks/membership";
import { clearPollResultsCache, loadPollResults } from "@/lib/activities/poll-results";
import { clearQuizResultsCache, loadQuizResults } from "@/lib/activities/quiz-results";
import { loadTextResults } from "@/lib/activities/text-results";
import {
  createDb,
  exec,
  seedPoll,
  seedQuiz,
  seedTalk,
  seedTextActivity,
  setStatus,
} from "../../db/harness";

function guestAccess(talkId: string, guestId: string): GuestTalkAccess {
  return {
    access: "guest",
    talk: { id: talkId } as GuestTalkAccess["talk"],
    guest: { id: guestId, talkId, username: "Sam" },
  };
}

describe("guest results", () => {
  beforeEach(() => {
    clearPollResultsCache();
    clearQuizResultsCache();
  });

  test("shows a guest's username as the poll voter name in identifiable mode", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", []);
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    const { pollId, optionIds } = await seedPoll(pglite, talkId, {
      identifiable: true,
    });
    await setStatus(pglite, pollId, "active");
    await exec(
      pglite,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );

    const payload = await loadPollResults(
      pollId,
      guestAccess(talkId, guestId),
      {
        db,
      },
    );

    expect(payload?.voters).toEqual([{ optionId: optionIds[0], name: "Sam" }]);
  });

  test("recognizes a guest's quiz vote and shows their name when identifiable", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", []);
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    const { quizId, optionIds } = await seedQuiz(pglite, talkId, {
      identifiable: true,
    });
    await setStatus(pglite, quizId, "active");
    await exec(
      pglite,
      "insert into public.quiz_votes (quiz_id, guest_id, option_id) values ($1, $2, $3)",
      [quizId, guestId, optionIds[0]],
    );

    const payload = await loadQuizResults(
      quizId,
      guestAccess(talkId, guestId),
      {
        db,
      },
    );

    expect(payload?.needsVote).toBe(false);
    expect(payload?.showResults).toBe(true);
    expect(payload?.viewer).toBeNull();
    expect(payload?.voters).toEqual([{ optionId: optionIds[0], name: "Sam" }]);

    clearQuizResultsCache();
    await setStatus(pglite, quizId, "closed");
    const closed = await loadQuizResults(quizId, guestAccess(talkId, guestId), {
      db,
    });
    expect(closed?.viewer).toEqual({
      optionId: optionIds[0],
      correct: true,
    });
  });

  test("recognizes a guest's text answer and shows their name when identifiable", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", []);
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    const activityId = await seedTextActivity(pglite, talkId, {
      status: "active",
      identifiable: true,
    });
    await exec(
      pglite,
      "insert into public.text_answers (activity_id, guest_id, body) values ($1, $2, 'Guest answer')",
      [activityId, guestId],
    );
    await setStatus(pglite, activityId, "closed");

    const payload = await loadTextResults(
      activityId,
      guestAccess(talkId, guestId),
      { db },
    );

    expect(payload?.viewer.hasAnswered).toBe(true);
    expect(payload?.rows).toEqual([
      {
        answerId: expect.any(String),
        rank: null,
        body: "Guest answer",
        rationale: null,
        name: "Sam",
      },
    ]);
  });

  test("keeps guest names out of anonymous and projector results", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", []);
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    const { pollId, optionIds } = await seedPoll(pglite, talkId);
    await setStatus(pglite, pollId, "active");
    await exec(
      pglite,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );

    const anonymous = await loadPollResults(
      pollId,
      guestAccess(talkId, guestId),
      { db },
    );

    expect(anonymous?.voters).toBeNull();
    expect(JSON.stringify(anonymous)).not.toContain("Sam");
  });
});

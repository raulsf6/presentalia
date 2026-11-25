import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { talks } from "@/db/schema";
import { loadDeckActivity } from "@/lib/deck/deck-activity";
import type { TalkAccess } from "@/lib/talks/membership";
import {
  createDb,
  makeUser,
  seedCloudActivity,
  seedPoll,
  seedQuiz,
  seedTalk,
  setStatus,
  type Db as TestDb,
} from "../../db/harness";

let pglite: TestDb;
let db: Db;
let ownerId: string;

beforeAll(async () => {
  pglite = await createDb();
  db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  ownerId = owner.id;
});

async function managerAccess(talkId: string): Promise<TalkAccess> {
  const [talk] = await db.select().from(talks).where(eq(talks.id, talkId));
  return {
    access: "presenter",
    user: { id: ownerId, email: "owner@example.com", role: "presenter" },
    talk,
  };
}

describe("loadDeckActivity", () => {
  test("serves a ready poll's question and options", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const { pollId } = await seedPoll(pglite, talkId);

    const result = await loadDeckActivity(
      talkId,
      pollId,
      await managerAccess(talkId),
      { db },
    );

    if (result?.type !== "poll") throw new Error("expected a poll");
    expect(result.payload.poll.question).toBe("Which framework wins?");
    expect(result.payload.rows.map((row) => row.label)).toEqual([
      "LangGraph",
      "CrewAI",
    ]);
    expect(result.payload.total).toBe(0);
  });

  test("serves a ready quiz without its tally or answer", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const { quizId } = await seedQuiz(pglite, talkId);

    const result = await loadDeckActivity(
      talkId,
      quizId,
      await managerAccess(talkId),
      { db },
    );

    if (result?.type !== "quiz") throw new Error("expected a quiz");
    expect(result.payload.quiz.question).toBe("Which framework is correct?");
    expect(result.payload.total).toBeNull();
    expect(result.payload.quiz.correctOptionId).toBeNull();
  });

  test("serves a ready idea cloud's prompt", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const activityId = await seedCloudActivity(pglite, talkId, {
      prompt: "What should we improve next?",
    });

    const result = await loadDeckActivity(
      talkId,
      activityId,
      await managerAccess(talkId),
      { db },
    );

    if (result?.type !== "cloud") throw new Error("expected an idea cloud");
    expect(result.payload.activity.prompt).toBe("What should we improve next?");
    expect(result.payload.activity.status).toBe("ready");
    expect(result.payload.items).toEqual([]);
  });

  test("refuses an activity from another talk", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const otherTalk = await seedTalk(pglite, "Other talk", [], ownerId);
    const { pollId } = await seedPoll(pglite, otherTalk);

    const result = await loadDeckActivity(
      talkId,
      pollId,
      await managerAccess(talkId),
      { db },
    );

    expect(result).toBeNull();
  });

  test("returns null for an unknown activity", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const result = await loadDeckActivity(
      talkId,
      crypto.randomUUID(),
      await managerAccess(talkId),
      { db },
    );
    expect(result).toBeNull();
  });

  test("bypasses cached counts when fresh is requested", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const { pollId, optionIds } = await seedPoll(pglite, talkId);
    await setStatus(pglite, pollId, "active");
    const access = await managerAccess(talkId);

    const first = await loadDeckActivity(talkId, pollId, access, { db });
    if (first?.type !== "poll") throw new Error("expected a poll");
    expect(first.payload.total).toBe(0);

    const voter = await makeUser(pglite, "voter@example.com");
    await pglite.query(
      `insert into public.poll_votes (poll_id, user_id, option_id)
       values ($1, $2, $3)`,
      [pollId, voter.id, optionIds[0]],
    );

    const cached = await loadDeckActivity(talkId, pollId, access, { db });
    if (cached?.type !== "poll") throw new Error("expected a poll");
    expect(cached.payload.total).toBe(0);

    const fresh = await loadDeckActivity(talkId, pollId, access, {
      db,
      fresh: true,
    });
    if (fresh?.type !== "poll") throw new Error("expected a poll");
    expect(fresh.payload.total).toBe(1);
  });
});

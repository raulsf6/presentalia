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
  seedPoll,
  seedQuiz,
  seedTalk,
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
      db,
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
      db,
    );

    if (result?.type !== "quiz") throw new Error("expected a quiz");
    expect(result.payload.quiz.question).toBe("Which framework is correct?");
    expect(result.payload.total).toBeNull();
    expect(result.payload.quiz.correctOptionId).toBeNull();
  });

  test("refuses an activity from another talk", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const otherTalk = await seedTalk(pglite, "Other talk", [], ownerId);
    const { pollId } = await seedPoll(pglite, otherTalk);

    const result = await loadDeckActivity(
      talkId,
      pollId,
      await managerAccess(talkId),
      db,
    );

    expect(result).toBeNull();
  });

  test("returns null for an unknown activity", async () => {
    const talkId = await seedTalk(pglite, "Deck talk", [], ownerId);
    const result = await loadDeckActivity(
      talkId,
      crypto.randomUUID(),
      await managerAccess(talkId),
      db,
    );
    expect(result).toBeNull();
  });
});

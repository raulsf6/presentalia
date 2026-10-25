import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { loadTalkActivities } from "@/lib/activities/talk-activities";
import { createDb, seedPoll, seedTalk, setStatus } from "../../db/harness";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const talkId = await seedTalk(pglite, "Talk", []);
  const otherTalkId = await seedTalk(pglite, "Other", []);
  const { pollId } = await seedPoll(pglite, talkId);

  return { pglite, db, talkId, otherTalkId, pollId };
}

describe("loadTalkActivities", () => {
  test("returns a talk's activity summaries and reflects status changes immediately", async () => {
    const { pglite, db, talkId, otherTalkId, pollId } = await setup();

    const first = await loadTalkActivities(talkId, db);
    expect(first).toEqual([
      {
        id: pollId,
        type: "poll",
        status: "ready",
        question: "Which framework wins?",
        createdAt: expect.any(Date),
      },
    ]);

    await setStatus(pglite, pollId, "active");
    const second = await loadTalkActivities(talkId, db);
    expect(second[0]?.status).toBe("active");

    await expect(loadTalkActivities(otherTalkId, db)).resolves.toEqual([]);
  });
});

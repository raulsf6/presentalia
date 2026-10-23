import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkAccess } from "@/lib/talks/membership";
import { createDb, makeUser, seedPoll, seedTalk } from "../../db/harness";

const { loadTalkAccessMock } = vi.hoisted(() => ({
  loadTalkAccessMock: vi.fn(),
}));

vi.mock("@/lib/talks/membership", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/talks/membership")>();
  return { ...actual, loadTalkAccess: loadTalkAccessMock };
});

import { loadActivityPageContext } from "@/lib/activities/activity-workspace";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  const talkId = await seedTalk(pglite, "Talk", [], owner.id);
  const access: TalkAccess = {
    user: { id: owner.id, email: owner.email, role: "presenter" },
    talk: { id: talkId } as TalkAccess["talk"],
    access: "presenter",
  };
  const { pollId } = await seedPoll(pglite, talkId);

  return { db, talkId, pollId, access };
}

beforeEach(() => {
  loadTalkAccessMock.mockReset();
});

describe("loadActivityPageContext", () => {
  test("returns verified talk access together with the activity", async () => {
    const { db, talkId, pollId, access } = await setup();
    loadTalkAccessMock.mockResolvedValue(access);

    const context = await loadActivityPageContext(talkId, pollId, db);

    expect(loadTalkAccessMock).toHaveBeenCalledWith(talkId, db);
    expect(context).toEqual({
      access,
      activity: {
        id: pollId,
        talkId,
        type: "poll",
        status: "ready",
      },
    });
  });

  test("returns null without querying activity data when access is denied", async () => {
    const { db, talkId, pollId } = await setup();
    loadTalkAccessMock.mockResolvedValue(null);

    await expect(
      loadActivityPageContext(talkId, pollId, db),
    ).resolves.toBeNull();
  });

  test("rejects access resolved for a different talk", async () => {
    const { db, pollId, access } = await setup();
    loadTalkAccessMock.mockResolvedValue(access);

    const requestedTalkId = crypto.randomUUID();
    await expect(
      loadActivityPageContext(requestedTalkId, pollId, db),
    ).resolves.toBeNull();
    expect(loadTalkAccessMock).toHaveBeenCalledWith(requestedTalkId, db);
  });
});

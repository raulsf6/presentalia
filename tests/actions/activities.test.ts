import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import {
  closeActivityAction,
  launchActivityAction,
} from "@/actions/activities";
import {
  createDb,
  makeUser,
  seedPoll,
  seedTalk,
  setStatus,
} from "../db/harness";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  getSessionUser: vi.fn(),
  requireTalkManager: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  publishActivityStatusChanged: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/auth/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/talks/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
}));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/platform/live-event-bus", () => ({
  publishActivityStatusChanged: mocks.publishActivityStatusChanged,
}));

async function setup(status: "ready" | "active" = "ready") {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;
  const owner = await makeUser(pglite, "owner@example.com");
  const talkId = await seedTalk(pglite, "Talk", [], owner.id);
  const poll = await seedPoll(pglite, talkId);
  if (status === "active") {
    await setStatus(pglite, poll.pollId, "active");
  }
  mocks.getSessionUser.mockResolvedValue({
    ...owner,
    role: "presenter",
  });
  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: { ...owner, role: "presenter" },
    talk: { id: talkId },
    access: "presenter",
  });
  return { pglite, talkId, activityId: poll.pollId };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("activity push notifications", () => {
  test("launch invalidates the activity cache before signalling the talk", async () => {
    const { pglite, talkId, activityId } = await setup();

    const result = await launchActivityAction(activityId);

    expect(result).toEqual({ ok: true });
    const activity = await pglite.query(
      "select status from public.activities where id = $1",
      [activityId],
    );
    expect(activity.rows[0]).toEqual({ status: "active" });
    expect(mocks.publishActivityStatusChanged).toHaveBeenCalledWith(talkId, {
      activityId,
    });

    const cacheOrder = mocks.updateTag.mock.invocationCallOrder[0];
    const pushOrder =
      mocks.publishActivityStatusChanged.mock.invocationCallOrder[0];
    expect(cacheOrder).toBeLessThan(pushOrder);
  });

  test("close invalidates the activity cache before signalling the talk", async () => {
    const { pglite, talkId, activityId } = await setup("active");

    const result = await closeActivityAction(activityId);

    expect(result).toEqual({ ok: true });
    const activity = await pglite.query(
      "select status from public.activities where id = $1",
      [activityId],
    );
    expect(activity.rows[0]).toEqual({ status: "closed" });
    expect(mocks.publishActivityStatusChanged).toHaveBeenCalledWith(talkId, {
      activityId,
    });

    const cacheOrder = mocks.updateTag.mock.invocationCallOrder[0];
    const pushOrder =
      mocks.publishActivityStatusChanged.mock.invocationCallOrder[0];
    expect(cacheOrder).toBeLessThan(pushOrder);
  });

  test("a rejected launch does not signal the talk", async () => {
    const { activityId } = await setup();
    mocks.requireTalkManager.mockResolvedValue({
      ok: false,
      error: "You can't manage this talk.",
    });

    const result = await launchActivityAction(activityId);

    expect(result.ok).toBe(false);
    expect(mocks.publishActivityStatusChanged).not.toHaveBeenCalled();
  });
});

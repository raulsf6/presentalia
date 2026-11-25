import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  requireTalkManager: vi.fn(),
  resolveTalkAttendee: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  publishActivityResultsChanged: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/talks/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
  resolveTalkAttendee: mocks.resolveTalkAttendee,
}));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/platform/live-event-bus", () => ({
  publishActivityResultsChanged: mocks.publishActivityResultsChanged,
}));

import {
  createCloudActivityAction,
  submitCloudAnswerAction,
} from "@/actions/cloud";
import { createDb, makeUser, seedCloudActivity, seedTalk } from "../db/harness";

type Setup = {
  pglite: Awaited<ReturnType<typeof createDb>>;
  db: Db;
  talkId: string;
  activityId: string;
  member: { id: string; email: string };
  memberViewer: SessionUser;
};

async function setup(status: "ready" | "active" | "closed" = "active") {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;

  const owner = await makeUser(pglite, "owner@example.com");
  const member = await makeUser(pglite, "member@example.com");
  const talkId = await seedTalk(pglite, "Talk", [member.email], owner.id);
  const activityId = await seedCloudActivity(pglite, talkId, { status });
  const memberViewer: SessionUser = {
    id: member.id,
    email: member.email,
    role: "attendee",
  };

  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: { id: owner.id, email: owner.email, role: "presenter" },
    talk: { id: talkId },
    access: "presenter",
  });
  mocks.resolveTalkAttendee.mockResolvedValue({
    kind: "member",
    user: memberViewer,
  });

  return {
    pglite,
    db,
    talkId,
    activityId,
    member,
    memberViewer,
  } satisfies Setup;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockReturnValue(undefined);
});

describe("createCloudActivityAction", () => {
  test("creates a ready cloud and its question", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    mocks.db = db;
    const owner = await makeUser(pglite, "owner@example.com");
    const talkId = await seedTalk(pglite, "Talk", [], owner.id);
    mocks.requireTalkManager.mockResolvedValue({
      ok: true,
      user: { id: owner.id, email: owner.email, role: "presenter" },
      talk: { id: talkId },
      access: "presenter",
    });

    const form = new FormData();
    form.set("prompt", "  What should we improve next?  ");

    await createCloudActivityAction(talkId, { ok: true }, form);

    const rows = await pglite.query(
      `select a.id, a.type, a.status, c.prompt
       from public.activities a
       join public.cloud_activities c on c.activity_id = a.id
       where a.talk_id = $1`,
      [talkId],
    );
    expect(rows.rows[0]).toMatchObject({
      type: "cloud",
      status: "ready",
      prompt: "What should we improve next?",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/talks/${talkId}/activities/${(rows.rows[0] as { id: string }).id}`,
    );
  });
});

describe("submitCloudAnswerAction", () => {
  test("stores one idea and returns the talk id", async () => {
    const f = await setup("active");

    const result = await submitCloudAnswerAction(
      f.activityId,
      "  Better   onboarding!  ",
    );

    expect(result).toEqual({ ok: true, talkId: f.talkId });
    const rows = await f.pglite.query(
      "select user_id, guest_id, body from public.cloud_answers where activity_id = $1",
      [f.activityId],
    );
    expect(rows.rows[0]).toEqual({
      user_id: f.member.id,
      guest_id: null,
      body: "Better onboarding",
    });
    expect(mocks.publishActivityResultsChanged).toHaveBeenCalledWith(
      f.talkId,
      f.activityId,
    );
  });

  test("rejects a second submission from the same attendee", async () => {
    const f = await setup("active");

    await submitCloudAnswerAction(f.activityId, "Better onboarding");
    const second = await submitCloudAnswerAction(
      f.activityId,
      "Faster responses",
    );

    expect(second.ok).toBe(false);
    expect(second.ok ? null : second.errorKey).toBe(
      "errors.cloud.alreadySubmitted",
    );
  });

  test("rejects submissions after the activity closes", async () => {
    const f = await setup("closed");

    const result = await submitCloudAnswerAction(
      f.activityId,
      "Better onboarding",
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errorKey).toBe(
      "errors.cloud.notAccepting",
    );
  });

  test("stores a guest idea under the guest identity", async () => {
    const f = await setup("active");
    const guestId = crypto.randomUUID();
    await f.pglite.query(
      "insert into public.talk_guests (id, talk_id, username, username_normalized, token_hash) values ($1, $2, $3, $4, $5)",
      [guestId, f.talkId, "Sam", "sam", `hash-${guestId}`],
    );
    const guest = { id: guestId, talkId: f.talkId, username: "Sam" };
    mocks.resolveTalkAttendee.mockResolvedValue({
      kind: "guest",
      guest,
    });

    const result = await submitCloudAnswerAction(f.activityId, "Voice");

    expect(result).toEqual({ ok: true, talkId: f.talkId });
    const rows = await f.pglite.query(
      "select user_id, guest_id, body from public.cloud_answers where activity_id = $1",
      [f.activityId],
    );
    expect(rows.rows[0]).toEqual({
      user_id: null,
      guest_id: guest.id,
      body: "Voice",
    });
  });
});

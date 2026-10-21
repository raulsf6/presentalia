import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import {
  joinPublicTalkAction,
  removeTalkGuestAction,
  setAnonymousJoinOpenAction,
  setTalkPublicAction,
} from "@/actions/anonymous-access";
import { hashGuestToken } from "@/lib/talk-guests";
import { createDb, exec, seedPoll, seedTalk, setStatus } from "../db/harness";

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  setGuestCookie: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireTalkManager: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: () => mocks.db,
}));

vi.mock("@/lib/guest-session", () => ({
  setGuestCookie: mocks.setGuestCookie,
}));

vi.mock("@/lib/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}));

async function setup({
  isPublic = true,
  joinOpen = true,
}: { isPublic?: boolean; joinOpen?: boolean } = {}) {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;
  const talkId = await seedTalk(pglite, "Talk", []);
  await exec(
    pglite,
    "update public.talks set is_public = $1, anonymous_join_open = $2 where id = $3",
    [isPublic, joinOpen, talkId],
  );
  return { pglite, db, talkId };
}

function form(username: string): FormData {
  const data = new FormData();
  data.set("username", username);
  return data;
}

describe("joinPublicTalkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a guest, sets the cookie, and redirects to the talk", async () => {
    const { pglite, talkId } = await setup();

    const result = await joinPublicTalkAction(
      talkId,
      { ok: true },
      form(" Sam "),
    );

    expect(result).toEqual({ ok: true });
    const guests = await exec(
      pglite,
      "select id, username, username_normalized, token_hash from public.talk_guests where talk_id = $1",
      [talkId],
    );
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({
      username: "Sam",
      username_normalized: "sam",
    });
    expect(mocks.setGuestCookie).toHaveBeenCalledTimes(1);
    const [, guestId, token] = mocks.setGuestCookie.mock.calls[0];
    expect(guestId).toBe(guests[0]?.id);
    expect(guests[0]?.token_hash).toBe(hashGuestToken(token));
    expect(mocks.redirect).toHaveBeenCalledWith(`/talks/${talkId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/talks/${talkId}/roster`,
    );
  });

  test("refuses a talk that is not public", async () => {
    const { pglite, talkId } = await setup({ isPublic: false });

    const result = await joinPublicTalkAction(
      talkId,
      { ok: true },
      form("Sam"),
    );

    expect(result).toMatchObject({ ok: false });
    expect(mocks.setGuestCookie).not.toHaveBeenCalled();
    const guests = await exec(pglite, "select id from public.talk_guests");
    expect(guests).toHaveLength(0);
  });

  test("refuses new guests once joining is closed", async () => {
    const { pglite, talkId } = await setup({ joinOpen: false });

    const result = await joinPublicTalkAction(
      talkId,
      { ok: true },
      form("Sam"),
    );

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(/closed/i),
    });
    expect(mocks.setGuestCookie).not.toHaveBeenCalled();
    const guests = await exec(pglite, "select id from public.talk_guests");
    expect(guests).toHaveLength(0);
  });

  test("refuses a username already used in the talk", async () => {
    const { pglite, talkId } = await setup();
    await exec(
      pglite,
      `insert into public.talk_guests
         (talk_id, username, username_normalized, token_hash)
       values ($1, 'Sam', 'sam', 'hash')`,
      [talkId],
    );

    const result = await joinPublicTalkAction(
      talkId,
      { ok: true },
      form("SAM"),
    );

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(/taken/i),
    });
    expect(mocks.setGuestCookie).not.toHaveBeenCalled();
  });

  test("refuses an invalid username without touching the database", async () => {
    const { pglite, talkId } = await setup();

    const result = await joinPublicTalkAction(talkId, { ok: true }, form("s@"));

    expect(result).toMatchObject({ ok: false });
    expect(mocks.setGuestCookie).not.toHaveBeenCalled();
    const guests = await exec(pglite, "select id from public.talk_guests");
    expect(guests).toHaveLength(0);
  });
});

describe("talk access switches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTalkManager.mockResolvedValue({
      ok: true,
      user: { id: "presenter", email: "p@example.com", role: "presenter" },
      talk: { id: "talk", isPublic: true },
      access: "presenter",
    });
  });

  test("turning public on reopens joining", async () => {
    const { pglite, talkId } = await setup({
      isPublic: false,
      joinOpen: false,
    });

    const result = await setTalkPublicAction(talkId, true);

    expect(result).toEqual({ ok: true });
    const rows = await exec(
      pglite,
      "select is_public, anonymous_join_open from public.talks where id = $1",
      [talkId],
    );
    expect(rows[0]).toEqual({ is_public: true, anonymous_join_open: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/talks/${talkId}/roster`,
    );
  });

  test("closing joining keeps the talk public", async () => {
    const { pglite, talkId } = await setup();

    const result = await setAnonymousJoinOpenAction(talkId, false);

    expect(result).toEqual({ ok: true });
    const rows = await exec(
      pglite,
      "select is_public, anonymous_join_open from public.talks where id = $1",
      [talkId],
    );
    expect(rows[0]).toEqual({ is_public: true, anonymous_join_open: false });
  });

  test("joining cannot be opened on a private talk", async () => {
    const { pglite, talkId } = await setup({
      isPublic: false,
      joinOpen: false,
    });
    mocks.requireTalkManager.mockResolvedValue({
      ok: true,
      user: { id: "presenter", email: "p@example.com", role: "presenter" },
      talk: { id: talkId, isPublic: false },
      access: "presenter",
    });

    const result = await setAnonymousJoinOpenAction(talkId, true);

    expect(result).toMatchObject({ ok: false });
    const rows = await exec(
      pglite,
      "select anonymous_join_open from public.talks where id = $1",
      [talkId],
    );
    expect(rows[0]?.anonymous_join_open).toBe(false);
  });

  test("a non-manager cannot change access", async () => {
    const { pglite, talkId } = await setup({
      isPublic: false,
      joinOpen: false,
    });
    mocks.requireTalkManager.mockResolvedValue({
      ok: false,
      error: "You can't manage this talk.",
    });

    const result = await setTalkPublicAction(talkId, true);

    expect(result).toMatchObject({ ok: false });
    const rows = await exec(
      pglite,
      "select is_public from public.talks where id = $1",
      [talkId],
    );
    expect(rows[0]?.is_public).toBe(false);
  });
});

describe("removeTalkGuestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTalkManager.mockResolvedValue({
      ok: true,
      user: { id: "presenter", email: "p@example.com", role: "presenter" },
      talk: { id: "talk", isPublic: true },
      access: "presenter",
    });
  });

  test("removes the guest, their vote, and keeps the tally accurate", async () => {
    const { pglite, talkId } = await setup();
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

    const result = await removeTalkGuestAction(talkId, guestId);

    expect(result).toEqual({ ok: true });
    const guests = await exec(
      pglite,
      "select id from public.talk_guests where id = $1",
      [guestId],
    );
    const votes = await exec(
      pglite,
      "select poll_id from public.poll_votes where poll_id = $1",
      [pollId],
    );
    const counts = await exec(
      pglite,
      "select votes from public.poll_vote_counts where poll_id = $1 and option_id = $2",
      [pollId, optionIds[0]],
    );
    expect(guests).toHaveLength(0);
    expect(votes).toHaveLength(0);
    expect(Number(counts[0]?.votes)).toBe(0);
  });

  test("will not remove a guest from another talk", async () => {
    const { pglite, talkId } = await setup();
    const otherTalkId = await seedTalk(pglite, "Other", []);
    const otherGuestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Alex', 'alex', 'hash')`,
      [otherGuestId, otherTalkId],
    );

    const result = await removeTalkGuestAction(talkId, otherGuestId);

    expect(result).toMatchObject({ ok: false });
    const guests = await exec(
      pglite,
      "select id from public.talk_guests where id = $1",
      [otherGuestId],
    );
    expect(guests).toHaveLength(1);
  });

  test("rejects a non-manager", async () => {
    const { pglite, talkId } = await setup();
    const guestId = crypto.randomUUID();
    await exec(
      pglite,
      `insert into public.talk_guests
         (id, talk_id, username, username_normalized, token_hash)
       values ($1, $2, 'Sam', 'sam', 'hash')`,
      [guestId, talkId],
    );
    mocks.requireTalkManager.mockResolvedValue({
      ok: false,
      error: "You can't manage this talk.",
    });

    const result = await removeTalkGuestAction(talkId, guestId);

    expect(result).toMatchObject({ ok: false });
    const guests = await exec(
      pglite,
      "select id from public.talk_guests where id = $1",
      [guestId],
    );
    expect(guests).toHaveLength(1);
  });
});

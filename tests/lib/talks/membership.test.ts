import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";
import {
  attendeeVoteKey,
  getTalkAccessForGuest,
  getTalkAccessForUser,
  isAttendee,
  isManager,
  loadTalkAccess,
  requireTalkManager,
  resolveTalkAttendee,
} from "@/lib/talks/membership";
import {
  createDb,
  exec,
  makeUser,
  seedTalk,
  type Db as TestDb,
} from "../../db/harness";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  readGuestSession: vi.fn(),
  db: null as unknown,
}));

vi.mock("@/lib/auth/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/talks/guest-session", () => ({
  readGuestSession: mocks.readGuestSession,
}));

vi.mock("@/db", () => ({
  getDb: () => mocks.db,
}));

type Setup = {
  db: Db;
  pglite: TestDb;
  talkId: string;
  owner: { id: string; email: string };
  invited: { id: string; email: string };
  attendee: { id: string; email: string };
  outsider: { id: string; email: string };
};

function sessionUser(
  user: { id: string; email: string },
  role: SessionUser["role"],
): SessionUser {
  return { id: user.id, email: user.email, role };
}

async function setup(): Promise<Setup> {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;

  const owner = await makeUser(pglite, "owner@example.com");
  const invited = await makeUser(pglite, "invited@example.com");
  const attendee = await makeUser(pglite, "attendee@example.com");
  const outsider = await makeUser(pglite, "outsider@example.com");

  const talkId = await seedTalk(pglite, "Talk", [attendee.email], owner.id);
  await exec(
    pglite,
    "insert into public.talk_roster (talk_id, user_id) values ($1, $2)",
    [talkId, invited.id],
  );

  return { db, pglite, talkId, owner, invited, attendee, outsider };
}

describe("getTalkAccessForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("gives admins access to any talk", async () => {
    const { db, talkId } = await setup();
    const admin: SessionUser = {
      id: crypto.randomUUID(),
      email: "admin@example.com",
      role: "admin",
    };

    const access = await getTalkAccessForUser(admin, talkId, db);

    expect(access).toMatchObject({ access: "admin", talk: { id: talkId } });
  });

  test("gives presenters owner access to talks they created", async () => {
    const { db, talkId, owner } = await setup();

    const access = await getTalkAccessForUser(
      sessionUser(owner, "presenter"),
      talkId,
      db,
    );

    expect(access).toMatchObject({ access: "presenter", talk: { id: talkId } });
  });

  test("gives rostered presenters member access", async () => {
    const { db, talkId, invited } = await setup();

    const access = await getTalkAccessForUser(
      sessionUser(invited, "presenter"),
      talkId,
      db,
    );

    expect(access).toMatchObject({ access: "member", talk: { id: talkId } });
  });

  test("gives rostered attendees member access", async () => {
    const { db, talkId, attendee } = await setup();

    const access = await getTalkAccessForUser(
      sessionUser(attendee, "attendee"),
      talkId,
      db,
    );

    expect(access).toMatchObject({ access: "member", talk: { id: talkId } });
  });

  test("denies presenters and attendees who are not on the roster", async () => {
    const { db, talkId, outsider } = await setup();

    await expect(
      getTalkAccessForUser(sessionUser(outsider, "presenter"), talkId, db),
    ).resolves.toBeNull();
    await expect(
      getTalkAccessForUser(sessionUser(outsider, "attendee"), talkId, db),
    ).resolves.toBeNull();
  });

  test("returns null for a missing talk", async () => {
    const { db, outsider } = await setup();

    await expect(
      getTalkAccessForUser(
        sessionUser(outsider, "attendee"),
        crypto.randomUUID(),
        db,
      ),
    ).resolves.toBeNull();
  });
});

describe("loadTalkAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses the current session user", async () => {
    const { talkId, owner } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(owner, "presenter"));

    await expect(loadTalkAccess(talkId)).resolves.toMatchObject({
      access: "presenter",
      talk: { id: talkId },
    });
  });

  test("returns null without a session", async () => {
    const { talkId } = await setup();
    mocks.getSessionUser.mockResolvedValue(null);

    await expect(loadTalkAccess(talkId)).resolves.toBeNull();
  });
});

describe("guest access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function guestSession(talkId: string) {
    return { id: crypto.randomUUID(), talkId, username: "Sam" };
  }

  test("gives a guest access to a public talk only", async () => {
    const { db, pglite, talkId } = await setup();
    await exec(
      pglite,
      "update public.talks set is_public = true where id = $1",
      [talkId],
    );
    const guest = guestSession(talkId);

    await expect(
      getTalkAccessForGuest(talkId, guest, db),
    ).resolves.toMatchObject({
      access: "guest",
      talk: { id: talkId },
      guest: { username: "Sam" },
    });

    await exec(
      pglite,
      "update public.talks set is_public = false where id = $1",
      [talkId],
    );
    await expect(getTalkAccessForGuest(talkId, guest, db)).resolves.toBeNull();
  });

  test("loadTalkAccess falls back to a guest session when there is no user", async () => {
    const { db, pglite, talkId } = await setup();
    await exec(
      pglite,
      "update public.talks set is_public = true where id = $1",
      [talkId],
    );
    mocks.getSessionUser.mockResolvedValue(null);
    mocks.readGuestSession.mockResolvedValue(guestSession(talkId));

    const access = await loadTalkAccess(talkId, db);

    expect(access).toMatchObject({ access: "guest", talk: { id: talkId } });
    expect(isAttendee(access!)).toBe(true);
    expect(isManager(access!)).toBe(false);
    expect(attendeeVoteKey(access!)).toEqual({
      guestId: expect.any(String),
    });
  });

  test("loadTalkAccess still requires guest access when a signed-in user has none", async () => {
    const { talkId, outsider } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(outsider, "attendee"));
    mocks.readGuestSession.mockResolvedValue(null);

    await expect(loadTalkAccess(talkId)).resolves.toBeNull();
  });

  test("requireTalkManager rejects guests", async () => {
    const { talkId } = await setup();
    mocks.getSessionUser.mockResolvedValue(null);
    mocks.readGuestSession.mockResolvedValue(guestSession(talkId));

    await expect(requireTalkManager(talkId)).resolves.toMatchObject({
      ok: false,
    });
  });

  test("resolveTalkAttendee prefers a rostered member", async () => {
    const { talkId, attendee } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(attendee, "attendee"));

    await expect(resolveTalkAttendee(talkId)).resolves.toMatchObject({
      kind: "member",
      user: { id: attendee.id },
    });
    expect(mocks.readGuestSession).not.toHaveBeenCalled();
  });

  test("resolveTalkAttendee falls back to a guest for a non-member", async () => {
    const { talkId, outsider } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(outsider, "attendee"));
    mocks.readGuestSession.mockResolvedValue(guestSession(talkId));

    await expect(resolveTalkAttendee(talkId)).resolves.toMatchObject({
      kind: "guest",
      guest: { username: "Sam" },
    });
  });

  test("resolveTalkAttendee returns null without a member or guest", async () => {
    const { talkId, outsider } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(outsider, "attendee"));
    mocks.readGuestSession.mockResolvedValue(null);

    await expect(resolveTalkAttendee(talkId)).resolves.toBeNull();
  });
});

describe("requireTalkManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("allows owners and admins", async () => {
    const { talkId, owner } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(owner, "presenter"));

    await expect(requireTalkManager(talkId)).resolves.toMatchObject({
      ok: true,
      access: "presenter",
    });

    const adminTalkId = (await setup()).talkId;
    mocks.getSessionUser.mockResolvedValue({
      id: crypto.randomUUID(),
      email: "admin@example.com",
      role: "admin",
    });

    await expect(requireTalkManager(adminTalkId)).resolves.toMatchObject({
      ok: true,
      access: "admin",
    });
  });

  test("rejects rostered attendees", async () => {
    const { talkId, attendee } = await setup();
    mocks.getSessionUser.mockResolvedValue(sessionUser(attendee, "attendee"));

    await expect(requireTalkManager(talkId)).resolves.toMatchObject({
      ok: false,
    });
  });
});

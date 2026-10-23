import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { readGuestSession, setGuestCookie } from "@/lib/talks/guest-session";
import { createGuestToken, guestCookieName } from "@/lib/talks/talk-guests";
import { createDb, exec, seedTalk } from "../../db/harness";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

type Setup = {
  db: Db;
  talkId: string;
  guestId: string;
  token: string;
  hash: string;
};

async function setup({
  isPublic = true,
}: { isPublic?: boolean } = {}): Promise<Setup> {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const talkId = await seedTalk(pglite, "Talk", []);
  await exec(pglite, "update public.talks set is_public = $1 where id = $2", [
    isPublic,
    talkId,
  ]);
  const guestId = crypto.randomUUID();
  const { token, hash } = createGuestToken();
  await exec(
    pglite,
    `insert into public.talk_guests
       (id, talk_id, username, username_normalized, token_hash)
     values ($1, $2, 'Sam', 'sam', $3)`,
    [guestId, talkId, hash],
  );

  return { db, talkId, guestId, token, hash };
}

function cookieJar(talkId: string, value: string) {
  mocks.cookies.mockResolvedValue({
    get: (name: string) =>
      name === guestCookieName(talkId) ? { name, value } : undefined,
    set: mocks.set,
    delete: mocks.delete,
  });
}

describe("readGuestSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the guest for a valid cookie on a public talk", async () => {
    const f = await setup();
    cookieJar(f.talkId, `${f.guestId}.${f.token}`);

    await expect(readGuestSession(f.talkId, f.db)).resolves.toEqual({
      id: f.guestId,
      talkId: f.talkId,
      username: "Sam",
    });
  });

  test("returns null without a cookie", async () => {
    const f = await setup();
    mocks.cookies.mockResolvedValue({
      get: () => undefined,
      set: mocks.set,
      delete: mocks.delete,
    });

    await expect(readGuestSession(f.talkId, f.db)).resolves.toBeNull();
  });

  test("returns null for a wrong token", async () => {
    const f = await setup();
    const other = createGuestToken();
    cookieJar(f.talkId, `${f.guestId}.${other.token}`);

    await expect(readGuestSession(f.talkId, f.db)).resolves.toBeNull();
  });

  test("returns null when the guest belongs to another talk", async () => {
    const f = await setup();
    cookieJar(f.talkId, `${crypto.randomUUID()}.${f.token}`);

    await expect(readGuestSession(f.talkId, f.db)).resolves.toBeNull();
  });

  test("returns null once the talk is private", async () => {
    const f = await setup({ isPublic: false });
    cookieJar(f.talkId, `${f.guestId}.${f.token}`);

    await expect(readGuestSession(f.talkId, f.db)).resolves.toBeNull();
  });
});

describe("setGuestCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: vi.fn(),
      set: mocks.set,
      delete: mocks.delete,
    });
  });

  test("writes the talk-scoped session cookie", async () => {
    const talkId = crypto.randomUUID();
    const guestId = crypto.randomUUID();
    const { token } = createGuestToken();

    await setGuestCookie(talkId, guestId, token);

    expect(mocks.set).toHaveBeenCalledWith(
      guestCookieName(talkId),
      `${guestId}.${token}`,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }),
    );
  });
});

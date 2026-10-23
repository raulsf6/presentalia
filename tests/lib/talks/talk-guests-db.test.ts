import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import {
  countTalkGuests,
  loadPublicTalk,
  loadTalkGuests,
} from "@/lib/talks/talk-guests-db";
import { createDb, exec, seedTalk } from "../../db/harness";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const talkId = await seedTalk(pglite, "Talk", []);
  const otherTalkId = await seedTalk(pglite, "Other", []);

  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const other = crypto.randomUUID();
  await exec(
    pglite,
    `insert into public.talk_guests
       (id, talk_id, username, username_normalized, token_hash, joined_at)
     values
       ($1, $2, 'Sam', 'sam', 'hash', '2026-10-21T10:00:00Z'),
       ($3, $2, 'Alex', 'alex', 'hash', '2026-10-21T11:00:00Z'),
       ($4, $5, 'Other', 'other', 'hash', '2026-10-21T09:00:00Z')`,
    [first, talkId, second, other, otherTalkId],
  );

  return { pglite, db, talkId, first, second };
}

describe("loadTalkGuests", () => {
  test("lists a talk's guests in join order", async () => {
    const { db, talkId, first, second } = await setup();

    const guests = await loadTalkGuests(talkId, db);

    expect(guests.map((guest) => guest.id)).toEqual([first, second]);
    expect(guests.map((guest) => guest.username)).toEqual(["Sam", "Alex"]);
  });
});

describe("countTalkGuests", () => {
  test("counts only the talk's guests", async () => {
    const { db, talkId } = await setup();

    await expect(countTalkGuests(talkId, db)).resolves.toBe(2);
  });
});

describe("loadPublicTalk", () => {
  test("returns a public talk for the join screen", async () => {
    const { pglite, db, talkId } = await setup();
    await exec(
      pglite,
      "update public.talks set is_public = true where id = $1",
      [talkId],
    );

    const talk = await loadPublicTalk(talkId, db);

    expect(talk).toMatchObject({
      id: talkId,
      name: "Talk",
      isPublic: true,
    });
  });

  test("hides a private talk", async () => {
    const { db, talkId } = await setup();

    await expect(loadPublicTalk(talkId, db)).resolves.toBeNull();
  });

  test("returns null for an unknown talk", async () => {
    const { db } = await setup();

    await expect(loadPublicTalk(crypto.randomUUID(), db)).resolves.toBeNull();
  });
});

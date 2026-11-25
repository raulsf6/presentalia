import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { countTalkAttendees } from "@/lib/talks/talk-attendees";
import { createDb, exec, seedTalk } from "../../db/harness";

async function addGuest(
  pglite: Awaited<ReturnType<typeof createDb>>,
  talkId: string,
  username: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await exec(
    pglite,
    `insert into public.talk_guests
       (id, talk_id, username, username_normalized, token_hash)
     values ($1, $2, $3, $4, 'hash')`,
    [id, talkId, username, username.toLowerCase()],
  );
  return id;
}

describe("countTalkAttendees", () => {
  test("counts the talk's roster members and anonymous guests", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", [
      "member@example.com",
      "other@example.com",
    ]);
    await seedTalk(pglite, "Other talk", ["third@example.com"]);
    await addGuest(pglite, talkId, "Sam");
    await addGuest(pglite, talkId, "Alex");

    await expect(countTalkAttendees(talkId, db)).resolves.toBe(4);
  });

  test("returns zero when nobody can answer yet", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    const talkId = await seedTalk(pglite, "Talk", []);

    await expect(countTalkAttendees(talkId, db)).resolves.toBe(0);
  });
});

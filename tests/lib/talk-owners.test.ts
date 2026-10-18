import { describe, expect, test } from "vitest";
import { drizzle } from "drizzle-orm/pglite";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { loadOwnerEmails } from "@/lib/membership";
import { createDb, exec } from "../db/harness";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";
const GHOST = "44444444-4444-4444-8444-444444444444";

async function dbWithUsers(
  users: { id: string; email: string | null }[],
): Promise<Db> {
  const pglite = await createDb();
  for (const user of users) {
    // app_users mirrors auth.users through the sync trigger.
    await exec(pglite, "insert into auth.users (id, email) values ($1, $2)", [
      user.id,
      user.email,
    ]);
  }
  return drizzle(pglite, { schema }) as unknown as Db;
}

describe("loadOwnerEmails", () => {
  test("returns each user's email for owner attribution", async () => {
    const db = await dbWithUsers([
      { id: OWNER_A, email: "one@example.com" },
      { id: OWNER_B, email: null },
    ]);

    const emails = await loadOwnerEmails([OWNER_A, OWNER_B], db);

    expect(emails.get(OWNER_A)).toBe("one@example.com");
    expect(emails.get(OWNER_B)).toBeNull();
    expect(emails.size).toBe(2);
  });

  test("tolerates duplicate ids and leaves unknown ids out of the map", async () => {
    const db = await dbWithUsers([{ id: OWNER_A, email: "one@example.com" }]);

    const emails = await loadOwnerEmails([OWNER_A, OWNER_A, GHOST], db);

    expect(emails.size).toBe(1);
    expect(emails.get(OWNER_A)).toBe("one@example.com");
    expect(emails.has(GHOST)).toBe(false);
  });

  test("returns an empty map when there are no ids", async () => {
    const db = await dbWithUsers([]);

    await expect(loadOwnerEmails([], db)).resolves.toEqual(new Map());
  });
});

import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { listAdminUsers } from "@/lib/auth/admin-users";
import { createDb, exec, makeUser } from "../../db/harness";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;

  const bruno = await makeUser(pglite, "bruno@example.com");
  const ana = await makeUser(pglite, "ana@example.com");
  const carla = await makeUser(pglite, "carla@example.com");
  await exec(
    pglite,
    "update public.app_users set role = $1, email_verified_at = $2 where id = $3",
    ["presenter", "2026-10-20T10:00:00Z", bruno.id],
  );
  await exec(pglite, "update public.app_users set role = $1 where id = $2", [
    "admin",
    carla.id,
  ]);

  return { pglite, db, ana, bruno, carla };
}

describe("listAdminUsers", () => {
  test("lists every user by email with verified times as ISO strings", async () => {
    const { db, ana, bruno, carla } = await setup();

    const users = await listAdminUsers(db);

    expect(users).toEqual([
      {
        id: ana.id,
        email: "ana@example.com",
        role: "attendee",
        emailVerifiedAt: null,
      },
      {
        id: bruno.id,
        email: "bruno@example.com",
        role: "presenter",
        emailVerifiedAt: "2026-10-20T10:00:00.000Z",
      },
      {
        id: carla.id,
        email: "carla@example.com",
        role: "admin",
        emailVerifiedAt: null,
      },
    ]);
  });
});

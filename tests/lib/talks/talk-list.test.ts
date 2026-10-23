import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";
import { listAccessibleTalks } from "@/lib/talks/membership";
import { createDb, makeUser, seedTalk } from "../../db/harness";

async function setup() {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;

  const presenter = await makeUser(pglite, "presenter@example.com");
  const otherPresenter = await makeUser(pglite, "other@example.com");
  const attendee = await makeUser(pglite, "attendee@example.com");
  const outsider = await makeUser(pglite, "outsider@example.com");

  const owned = await seedTalk(pglite, "Owned", [], presenter.id);
  const invited = await seedTalk(
    pglite,
    "Invited",
    [presenter.email],
    otherPresenter.id,
  );
  const attended = await seedTalk(
    pglite,
    "Attended",
    [attendee.email],
    otherPresenter.id,
  );
  const other = await seedTalk(pglite, "Other", [], otherPresenter.id);
  const ownerless = await seedTalk(pglite, "Ownerless", []);

  return {
    pglite,
    db,
    presenter,
    otherPresenter,
    attendee,
    outsider,
    owned,
    invited,
    attended,
    other,
    ownerless,
  };
}

describe("listAccessibleTalks", () => {
  test("returns every talk with owner emails for admins", async () => {
    const { db, presenter, otherPresenter, ownerless } = await setup();
    const admin: SessionUser = {
      id: crypto.randomUUID(),
      email: "admin@example.com",
      role: "admin",
    };

    const rows = await listAccessibleTalks(admin.id, admin.role, db);
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(rows).toHaveLength(5);
    expect(byId.get(ownerless)?.ownerEmail).toBeNull();

    const ownedRows = rows.filter((row) => row.createdBy === presenter.id);
    expect(ownedRows.map((row) => row.ownerEmail)).toContain(
      "presenter@example.com",
    );
    expect(rows.some((row) => row.ownerEmail === otherPresenter.email)).toBe(
      true,
    );
  });

  test("returns owned and rostered talks once for presenters", async () => {
    const { db, presenter, owned, invited, other } = await setup();

    const rows = await listAccessibleTalks(presenter.id, "presenter", db);
    const ids = rows.map((row) => row.id);

    expect(ids).toContain(owned);
    expect(ids).toContain(invited);
    expect(ids).not.toContain(other);
    expect(ids.filter((id) => id === invited)).toHaveLength(1);
    expect(rows.find((row) => row.id === owned)?.ownerEmail).toBe(
      presenter.email,
    );
  });

  test("returns only rostered talks for attendees", async () => {
    const { db, attendee, attended, other } = await setup();

    const rows = await listAccessibleTalks(attendee.id, "attendee", db);

    expect(rows.map((row) => row.id)).toEqual([attended]);
    expect(rows.some((row) => row.id === other)).toBe(false);
  });

  test("returns an empty list when an attendee has no roster entries", async () => {
    const { db, outsider } = await setup();

    await expect(
      listAccessibleTalks(outsider.id, "attendee", db),
    ).resolves.toEqual([]);
  });
});

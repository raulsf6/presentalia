import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDb, exec } from "./harness";

describe("createDb", () => {
  let migrationsDir: string;

  beforeAll(async () => {
    migrationsDir = await mkdtemp(join(tmpdir(), "presentalia-migrations-"));
    // Written out of filename order; the lower filename creates the table the
    // higher one inserts into, pinning sorted application.
    await writeFile(
      join(migrationsDir, "0010_insert.sql"),
      "insert into public.ordering_probe (value) values ('second');",
    );
    await writeFile(
      join(migrationsDir, "0002_create.sql"),
      "create table public.ordering_probe (value text);",
    );
  });

  afterAll(async () => {
    await rm(migrationsDir, { recursive: true, force: true });
  });

  test("applies every migration file in filename order", async () => {
    const db = await createDb({ migrationsDir });

    const rows = await exec(db, "select value from public.ordering_probe");

    expect(rows.map((row) => row.value)).toEqual(["second"]);
  });

  test("rejects a migrations directory with no SQL files", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "presentalia-empty-"));

    try {
      await expect(createDb({ migrationsDir: emptyDir })).rejects.toThrow(
        /no migrations/i,
      );
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});

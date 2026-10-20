import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

export type TestUser = { id: string; email: string };

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../supabase/migrations", import.meta.url),
);

/** Minimal stand-ins for the Supabase auth/storage schemas and API roles. */
const FAKE_SUPABASE_SETUP = `
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz
);

create schema if not exists storage;
create table storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create role anon nologin;
create role authenticated nologin;
`;

export type Db = PGlite;

export async function createDb({
  migrationsDir = MIGRATIONS_DIR,
}: { migrationsDir?: string } = {}): Promise<Db> {
  // Numeric-aware sort applies zero-padded prefixes (0002 before 0010) and
  // timestamp prefixes in application order.
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (files.length === 0) {
    throw new Error(`No migrations found in ${migrationsDir}`);
  }
  const db = new PGlite();
  await db.exec(FAKE_SUPABASE_SETUP);
  for (const file of files) {
    await db.exec(await readFile(join(migrationsDir, file), "utf-8"));
  }
  return db;
}

/** Runs SQL as the database owner, primarily for seeding and app queries. */
export async function exec(
  db: Db,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  const result = await db.query(sql, params);
  return result.rows as Record<string, unknown>[];
}

/** Runs one statement as the authenticated API role to check database grants. */
export async function execAs(
  db: Db,
  _user: TestUser,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    const result = await db.query(sql, params);
    await db.query("commit");
    return result.rows as Record<string, unknown>[];
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}

/** Like execAs, but returns the error instead of throwing, for assertions. */
export async function attemptAs(
  db: Db,
  user: TestUser,
  sql: string,
  params: unknown[] = [],
): Promise<{ message: string } | null> {
  try {
    await execAs(db, user, sql, params);
    return null;
  } catch (error) {
    return { message: String((error as Error).message) };
  }
}

/** Database-owner attempt that returns the error, for assertions. */
export async function attempt(
  db: Db,
  sql: string,
  params: unknown[] = [],
): Promise<{ message: string } | null> {
  try {
    await exec(db, sql, params);
    return null;
  } catch (error) {
    return { message: String((error as Error).message) };
  }
}

export async function makeUser(db: Db, email: string): Promise<TestUser> {
  const normalized = email.trim().toLowerCase();
  const id = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [
    id,
    normalized,
  ]);
  return { id, email: normalized };
}

export async function seedTalk(
  db: Db,
  name: string,
  rosterEmails: string[],
  createdBy?: string,
): Promise<string> {
  const talkId = crypto.randomUUID();
  if (createdBy) {
    await db.query(
      "insert into public.talks (id, name, created_by) values ($1, $2, $3)",
      [talkId, name, createdBy],
    );
  } else {
    await db.query("insert into public.talks (id, name) values ($1, $2)", [
      talkId,
      name,
    ]);
  }
  for (const email of rosterEmails) {
    const normalized = email.trim().toLowerCase();
    const existingUsers = await exec(
      db,
      "select id from public.app_users where email = $1 limit 1",
      [normalized],
    );
    const userId = existingUsers[0]?.id ?? (await makeUser(db, normalized)).id;
    await db.query(
      "insert into public.talk_roster (talk_id, user_id) values ($1, $2)",
      [talkId, userId],
    );
  }
  return talkId;
}

export async function seedPoll(
  db: Db,
  talkId: string,
  opts: { identifiable?: boolean; options?: string[] } = {},
): Promise<{ pollId: string; optionIds: string[] }> {
  const pollId = crypto.randomUUID();
  await db.query(
    "insert into public.activities (id, talk_id, type, status) values ($1, $2, 'poll', 'draft')",
    [pollId, talkId],
  );
  await db.query(
    "insert into public.polls (activity_id, question, results_identifiable) values ($1, $2, $3)",
    [pollId, "Which framework wins?", opts.identifiable ?? false],
  );
  const optionIds: string[] = [];
  for (const [position, label] of (
    opts.options ?? ["LangGraph", "CrewAI"]
  ).entries()) {
    const optionId = crypto.randomUUID();
    await db.query(
      "insert into public.poll_options (id, poll_id, label, position) values ($1, $2, $3, $4)",
      [optionId, pollId, label, position],
    );
    optionIds.push(optionId);
  }
  return { pollId, optionIds };
}

export async function seedQuiz(
  db: Db,
  talkId: string,
  opts: {
    identifiable?: boolean;
    options?: string[];
    correctIndex?: number;
  } = {},
): Promise<{ quizId: string; optionIds: string[] }> {
  const quizId = crypto.randomUUID();
  await db.query(
    "insert into public.activities (id, talk_id, type, status) values ($1, $2, 'quiz', 'draft')",
    [quizId, talkId],
  );
  await db.query(
    "insert into public.quizzes (activity_id, question, results_identifiable) values ($1, $2, $3)",
    [quizId, "Which framework is correct?", opts.identifiable ?? false],
  );
  const optionIds: string[] = [];
  const correctIndex = opts.correctIndex ?? 0;
  for (const [position, label] of (
    opts.options ?? ["LangGraph", "CrewAI"]
  ).entries()) {
    const optionId = crypto.randomUUID();
    await db.query(
      "insert into public.quiz_options (id, quiz_id, label, position, is_correct) values ($1, $2, $3, $4, $5)",
      [optionId, quizId, label, position, position === correctIndex],
    );
    optionIds.push(optionId);
  }
  return { quizId, optionIds };
}

export async function setStatus(
  db: Db,
  activityId: string,
  status: "draft" | "active" | "closed",
): Promise<void> {
  const now = new Date().toISOString();
  await db.query(
    `update public.activities
     set status = $1,
         launched_at = case when $1 = 'active' then $2 else launched_at end,
         closed_at = case when $1 = 'closed' then $2 else closed_at end
     where id = $3`,
    [status, now, activityId],
  );
}

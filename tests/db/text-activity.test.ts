import { describe, expect, test } from "vitest";

import {
  attempt,
  createDb,
  exec,
  makeUser,
  seedTalk,
  seedTextActivity,
  setStatus,
  type Db,
} from "./harness";

async function addAnswer(
  db: Db,
  activityId: string,
  userId: string,
  body = "Ship the small thing.",
): Promise<string> {
  const id = crypto.randomUUID();
  await db.query(
    "insert into public.text_answers (id, activity_id, user_id, body) values ($1, $2, $3, $4)",
    [id, activityId, userId, body],
  );
  return id;
}

async function addRun(
  db: Db,
  activityId: string,
  opts: {
    status?: "running" | "succeeded" | "failed";
    published?: boolean;
    answerCount?: number;
  } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  const status = opts.status ?? "running";
  await db.query(
    `insert into public.text_ranking_runs
       (id, activity_id, status, model, prompt_version, criteria_snapshot,
        answer_count, finished_at, published_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      activityId,
      status,
      "openai/test",
      "text-ranking-v1",
      "Most actionable",
      opts.answerCount ?? 1,
      status === "running" ? null : new Date().toISOString(),
      opts.published ? new Date().toISOString() : null,
    ],
  );
  return id;
}

describe("text activity migration", () => {
  test("creates the text module tables", async () => {
    const db = await createDb();
    const rows = await exec(
      db,
      `select c.relname as table_name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    for (const table of [
      "text_activities",
      "text_answers",
      "text_ranking_runs",
      "text_rankings",
    ]) {
      expect(
        rows.find((row) => row.table_name === table),
        `table ${table} exists`,
      ).toBeDefined();
    }
  });

  test("activities accepts text and locked", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedTextActivity(db, talkId);

    const stored = await exec(
      db,
      "select type, status from public.activities where id = $1",
      [activityId],
    );
    await setStatus(db, activityId, "active");
    await setStatus(db, activityId, "locked");
    const locked = await exec(
      db,
      "select status from public.activities where id = $1",
      [activityId],
    );

    expect(stored[0]).toEqual({ type: "text", status: "draft" });
    expect(locked[0]?.status).toBe("locked");
  });

  test("a talk can have only one active or locked activity", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const first = await seedTextActivity(db, talkId, { status: "active" });

    const secondActive = await attempt(
      db,
      "insert into public.activities (talk_id, type, status) values ($1, 'poll', 'active')",
      [talkId],
    );
    await setStatus(db, first, "locked");
    const secondLocked = await attempt(
      db,
      "insert into public.activities (talk_id, type, status) values ($1, 'poll', 'active')",
      [talkId],
    );
    await setStatus(db, first, "closed");
    const afterClose = await attempt(
      db,
      "insert into public.activities (talk_id, type, status) values ($1, 'poll', 'active')",
      [talkId],
    );

    expect(secondActive?.message).toMatch(/activities_one_active_per_talk/);
    expect(secondLocked?.message).toMatch(/activities_one_active_per_talk/);
    expect(afterClose).toBeNull();
  });

  test("answers are accepted only while the activity is active", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const draftTalk = await seedTalk(db, "Draft talk", [user.email]);
    const activeTalk = await seedTalk(db, "Active talk", [user.email]);
    const lockedTalk = await seedTalk(db, "Locked talk", [user.email]);

    const draft = await seedTextActivity(db, draftTalk);
    const draftInsert = await attempt(
      db,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, $2, 'Too early')",
      [draft, user.id],
    );

    const active = await seedTextActivity(db, activeTalk, { status: "active" });
    const activeInsert = await attempt(
      db,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, $2, 'Just right')",
      [active, user.id],
    );

    const locked = await seedTextActivity(db, lockedTalk, { status: "locked" });
    const lockedInsert = await attempt(
      db,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, $2, 'Too late')",
      [locked, user.id],
    );

    expect(draftInsert?.message).toMatch(
      /only accepted while the activity is active/,
    );
    expect(activeInsert).toBeNull();
    expect(lockedInsert?.message).toMatch(
      /only accepted while the activity is active/,
    );
  });

  test("an attendee can answer once", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });

    await addAnswer(db, activityId, user.id);
    const duplicate = await attempt(
      db,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, $2, 'Again')",
      [activityId, user.id],
    );

    expect(duplicate?.message).toMatch(/duplicate key value violates unique constraint/);
  });

  test("answers cannot be edited or deleted directly", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });
    const answerId = await addAnswer(db, activityId, user.id);

    const edited = await attempt(
      db,
      "update public.text_answers set body = 'Changed' where id = $1",
      [answerId],
    );
    const deleted = await attempt(
      db,
      "delete from public.text_answers where id = $1",
      [answerId],
    );

    expect(edited?.message).toMatch(/answers are immutable/);
    expect(deleted?.message).toMatch(/answers cannot be deleted/);
  });

  test("deleting an auth user tombstones the answer and keeps its ranking", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedTextActivity(db, talkId, {
      status: "active",
      identifiable: true,
    });
    const answerId = await addAnswer(db, activityId, user.id, "My email is me@example.com");
    const runId = await addRun(db, activityId, {
      status: "succeeded",
      published: true,
    });
    await db.query(
      "insert into public.text_rankings (run_id, answer_id, rank, score) values ($1, $2, 1, 90)",
      [runId, answerId],
    );

    await db.query("delete from auth.users where id = $1", [user.id]);

    const answers = await exec(
      db,
      "select user_id, body from public.text_answers where id = $1",
      [answerId],
    );
    const rankings = await exec(
      db,
      "select rank, score from public.text_rankings where run_id = $1 and answer_id = $2",
      [runId, answerId],
    );

    expect(answers[0]).toEqual({ user_id: null, body: "[answer removed]" });
    expect(rankings[0]).toEqual({ rank: 1, score: 90 });
  });

  test("an anonymous non-tombstone answer is rejected", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });

    const rejected = await attempt(
      db,
      "insert into public.text_answers (activity_id, user_id, body) values ($1, null, 'Anonymous')",
      [activityId],
    );

    expect(rejected?.message).toMatch(/answers require an author/);
  });

  test("status transitions follow the lifecycle", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedTextActivity(db, talkId);

    await setStatus(db, activityId, "active");
    await setStatus(db, activityId, "locked");
    await setStatus(db, activityId, "closed");
    const reopen = await attempt(
      db,
      "update public.activities set status = 'active' where id = $1",
      [activityId],
    );

    const fresh = await seedTextActivity(db, talkId);
    const skip = await attempt(
      db,
      "update public.activities set status = 'locked' where id = $1",
      [fresh],
    );

    expect(reopen?.message).toMatch(/closed activities are immutable/);
    expect(skip?.message).toMatch(/invalid activity status transition/);
  });

  test("a closed activity row is immutable", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedTextActivity(db, talkId, { status: "closed" });

    const touched = await attempt(
      db,
      "update public.activities set launched_at = now() where id = $1",
      [activityId],
    );

    expect(touched?.message).toMatch(/closed activities are immutable/);
  });

  test("only one run may be running per activity", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedTextActivity(db, talkId, { status: "locked" });
    const first = await addRun(db, activityId);

    const second = await attempt(
      db,
      `insert into public.text_ranking_runs
         (activity_id, prompt_version, criteria_snapshot, answer_count)
       values ($1, 'text-ranking-v1', 'Most actionable', 1)`,
      [activityId],
    );
    await db.query(
      "update public.text_ranking_runs set status = 'failed', finished_at = now() where id = $1",
      [first],
    );
    const third = await attempt(
      db,
      `insert into public.text_ranking_runs
         (activity_id, prompt_version, criteria_snapshot, answer_count)
       values ($1, 'text-ranking-v1', 'Most actionable', 1)`,
      [activityId],
    );

    expect(second?.message).toMatch(/text_ranking_runs_one_running/);
    expect(third).toBeNull();
  });

  test("published runs and rankings are immutable, but cascades still delete", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });
    const answerId = await addAnswer(db, activityId, user.id);
    await setStatus(db, activityId, "closed");
    const runId = await addRun(db, activityId, {
      status: "succeeded",
      published: true,
    });
    await db.query(
      "insert into public.text_rankings (run_id, answer_id, rank, score) values ($1, $2, 1, 90)",
      [runId, answerId],
    );

    const runEdit = await attempt(
      db,
      "update public.text_ranking_runs set error = 'changed' where id = $1",
      [runId],
    );
    const rankingEdit = await attempt(
      db,
      "update public.text_rankings set score = 1 where run_id = $1",
      [runId],
    );
    const runDelete = await attempt(
      db,
      "delete from public.text_ranking_runs where id = $1",
      [runId],
    );
    const rankingDelete = await attempt(
      db,
      "delete from public.text_rankings where run_id = $1",
      [runId],
    );

    expect(runEdit?.message).toMatch(/published ranking runs are immutable/);
    expect(rankingEdit?.message).toMatch(/rankings are immutable/);
    expect(runDelete?.message).toMatch(/ranking runs cannot be deleted/);
    expect(rankingDelete?.message).toMatch(/rankings cannot be deleted/);

    await db.query("delete from public.talks where id = $1", [talkId]);
    const remaining = await exec(
      db,
      `select
         (select count(*)::int from public.text_answers) as answers,
         (select count(*)::int from public.text_ranking_runs) as runs,
         (select count(*)::int from public.text_rankings) as rankings`,
    );
    expect(remaining[0]).toEqual({ answers: 0, runs: 0, rankings: 0 });
  });
});

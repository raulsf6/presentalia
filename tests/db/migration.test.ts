import { describe, expect, test } from "vitest";

import {
  attempt,
  attemptAs,
  createDb,
  exec,
  makeUser,
  seedPoll,
  seedTalk,
  setStatus,
  type Db,
  type TestUser,
} from "./harness";

type Fixture = {
  db: Db;
  member: TestUser;
  member2: TestUser;
  talkId: string;
  pollId: string;
  optionIds: string[];
};

async function setup(): Promise<Fixture> {
  const db = await createDb();
  const member = await makeUser(db, "member@example.com");
  const member2 = await makeUser(db, "member2@example.com");
  const talkId = await seedTalk(db, "AI Agents in Production", [
    member.email,
    member2.email,
  ]);
  const { pollId, optionIds } = await seedPoll(db, talkId);
  return {
    db,
    member,
    member2,
    talkId,
    pollId,
    optionIds,
  };
}

describe("migration", () => {
  test("applies cleanly and creates app tables and a private slides bucket", async () => {
    const db = await createDb();
    const tables = [
      "talks",
      "talk_roster",
      "activities",
      "polls",
      "poll_options",
      "poll_votes",
      "poll_vote_counts",
      "app_users",
    ];
    const rows = await exec(
      db,
      `select c.relname as table_name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    for (const table of tables) {
      const row = rows.find((r) => r.table_name === table);
      expect(row, `table ${table} exists`).toBeDefined();
    }
    const bucket = await exec(
      db,
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'talk-slides'",
    );
    expect(bucket[0]?.public).toBe(false);
    expect(Number(bucket[0]?.file_size_limit)).toBe(20 * 1024 * 1024);
    expect(bucket[0]?.allowed_mime_types).toEqual(["application/pdf"]);
  });
});

describe("voting", () => {
  test("a vote on an active poll increments the count", async () => {
    const f = await setup();
    await setStatus(f.db, f.pollId, "active");
    await exec(
      f.db,
      "insert into public.poll_votes (poll_id, user_id, option_id, voter_email) values ($1, $2, $3, $4)",
      [f.pollId, f.member.id, f.optionIds[0], f.member.email],
    );

    const counts = await exec(
      f.db,
      "select option_id, votes from public.poll_vote_counts where poll_id = $1",
      [f.pollId],
    );
    expect(counts).toHaveLength(1);
    expect(counts[0]?.option_id).toBe(f.optionIds[0]);
    expect(counts[0]?.votes).toBe(1);
  });

  test("the primary key prevents duplicate votes by the same user", async () => {
    const f = await setup();
    await setStatus(f.db, f.pollId, "active");
    await exec(
      f.db,
      "insert into public.poll_votes (poll_id, user_id, option_id, voter_email) values ($1, $2, $3, $4)",
      [f.pollId, f.member.id, f.optionIds[0], f.member.email],
    );
    const error = await attempt(
      f.db,
      "insert into public.poll_votes (poll_id, user_id, option_id, voter_email) values ($1, $2, $3, $4)",
      [f.pollId, f.member.id, f.optionIds[1], f.member.email],
    );
    expect(error?.message).toMatch(
      /duplicate key value violates unique constraint/,
    );
  });

  test("the counts trigger tallies multiple votes", async () => {
    const f = await setup();
    await setStatus(f.db, f.pollId, "active");
    await exec(
      f.db,
      "insert into public.poll_votes (poll_id, user_id, option_id, voter_email) values ($1, $2, $3, $4)",
      [f.pollId, f.member.id, f.optionIds[0], f.member.email],
    );
    await exec(
      f.db,
      "insert into public.poll_votes (poll_id, user_id, option_id, voter_email) values ($1, $2, $3, $4)",
      [f.pollId, f.member2.id, f.optionIds[0], f.member2.email],
    );
    const counts = await exec(
      f.db,
      "select option_id, votes from public.poll_vote_counts where poll_id = $1 order by option_id",
      [f.pollId],
    );
    const total = counts.reduce((sum, row) => sum + Number(row.votes), 0);
    expect(total).toBe(2);
    expect(counts.find((r) => r.option_id === f.optionIds[0])?.votes).toBe(2);
    // No successful vote landed on option 2, so no counts row exists for it
    // (the app's computeResults treats a missing count as zero).
    expect(counts.find((r) => r.option_id === f.optionIds[1])).toBeUndefined();
  });
});

describe("activity lifecycle", () => {
  test("only one activity may be active per talk at a time", async () => {
    const f = await setup();
    await setStatus(f.db, f.pollId, "active");
    const { pollId: secondPollId } = await seedPoll(f.db, f.talkId);
    // The one-active rule is a DB backstop for the app's admin launch path,
    // so the violating update runs as owner.
    const error = await attempt(
      f.db,
      `update public.activities set status = 'active', launched_at = now()
       where id = $1`,
      [secondPollId],
    );
    expect(error?.message).toMatch(
      /duplicate key value violates unique constraint "activities_one_active_per_talk"/,
    );
  });
});

describe("app user sync", () => {
  test("inserting an auth user syncs app_users with a lowercased email", async () => {
    const db = await createDb();
    const id = crypto.randomUUID();
    await exec(db, "insert into auth.users (id, email) values ($1, $2)", [
      id,
      "Newbie@Example.com",
    ]);
    const rows = await exec(db, "select id, email from public.app_users");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.email).toBe("newbie@example.com");
  });

  test("email changes and user deletion stay synchronized", async () => {
    const db = await createDb();
    const id = crypto.randomUUID();
    await exec(db, "insert into auth.users (id, email) values ($1, $2)", [
      id,
      "before@example.com",
    ]);
    await exec(db, "update auth.users set email = $1 where id = $2", [
      "After@Example.com",
      id,
    ]);

    const updated = await exec(
      db,
      "select email from public.app_users where id = $1",
      [id],
    );
    expect(updated[0]?.email).toBe("after@example.com");

    await exec(db, "delete from auth.users where id = $1", [id]);
    const deleted = await exec(
      db,
      "select id from public.app_users where id = $1",
      [id],
    );
    expect(deleted).toHaveLength(0);
  });

  test("email changes preserve a user's assigned role", async () => {
    const db = await createDb();
    const id = crypto.randomUUID();
    await exec(db, "insert into auth.users (id, email) values ($1, $2)", [
      id,
      "presenter@example.com",
    ]);
    await exec(
      db,
      "update public.app_users set role = 'presenter' where id = $1",
      [id],
    );

    await exec(db, "update auth.users set email = $1 where id = $2", [
      "Presenter2@Example.com",
      id,
    ]);

    const rows = await exec(
      db,
      "select email, role from public.app_users where id = $1",
      [id],
    );
    expect(rows[0]).toEqual({
      email: "presenter2@example.com",
      role: "presenter",
    });
  });

  test("new app users default to the attendee role", async () => {
    const db = await createDb();
    const user = await makeUser(db, "attendee@example.com");

    const rows = await exec(
      db,
      "select role from public.app_users where id = $1",
      [user.id],
    );

    expect(rows[0]?.role).toBe("attendee");
  });

  test("syncs Supabase auth users that have no email address", async () => {
    const db = await createDb();
    const id = crypto.randomUUID();
    await exec(db, "insert into auth.users (id, email) values ($1, null)", [
      id,
    ]);

    const rows = await exec(
      db,
      "select id, email from public.app_users where id = $1",
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBeNull();
  });
});

describe("role safeguards", () => {
  test("only the final admin's demotion is rejected", async () => {
    const db = await createDb();
    const admin1 = await makeUser(db, "admin1@example.com");
    const admin2 = await makeUser(db, "admin2@example.com");

    await exec(
      db,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [admin1.id, "admin"],
    );
    await exec(
      db,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [admin2.id, "admin"],
    );
    await exec(
      db,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [admin1.id, "attendee"],
    );
    const rejected = await attempt(
      db,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [admin2.id, "presenter"],
    );
    const remainingAdmin = await exec(
      db,
      "select role from public.app_users where id = $1",
      [admin2.id],
    );

    expect(rejected?.message).toMatch(/at least one admin/i);
    expect(remainingAdmin[0]?.role).toBe("admin");
  });

  test("initial admin bootstrap assigns legacy talks and does not replace an admin", async () => {
    const db = await createDb();
    const initialAdmin = await makeUser(db, "initial-admin@example.com");
    const otherUser = await makeUser(db, "other@example.com");
    const legacyTalkId = await seedTalk(db, "Legacy talk", [
      "attendee@example.com",
    ]);

    const bootstrapped = await exec(
      db,
      "select public.bootstrap_initial_admin($1) as admin_id",
      [initialAdmin.email],
    );
    const legacyTalk = await exec(
      db,
      "select created_by from public.talks where id = $1",
      [legacyTalkId],
    );
    const secondBootstrap = await exec(
      db,
      "select public.bootstrap_initial_admin($1) as admin_id",
      [otherUser.email],
    );
    const otherRole = await exec(
      db,
      "select role from public.app_users where id = $1",
      [otherUser.id],
    );

    expect(bootstrapped[0]?.admin_id).toBe(initialAdmin.id);
    expect(legacyTalk[0]?.created_by).toBe(initialAdmin.id);
    expect(secondBootstrap[0]?.admin_id).toBeNull();
    expect(otherRole[0]?.role).toBe("attendee");
  });

  test("deleting the last admin account is rejected", async () => {
    const db = await createDb();
    const admin = await makeUser(db, "admin@example.com");
    await exec(
      db,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [admin.id, "admin"],
    );

    const rejected = await attempt(db, "delete from auth.users where id = $1", [
      admin.id,
    ]);
    const userStillExists = await exec(
      db,
      "select id from auth.users where id = $1",
      [admin.id],
    );

    expect(rejected?.message).toMatch(/at least one admin/i);
    expect(userStillExists).toHaveLength(1);
  });

  test("authenticated users cannot change roles directly or invoke the admin role function", async () => {
    const db = await createDb();
    const user = await makeUser(db, "user@example.com");

    const directUpdate = await attemptAs(
      db,
      user,
      "update public.app_users set role = 'admin' where id = $1 returning role",
      [user.id],
    );
    const storedRole = await exec(
      db,
      "select role from public.app_users where id = $1",
      [user.id],
    );
    const roleFunction = await attemptAs(
      db,
      user,
      "select public.change_app_user_role($1, $2::public.app_role)",
      [user.id, "admin"],
    );

    expect(directUpdate?.message).toMatch(/permission denied/i);
    expect(storedRole[0]?.role).toBe("attendee");
    expect(roleFunction?.message).toMatch(/permission denied/i);
  });
});

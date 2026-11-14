import { describe, expect, test } from "vitest";

import {
  attempt,
  createDb,
  exec,
  makeUser,
  seedCloudActivity,
  seedTalk,
  setStatus,
  type Db,
} from "./harness";

async function addIdea(
  db: Db,
  activityId: string,
  userId: string,
  body = "better onboarding",
): Promise<string> {
  const id = crypto.randomUUID();
  await db.query(
    "insert into public.cloud_answers (id, activity_id, user_id, body) values ($1, $2, $3, $4)",
    [id, activityId, userId, body],
  );
  return id;
}

async function addGuest(
  db: Db,
  talkId: string,
  username = "Sam",
): Promise<string> {
  const id = crypto.randomUUID();
  await db.query(
    "insert into public.talk_guests (id, talk_id, username, username_normalized, token_hash) values ($1, $2, $3, $4, $5)",
    [id, talkId, username, username.toLowerCase(), `hash-${id}`],
  );
  return id;
}

describe("idea cloud migration", () => {
  test("creates the cloud module tables", async () => {
    const db = await createDb();
    const rows = await exec(
      db,
      `select c.relname as table_name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    for (const table of ["cloud_activities", "cloud_answers"]) {
      expect(
        rows.find((row) => row.table_name === table),
        `table ${table} exists`,
      ).toBeDefined();
    }
  });

  test("activities accepts cloud", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedCloudActivity(db, talkId);

    const stored = await exec(
      db,
      "select type, status from public.activities where id = $1",
      [activityId],
    );

    expect(stored[0]).toEqual({ type: "cloud", status: "ready" });
  });

  test("the prompt is frozen after launch", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedCloudActivity(db, talkId);

    await exec(
      db,
      "update public.cloud_activities set prompt = 'Updated' where activity_id = $1",
      [activityId],
    );
    await setStatus(db, activityId, "active");
    const frozen = await attempt(
      db,
      "update public.cloud_activities set prompt = 'Too late' where activity_id = $1",
      [activityId],
    );

    expect(frozen?.message).toMatch(/frozen after launch/);
  });

  test("ideas are accepted only while the activity is active", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const readyTalk = await seedTalk(db, "Ready talk", [user.email]);
    const activeTalk = await seedTalk(db, "Active talk", [user.email]);
    const closedTalk = await seedTalk(db, "Closed talk", [user.email]);

    const ready = await seedCloudActivity(db, readyTalk);
    const readyInsert = await attempt(
      db,
      "insert into public.cloud_answers (activity_id, user_id, body) values ($1, $2, 'Too early')",
      [ready, user.id],
    );

    const active = await seedCloudActivity(db, activeTalk, {
      status: "active",
    });
    const activeInsert = await attempt(
      db,
      "insert into public.cloud_answers (activity_id, user_id, body) values ($1, $2, 'Just right')",
      [active, user.id],
    );

    const closed = await seedCloudActivity(db, closedTalk, {
      status: "closed",
    });
    const closedInsert = await attempt(
      db,
      "insert into public.cloud_answers (activity_id, user_id, body) values ($1, $2, 'Too late')",
      [closed, user.id],
    );

    expect(readyInsert?.message).toMatch(
      /only accepted while the activity is active/,
    );
    expect(activeInsert).toBeNull();
    expect(closedInsert?.message).toMatch(
      /only accepted while the activity is active/,
    );
  });

  test("one attendee can submit only one idea", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedCloudActivity(db, talkId, {
      status: "active",
    });

    await addIdea(db, activityId, user.id);
    const duplicate = await attempt(
      db,
      "insert into public.cloud_answers (activity_id, user_id, body) values ($1, $2, 'Second idea')",
      [activityId, user.id],
    );

    expect(duplicate?.message).toMatch(/cloud_answers_activity_user_unique/);
  });

  test("a guest can submit only one idea", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const activityId = await seedCloudActivity(db, talkId, {
      status: "active",
    });
    const guestId = await addGuest(db, talkId);

    await db.query(
      "insert into public.cloud_answers (activity_id, guest_id, body) values ($1, $2, 'Guest idea')",
      [activityId, guestId],
    );
    const duplicate = await attempt(
      db,
      "insert into public.cloud_answers (activity_id, guest_id, body) values ($1, $2, 'Second idea')",
      [activityId, guestId],
    );

    expect(duplicate?.message).toMatch(/cloud_answers_activity_guest_unique/);
  });

  test("ideas are immutable and cannot be deleted directly", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedCloudActivity(db, talkId, {
      status: "active",
    });
    const ideaId = await addIdea(db, activityId, user.id);

    const update = await attempt(
      db,
      "update public.cloud_answers set body = 'Changed' where id = $1",
      [ideaId],
    );
    const remove = await attempt(
      db,
      "delete from public.cloud_answers where id = $1",
      [ideaId],
    );

    expect(update?.message).toMatch(/ideas are immutable/);
    expect(remove?.message).toMatch(/cannot be deleted directly/);
  });

  test("deleting a user or guest removes their idea", async () => {
    const db = await createDb();
    const user = await makeUser(db, "member@example.com");
    const talkId = await seedTalk(db, "Talk", [user.email]);
    const activityId = await seedCloudActivity(db, talkId, {
      status: "active",
    });
    const guestId = await addGuest(db, talkId);

    await addIdea(db, activityId, user.id, "User idea");
    await db.query(
      "insert into public.cloud_answers (activity_id, guest_id, body) values ($1, $2, 'Guest idea')",
      [activityId, guestId],
    );

    await exec(db, "delete from auth.users where id = $1", [user.id]);
    await exec(db, "delete from public.talk_guests where id = $1", [guestId]);

    const remaining = await exec(
      db,
      "select id from public.cloud_answers where activity_id = $1",
      [activityId],
    );
    expect(remaining).toEqual([]);
  });
});

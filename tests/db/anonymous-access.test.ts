import { describe, expect, test } from "vitest";

import {
  attempt,
  attemptAs,
  createDb,
  exec,
  makeUser,
  seedPoll,
  seedTalk,
  seedTextActivity,
  setStatus,
  type Db,
} from "./harness";

async function addGuest(
  db: Db,
  talkId: string,
  username = "Sam",
): Promise<string> {
  const id = crypto.randomUUID();
  await db.query(
    `insert into public.talk_guests
       (id, talk_id, username, username_normalized, token_hash)
     values ($1, $2, $3, $4, $5)`,
    [id, talkId, username, username.toLowerCase(), `hash-${id}`],
  );
  return id;
}

describe("anonymous talk access migration", () => {
  test("talks are private with anonymous joining open by default", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);

    const rows = await exec(
      db,
      "select is_public, anonymous_join_open from public.talks where id = $1",
      [talkId],
    );

    expect(rows[0]).toEqual({
      is_public: false,
      anonymous_join_open: true,
    });
  });

  test("creates the guest table and keeps usernames unique per talk", async () => {
    const db = await createDb();
    const firstTalk = await seedTalk(db, "First", []);
    const secondTalk = await seedTalk(db, "Second", []);

    await addGuest(db, firstTalk, "Sam");
    const duplicate = await attempt(
      db,
      `insert into public.talk_guests
         (talk_id, username, username_normalized, token_hash)
       values ($1, 'SAM', 'sam', 'other-hash')`,
      [firstTalk],
    );
    const otherTalk = await attempt(
      db,
      `insert into public.talk_guests
         (talk_id, username, username_normalized, token_hash)
       values ($1, 'Sam', 'sam', 'other-hash')`,
      [secondTalk],
    );

    expect(duplicate?.message).toMatch(
      /duplicate key value violates unique constraint "talk_guests_talk_username_unique"/,
    );
    expect(otherTalk).toBeNull();
  });

  test("API roles cannot read or write guest rows", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const guestId = await addGuest(db, talkId);
    const user = await makeUser(db, "member@example.com");

    const read = await attemptAs(
      db,
      user,
      "select id from public.talk_guests where id = $1",
      [guestId],
    );
    const write = await attemptAs(
      db,
      user,
      `insert into public.talk_guests
         (talk_id, username, username_normalized, token_hash)
       values ($1, 'Other', 'other', 'hash')`,
      [talkId],
    );

    expect(read?.message).toMatch(/permission denied/i);
    expect(write?.message).toMatch(/permission denied/i);
  });

  test("a guest votes once and their vote is counted", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const guestId = await addGuest(db, talkId);
    const { pollId, optionIds } = await seedPoll(db, talkId);
    await setStatus(db, pollId, "active");

    await exec(
      db,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );
    const duplicate = await attempt(
      db,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[1]],
    );
    const counts = await exec(
      db,
      "select votes from public.poll_vote_counts where poll_id = $1 and option_id = $2",
      [pollId, optionIds[0]],
    );

    expect(duplicate?.message).toMatch(
      /duplicate key value violates unique constraint/,
    );
    expect(Number(counts[0]?.votes)).toBe(1);
  });

  test("a vote must have exactly one voter identity", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const user = await makeUser(db, "member@example.com");
    const guestId = await addGuest(db, talkId);
    const { pollId, optionIds } = await seedPoll(db, talkId);
    await setStatus(db, pollId, "active");

    const neither = await attempt(
      db,
      "insert into public.poll_votes (poll_id, option_id) values ($1, $2)",
      [pollId, optionIds[0]],
    );
    const both = await attempt(
      db,
      "insert into public.poll_votes (poll_id, user_id, guest_id, option_id) values ($1, $2, $3, $4)",
      [pollId, user.id, guestId, optionIds[0]],
    );

    expect(neither?.message).toMatch(
      /violates not-null constraint|poll_votes_one_voter/,
    );
    expect(both?.message).toMatch(/poll_votes_one_voter/);
  });

  test("deleting a guest removes their vote and decrements the count", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const guestId = await addGuest(db, talkId);
    const { pollId, optionIds } = await seedPoll(db, talkId);
    await setStatus(db, pollId, "active");
    await exec(
      db,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );

    await exec(db, "delete from public.talk_guests where id = $1", [guestId]);

    const counts = await exec(
      db,
      "select votes from public.poll_vote_counts where poll_id = $1 and option_id = $2",
      [pollId, optionIds[0]],
    );
    expect(Number(counts[0]?.votes)).toBe(0);
  });

  test("a guest answers a text activity once", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const guestId = await addGuest(db, talkId);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });

    await exec(
      db,
      "insert into public.text_answers (activity_id, guest_id, body) values ($1, $2, 'Guest answer')",
      [activityId, guestId],
    );
    const duplicate = await attempt(
      db,
      "insert into public.text_answers (activity_id, guest_id, body) values ($1, $2, 'Again')",
      [activityId, guestId],
    );
    const answers = await exec(
      db,
      "select guest_id, body from public.text_answers where activity_id = $1",
      [activityId],
    );

    expect(duplicate?.message).toMatch(
      /duplicate key value violates unique constraint/,
    );
    expect(answers).toEqual([{ guest_id: guestId, body: "Guest answer" }]);
  });

  test("deleting a guest removes their text answer", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const guestId = await addGuest(db, talkId);
    const activityId = await seedTextActivity(db, talkId, { status: "active" });
    await exec(
      db,
      "insert into public.text_answers (activity_id, guest_id, body) values ($1, $2, 'Guest answer')",
      [activityId, guestId],
    );

    await exec(db, "delete from public.talk_guests where id = $1", [guestId]);

    const answers = await exec(
      db,
      "select id from public.text_answers where activity_id = $1",
      [activityId],
    );
    expect(answers).toHaveLength(0);
  });

  test("deleting a talk removes its guests, votes, and answers", async () => {
    const db = await createDb();
    const talkId = await seedTalk(db, "Talk", []);
    const textTalkId = await seedTalk(db, "Text talk", []);
    const guestId = await addGuest(db, talkId);
    const textGuestId = await addGuest(db, textTalkId, "Alex");
    const { pollId, optionIds } = await seedPoll(db, talkId);
    const activityId = await seedTextActivity(db, textTalkId, {
      status: "active",
    });
    await setStatus(db, pollId, "active");
    await exec(
      db,
      "insert into public.poll_votes (poll_id, guest_id, option_id) values ($1, $2, $3)",
      [pollId, guestId, optionIds[0]],
    );
    await exec(
      db,
      "insert into public.text_answers (activity_id, guest_id, body) values ($1, $2, 'Guest answer')",
      [activityId, textGuestId],
    );

    await exec(db, "delete from public.talks where id = any($1::uuid[])", [
      [talkId, textTalkId],
    ]);
    const remaining = await exec(
      db,
      `select
         (select count(*)::int from public.talk_guests) as guests,
         (select count(*)::int from public.poll_votes) as votes,
         (select count(*)::int from public.text_answers) as answers`,
    );

    expect(remaining[0]).toEqual({ guests: 0, votes: 0, answers: 0 });
  });
});

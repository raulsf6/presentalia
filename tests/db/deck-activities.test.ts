import { beforeAll, describe, expect, test } from "vitest";

import {
  attempt,
  createDb,
  exec,
  makeUser,
  seedPoll,
  seedTalk,
  type Db,
} from "./harness";

let db: Db;
let ownerId: string;

beforeAll(async () => {
  db = await createDb();
  const owner = await makeUser(db, "owner@example.com");
  ownerId = owner.id;
});

async function newTalk(): Promise<string> {
  return seedTalk(db, "Deck talk", [], ownerId);
}

async function place(
  activityId: string,
  afterSlide: number,
  position = 0,
): Promise<{ message: string } | null> {
  return attempt(
    db,
    `insert into public.talk_deck_activities (activity_id, after_slide, position)
     values ($1, $2, $3)`,
    [activityId, afterSlide, position],
  );
}

describe("activity status: ready replaces draft", () => {
  test("a new activity is created ready", async () => {
    const talkId = await newTalk();
    const id = crypto.randomUUID();
    await exec(
      db,
      `insert into public.activities (id, talk_id, type) values ($1, $2, 'poll')`,
      [id, talkId],
    );
    const [row] = await exec(
      db,
      "select status from public.activities where id = $1",
      [id],
    );
    expect(row).toEqual({ status: "ready" });
  });

  test("draft is no longer a valid status", async () => {
    const talkId = await newTalk();
    const failure = await attempt(
      db,
      `insert into public.activities (id, talk_id, type, status)
       values ($1, $2, 'poll', 'draft')`,
      [crypto.randomUUID(), talkId],
    );
    expect(failure?.message).toMatch(/activities_status_check/);
  });

  test("ready -> active is allowed and active -> ready is not", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);
    await exec(
      db,
      "update public.activities set status = 'active' where id = $1",
      [pollId],
    );
    const backwards = await attempt(
      db,
      "update public.activities set status = 'ready' where id = $1",
      [pollId],
    );
    expect(backwards?.message).toMatch(/invalid activity status transition/);
  });
});

describe("talk_deck_activities", () => {
  test("stores a placement after a slide", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);
    expect(await place(pollId, 7)).toBeNull();

    const [row] = await exec(
      db,
      `select activity_id, after_slide, position
       from public.talk_deck_activities where activity_id = $1`,
      [pollId],
    );
    expect(row).toEqual({
      activity_id: pollId,
      after_slide: 7,
      position: 0,
    });
  });

  test("an activity can only be placed once", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);
    await place(pollId, 3);
    const failure = await place(pollId, 5);
    expect(failure?.message).toMatch(/talk_deck_activities_pkey/);
  });

  test("a placement cannot sit before the first slide", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);
    const failure = await place(pollId, 0);
    expect(failure?.message).toMatch(/talk_deck_activities_after_slide_check/);
  });

  test("deleting the activity removes its placement", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);
    await place(pollId, 2);

    await exec(db, "delete from public.activities where id = $1", [pollId]);

    const rows = await exec(
      db,
      "select 1 from public.talk_deck_activities where activity_id = $1",
      [pollId],
    );
    expect(rows).toEqual([]);
  });
});

describe("talks.current_activity_id", () => {
  test("points at the step on screen and clears when the activity goes", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(db, talkId);

    await exec(
      db,
      "update public.talks set current_activity_id = $2 where id = $1",
      [talkId, pollId],
    );
    const [current] = await exec(
      db,
      "select current_activity_id from public.talks where id = $1",
      [talkId],
    );
    expect(current).toEqual({ current_activity_id: pollId });

    await exec(db, "delete from public.activities where id = $1", [pollId]);
    const [cleared] = await exec(
      db,
      "select current_activity_id from public.talks where id = $1",
      [talkId],
    );
    expect(cleared).toEqual({ current_activity_id: null });
  });
});

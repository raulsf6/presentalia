import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import {
  clampSlide,
  clearSlides,
  markSlidesUploaded,
  moveSlide,
  readSlideState,
  reportSlideCount,
  slideStateFromTalk,
} from "@/lib/deck/slide-state";
import {
  createDb,
  makeUser,
  placeActivity,
  seedPoll,
  seedTalk,
  seedTextActivity,
  type Db as TestDb,
} from "../../db/harness";

let pglite: TestDb;
let db: Db;
let ownerId: string;

beforeAll(async () => {
  pglite = await createDb();
  db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  ownerId = owner.id;
});

/** Each test gets its own talk; the database is shared to keep the suite fast. */
function newTalk(): Promise<string> {
  return seedTalk(pglite, "Slides talk", [], ownerId);
}

describe("clampSlide", () => {
  test("never goes below the first slide", () => {
    expect(clampSlide(0, null)).toBe(1);
    expect(clampSlide(-3, 10)).toBe(1);
  });

  test("clamps to the known count", () => {
    expect(clampSlide(9, 5)).toBe(5);
    expect(clampSlide(3, 5)).toBe(3);
  });

  test("keeps the page when the count is unknown", () => {
    expect(clampSlide(42, null)).toBe(42);
  });
});

describe("slide position", () => {
  test("a new talk starts at the first slide with no count", async () => {
    const talkId = await newTalk();
    expect(await readSlideState(talkId, db)).toEqual({
      slide: 1,
      count: null,
      revision: 0,
      slidesUpdatedAt: null,
      activity: null,
      live: null,
    });
  });

  test("next advances and bumps the revision", async () => {
    const talkId = await newTalk();
    expect(await moveSlide(talkId, "next", db)).toEqual({
      slide: 2,
      count: null,
      revision: 1,
      activity: null,
      live: null,
    });
    expect(await moveSlide(talkId, "next", db)).toEqual({
      slide: 3,
      count: null,
      revision: 2,
      activity: null,
      live: null,
    });
  });

  test("previous stops at the first slide but still bumps the revision", async () => {
    const talkId = await newTalk();
    expect(await moveSlide(talkId, "previous", db)).toEqual({
      slide: 1,
      count: null,
      revision: 1,
      activity: null,
      live: null,
    });
  });

  test("next stops at the reported count", async () => {
    const talkId = await newTalk();
    await reportSlideCount(talkId, 2, db);
    await moveSlide(talkId, "next", db);
    expect((await moveSlide(talkId, "next", db))?.slide).toBe(2);
  });

  test("returns null for an unknown talk", async () => {
    const missing = crypto.randomUUID();
    expect(await readSlideState(missing, db)).toBeNull();
    expect(await moveSlide(missing, "next", db)).toBeNull();
    expect(await reportSlideCount(missing, 3, db)).toBeNull();
    expect(await markSlidesUploaded(missing, db)).toBe(false);
  });
});

describe("reportSlideCount", () => {
  test("stores the count and clamps the current slide into it", async () => {
    const talkId = await newTalk();
    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);

    const reported = await reportSlideCount(talkId, 2, db);
    expect(reported).toEqual({
      slide: 2,
      count: 2,
      revision: 3,
      activity: null,
      live: null,
    });

    const state = await readSlideState(talkId, db);
    expect(state?.slide).toBe(2);
    expect(state?.count).toBe(2);
  });

  test("an unchanged report does not bump the revision", async () => {
    const talkId = await newTalk();
    await reportSlideCount(talkId, 7, db);
    const before = await readSlideState(talkId, db);
    const again = await reportSlideCount(talkId, 7, db);

    expect(again?.revision).toBe(before?.revision);
  });
});

describe("markSlidesUploaded", () => {
  test("resets the position and count and bumps the revision", async () => {
    const talkId = await newTalk();
    await reportSlideCount(talkId, 9, db);
    await moveSlide(talkId, "next", db);

    expect(await markSlidesUploaded(talkId, db)).toBe(true);

    const state = await readSlideState(talkId, db);
    expect(state?.slide).toBe(1);
    expect(state?.count).toBeNull();
    expect(state?.slidesUpdatedAt).not.toBeNull();
    expect(state?.revision).toBe(3);
  });
});

describe("slideStateFromTalk", () => {
  test("clamps a stale page to the current count", () => {
    const talk: TalkRow = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Slides talk",
      description: null,
      heldAt: null,
      slidesUpdatedAt: null,
      currentSlide: 8,
      currentActivityId: null,
      slideCount: 5,
      slideRevision: 4,
      createdBy: null,
      isPublic: false,
      anonymousJoinOpen: true,
      createdAt: new Date(),
    };

    const state = slideStateFromTalk(talk);

    expect(state.slide).toBe(5);
    expect(state.count).toBe(5);
    expect(state.revision).toBe(4);
  });
});

describe("stepping through activities", () => {
  test("next lands on the activity placed after the page", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 3);

    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    const step = await moveSlide(talkId, "next", db);

    expect(step).toMatchObject({
      slide: 3,
      activity: {
        id: pollId,
        type: "poll",
        status: "ready",
        question: "Which framework wins?",
      },
    });
  });

  test("next from an activity moves to the following page", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 3);
    await reportSlideCount(talkId, 9, db);

    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    const step = await moveSlide(talkId, "next", db);

    expect(step).toEqual({
      slide: 4,
      count: 9,
      revision: 5,
      activity: null,
      live: null,
    });
  });

  test("several activities in one gap are visited in order", async () => {
    const talkId = await newTalk();
    const first = await seedPoll(pglite, talkId, { options: ["A", "B"] });
    const second = await seedTextActivity(pglite, talkId);
    await placeActivity(pglite, first.pollId, 2, 0);
    await placeActivity(pglite, second, 2, 1);

    await moveSlide(talkId, "next", db);
    expect((await moveSlide(talkId, "next", db))?.activity?.id).toBe(
      first.pollId,
    );
    expect((await moveSlide(talkId, "next", db))?.activity?.id).toBe(second);
    expect((await moveSlide(talkId, "next", db))?.slide).toBe(3);
  });

  test("previous from a page steps back onto the last activity in the gap", async () => {
    const talkId = await newTalk();
    const first = await seedPoll(pglite, talkId);
    const second = await seedTextActivity(pglite, talkId);
    await placeActivity(pglite, first.pollId, 3, 0);
    await placeActivity(pglite, second, 3, 1);
    await reportSlideCount(talkId, 9, db);
    for (let i = 0; i < 5; i += 1) {
      await moveSlide(talkId, "next", db);
    }
    expect((await readSlideState(talkId, db))?.slide).toBe(4);

    expect((await moveSlide(talkId, "previous", db))?.activity?.id).toBe(
      second,
    );
    expect((await moveSlide(talkId, "previous", db))?.activity?.id).toBe(
      first.pollId,
    );
    const page = await moveSlide(talkId, "previous", db);
    expect(page).toMatchObject({ slide: 3, activity: null });
  });

  test("previous at the first page ignores the gap after it", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 1);

    expect(await moveSlide(talkId, "previous", db)).toMatchObject({
      slide: 1,
      activity: null,
      revision: 1,
    });
  });

  test("next at the last page does not re-enter a gap", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 2);
    await reportSlideCount(talkId, 2, db);
    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db); // the activity after page 2
    const end = await moveSlide(talkId, "next", db);

    expect(end).toMatchObject({ slide: 2, activity: null });
    expect((await moveSlide(talkId, "next", db))?.activity).toBeNull();
  });
});

describe("live activity in the state", () => {
  test("reports an activity that is live but not on screen", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 4);
    await pglite.query(
      "update public.activities set status = 'active', launched_at = now() where id = $1",
      [pollId],
    );

    const state = await readSlideState(talkId, db);
    expect(state?.live).toEqual({
      id: pollId,
      type: "poll",
      status: "active",
      question: "Which framework wins?",
    });

    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    await moveSlide(talkId, "next", db);
    const onScreen = await readSlideState(talkId, db);
    expect(onScreen?.activity?.status).toBe("active");
    expect(onScreen?.live).toBeNull();
  });
});

describe("uploading a deck", () => {
  test("clears placements and the current activity", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 1);
    await moveSlide(talkId, "next", db);
    expect((await readSlideState(talkId, db))?.activity?.id).toBe(pollId);

    await markSlidesUploaded(talkId, db);

    const state = await readSlideState(talkId, db);
    expect(state?.slide).toBe(1);
    expect(state?.activity).toBeNull();
    const placements = await pglite.query(
      "select 1 from public.talk_deck_activities where activity_id = $1",
      [pollId],
    );
    expect(placements.rows).toEqual([]);
  });
});

describe("removing the deck", () => {
  test("clears the file, the plan and the current step", async () => {
    const talkId = await newTalk();
    const { pollId } = await seedPoll(pglite, talkId);
    await placeActivity(pglite, pollId, 1);
    await reportSlideCount(talkId, 8, db);
    await moveSlide(talkId, "next", db);
    const before = await readSlideState(talkId, db);
    expect(before?.activity?.id).toBe(pollId);

    expect(await clearSlides(talkId, db)).toBe(true);

    const state = await readSlideState(talkId, db);
    expect(state).toMatchObject({
      slide: 1,
      count: null,
      activity: null,
      live: null,
      slidesUpdatedAt: null,
    });
    expect(state?.revision).toBe((before?.revision ?? 0) + 1);
    const placements = await pglite.query(
      "select 1 from public.talk_deck_activities where activity_id = $1",
      [pollId],
    );
    expect(placements.rows).toEqual([]);
  });

  test("returns false for an unknown talk", async () => {
    expect(await clearSlides(crypto.randomUUID(), db)).toBe(false);
  });
});

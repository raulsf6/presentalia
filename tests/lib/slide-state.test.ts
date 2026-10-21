import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import {
  clampSlide,
  markSlidesUploaded,
  moveSlide,
  readSlideState,
  reportSlideCount,
  slideStateFromTalk,
} from "@/lib/slide-state";
import { createDb, makeUser, seedTalk, type Db as TestDb } from "../db/harness";

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
    });
  });

  test("next advances and bumps the revision", async () => {
    const talkId = await newTalk();
    expect(await moveSlide(talkId, "next", db)).toEqual({
      slide: 2,
      count: null,
      revision: 1,
    });
    expect(await moveSlide(talkId, "next", db)).toEqual({
      slide: 3,
      count: null,
      revision: 2,
    });
  });

  test("previous stops at the first slide but still bumps the revision", async () => {
    const talkId = await newTalk();
    expect(await moveSlide(talkId, "previous", db)).toEqual({
      slide: 1,
      count: null,
      revision: 1,
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
    expect(reported).toEqual({ slide: 2, count: 2, revision: 3 });

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

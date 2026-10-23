import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { loadDeckPlan, saveDeckPlan } from "@/lib/deck/deck-plan";
import { moveSlide, readSlideState } from "@/lib/deck/slide-state";
import {
  createDb,
  exec,
  makeUser,
  placeActivity,
  seedPoll,
  seedTalk,
  setStatus,
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

function newTalk(): Promise<string> {
  return seedTalk(pglite, "Deck talk", [], ownerId);
}

async function placements(
  talkId: string,
): Promise<{ activityId: string; afterSlide: number; position: number }[]> {
  const rows = await exec(
    pglite,
    `select d.activity_id, d.after_slide, d.position
     from public.talk_deck_activities d
     join public.activities a on a.id = d.activity_id
     where a.talk_id = $1
     order by d.after_slide, d.position`,
    [talkId],
  );
  return rows.map((row) => ({
    activityId: row.activity_id as string,
    afterSlide: row.after_slide as number,
    position: row.position as number,
  }));
}

describe("saveDeckPlan", () => {
  test("stores placements with their order inside each gap", async () => {
    const talkId = await newTalk();
    const first = await seedPoll(pglite, talkId);
    const second = await seedPoll(pglite, talkId);
    const third = await seedPoll(pglite, talkId);

    const result = await saveDeckPlan(
      talkId,
      {
        pageCount: 9,
        placements: [
          { activityId: first.pollId, afterSlide: 4 },
          { activityId: second.pollId, afterSlide: 2 },
          { activityId: third.pollId, afterSlide: 4 },
        ],
      },
      db,
    );

    expect(result).toEqual({ ok: true });
    expect(await placements(talkId)).toEqual([
      { activityId: second.pollId, afterSlide: 2, position: 0 },
      { activityId: first.pollId, afterSlide: 4, position: 0 },
      { activityId: third.pollId, afterSlide: 4, position: 1 },
    ]);
  });

  test("replaces the whole plan", async () => {
    const talkId = await newTalk();
    const first = await seedPoll(pglite, talkId);
    const second = await seedPoll(pglite, talkId);
    await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: first.pollId, afterSlide: 2 }],
      },
      db,
    );

    await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: second.pollId, afterSlide: 3 }],
      },
      db,
    );

    expect(await placements(talkId)).toEqual([
      { activityId: second.pollId, afterSlide: 3, position: 0 },
    ]);
  });

  test("stores the page count once, without bumping the revision twice", async () => {
    const talkId = await newTalk();
    await saveDeckPlan(talkId, { pageCount: 7, placements: [] }, db);
    const state = await readSlideState(talkId, db);
    expect(state?.count).toBe(7);
    expect(state?.revision).toBe(1);
  });

  test("rejects an activity that belongs to another talk", async () => {
    const talkId = await newTalk();
    const otherTalk = await newTalk();
    const foreign = await seedPoll(pglite, otherTalk);

    const result = await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: foreign.pollId, afterSlide: 2 }],
      },
      db,
    );

    expect(result).toMatchObject({ ok: false });
    expect(await placements(talkId)).toEqual([]);
  });

  test("rejects a live activity that was never placed", async () => {
    const talkId = await newTalk();
    const live = await seedPoll(pglite, talkId);
    await pglite.query(
      "update public.activities set status = 'active', launched_at = now() where id = $1",
      [live.pollId],
    );

    const result = await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: live.pollId, afterSlide: 2 }],
      },
      db,
    );

    expect(result).toMatchObject({ ok: false });
  });

  test("keeps a placed activity that has since gone live", async () => {
    const talkId = await newTalk();
    const live = await seedPoll(pglite, talkId);
    await placeActivity(pglite, live.pollId, 2);
    await pglite.query(
      "update public.activities set status = 'active', launched_at = now() where id = $1",
      [live.pollId],
    );

    const result = await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: live.pollId, afterSlide: 3 }],
      },
      db,
    );

    expect(result).toEqual({ ok: true });
    expect(await placements(talkId)).toEqual([
      { activityId: live.pollId, afterSlide: 3, position: 0 },
    ]);
  });

  test("rejects duplicates", async () => {
    const talkId = await newTalk();
    const activity = await seedPoll(pglite, talkId);

    const result = await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [
          { activityId: activity.pollId, afterSlide: 2 },
          { activityId: activity.pollId, afterSlide: 3 },
        ],
      },
      db,
    );

    expect(result).toMatchObject({ ok: false });
  });

  test("rejects a gap outside the deck", async () => {
    const talkId = await newTalk();
    const activity = await seedPoll(pglite, talkId);

    for (const afterSlide of [0, 5]) {
      const result = await saveDeckPlan(
        talkId,
        {
          pageCount: 5,
          placements: [{ activityId: activity.pollId, afterSlide }],
        },
        db,
      );
      expect(result).toMatchObject({ ok: false });
    }
  });

  test("clears a step the new plan moves or removes", async () => {
    const talkId = await newTalk();
    const activity = await seedPoll(pglite, talkId);
    await placeActivity(pglite, activity.pollId, 1);
    await moveSlide(talkId, "next", db);
    expect((await readSlideState(talkId, db))?.activity?.id).toBe(
      activity.pollId,
    );

    await saveDeckPlan(
      talkId,
      {
        pageCount: 5,
        placements: [{ activityId: activity.pollId, afterSlide: 2 }],
      },
      db,
    );

    const state = await readSlideState(talkId, db);
    expect(state?.slide).toBe(1);
    expect(state?.activity).toBeNull();
  });
});

describe("loadDeckPlan", () => {
  test("hands the editor every activity, with its status and placement", async () => {
    const talkId = await newTalk();
    const ready = await seedPoll(pglite, talkId);
    const closed = await seedPoll(pglite, talkId, { options: ["C", "D"] });
    await setStatus(pglite, closed.pollId, "closed");
    await placeActivity(pglite, closed.pollId, 2);

    const plan = await loadDeckPlan(talkId, db);

    expect(
      plan.activities.map((activity) => ({
        status: activity.status,
        question: activity.question,
      })),
    ).toEqual([
      { status: "ready", question: "Which framework wins?" },
      { status: "closed", question: "Which framework wins?" },
    ]);
    expect(plan.placements).toEqual([
      { activityId: closed.pollId, afterSlide: 2, position: 0 },
    ]);
    expect(plan.activities[0].id).toBe(ready.pollId);
  });
});

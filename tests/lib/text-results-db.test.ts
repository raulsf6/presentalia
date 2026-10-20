import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import type { TalkAccess } from "@/lib/membership";
import { loadTextResults } from "@/lib/text-results";
import {
  createDb,
  makeUser,
  seedTalk,
  seedTextActivity,
  setStatus,
} from "../db/harness";

type Setup = {
  db: Db;
  pglite: Awaited<ReturnType<typeof createDb>>;
  activityId: string;
  talkId: string;
  member: { id: string; email: string };
  other: { id: string; email: string };
  memberAccess: TalkAccess;
  managerAccess: TalkAccess;
};

async function setup(identifiable = false): Promise<Setup> {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  const member = await makeUser(pglite, "member@example.com");
  const other = await makeUser(pglite, "other@example.com");
  const talkId = await seedTalk(
    pglite,
    "Talk",
    [member.email, other.email],
    owner.id,
  );
  const activityId = await seedTextActivity(pglite, talkId, {
    status: "active",
    identifiable,
  });

  const talk = { id: talkId } as TalkRow;
  const memberViewer: SessionUser = {
    id: member.id,
    email: member.email,
    role: "attendee",
  };
  const managerViewer: SessionUser = {
    id: owner.id,
    email: owner.email,
    role: "presenter",
  };

  return {
    db,
    pglite,
    activityId,
    talkId,
    member,
    other,
    memberAccess: { user: memberViewer, talk, access: "member" },
    managerAccess: { user: managerViewer, talk, access: "presenter" },
  };
}

async function answer(
  f: Setup,
  user: { id: string; email: string },
  body: string,
) {
  const id = crypto.randomUUID();
  await f.pglite.query(
    "insert into public.text_answers (id, activity_id, user_id, body) values ($1, $2, $3, $4)",
    [id, f.activityId, user.id, body],
  );
  return id;
}

async function publishedRanking(
  f: Setup,
  rows: {
    answerId: string;
    rank: number | null;
    rationale?: string;
    dropReason?: string;
  }[],
) {
  const runId = crypto.randomUUID();
  await f.pglite.query(
    `insert into public.text_ranking_runs
       (id, activity_id, status, model, prompt_version, criteria_snapshot,
        answer_count, summary, finished_at, published_at)
     values ($1, $2, 'succeeded', 'openai/test', 'text-ranking-v1',
             'Most actionable', $3, 'Ship the small thing first.', now(), now())`,
    [runId, f.activityId, rows.length],
  );
  for (const row of rows) {
    await f.pglite.query(
      `insert into public.text_rankings
         (run_id, answer_id, rank, score, rationale, drop_reason)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        runId,
        row.answerId,
        row.rank,
        row.dropReason ? null : 90,
        row.rationale ?? null,
        row.dropReason ?? null,
      ],
    );
  }
}

describe("loadTextResults", () => {
  let f: Setup;

  beforeEach(async () => {
    f = await setup();
  });

  test("an active member sees the waiting state for the real activity", async () => {
    await answer(f, f.other, "Talk to users first.");

    const payload = await loadTextResults(f.activityId, f.memberAccess.user, {
      db: f.db,
      access: f.memberAccess,
    });

    expect(payload?.mode).toBe("waiting");
    expect(payload?.needsVote).toBe(true);
    expect(payload?.rows).toEqual([]);
    expect(payload?.activity.totalAnswers).toBe(1);
  });

  test("manager previews all answers while locked, attendees do not", async () => {
    const first = await answer(f, f.member, "Ship the small thing.");
    const second = await answer(f, f.other, "Talk to users first.");
    await setStatus(f.pglite, f.activityId, "locked");
    await f.pglite.query(
      `insert into public.text_ranking_runs
         (activity_id, prompt_version, criteria_snapshot, answer_count)
       values ($1, 'text-ranking-v1', 'Most actionable', 2)`,
      [f.activityId],
    );

    const manager = await loadTextResults(f.activityId, f.managerAccess.user, {
      db: f.db,
      access: f.managerAccess,
    });
    const member = await loadTextResults(f.activityId, f.memberAccess.user, {
      db: f.db,
      access: f.memberAccess,
    });

    expect(manager?.mode).toBe("ranking");
    expect(manager?.rows.map((row) => row.answerId).sort()).toEqual(
      [first, second].sort(),
    );
    expect(manager?.run?.status).toBe("running");
    expect(member?.rows).toEqual([]);
    expect(member?.run).toBeNull();
  });

  test("a closed ranking joins answers, drops, and identities", async () => {
    const first = await answer(f, f.member, "Ship the small thing.");
    const second = await answer(f, f.other, "Rewrite the roadmap.");
    await setStatus(f.pglite, f.activityId, "closed");
    await publishedRanking(f, [
      { answerId: first, rank: 1, rationale: "Small and concrete." },
      { answerId: second, rank: null, dropReason: "Off-topic" },
    ]);

    const member = await loadTextResults(f.activityId, f.memberAccess.user, {
      db: f.db,
      access: f.memberAccess,
    });
    const manager = await loadTextResults(f.activityId, f.managerAccess.user, {
      db: f.db,
      access: f.managerAccess,
    });

    expect(member?.mode).toBe("ranked");
    expect(member?.rows).toEqual([
      {
        answerId: first,
        rank: 1,
        body: "Ship the small thing.",
        rationale: "Small and concrete.",
        email: null,
      },
    ]);
    expect(member?.summary).toBe("Ship the small thing first.");
    expect(member?.droppedCount).toBe(1);
    expect(member?.dropped).toBeNull();
    expect(manager?.dropped).toEqual([
      {
        answerId: second,
        body: "Rewrite the roadmap.",
        reason: "Off-topic",
      },
    ]);
  });

  test("closed without a run publishes every answer in order", async () => {
    const first = await answer(f, f.member, "Ship the small thing.");
    const second = await answer(f, f.other, "Talk to users first.");
    await setStatus(f.pglite, f.activityId, "closed");

    const payload = await loadTextResults(f.activityId, f.memberAccess.user, {
      db: f.db,
      access: f.memberAccess,
    });

    expect(payload?.mode).toBe("unranked");
    expect(payload?.rows.map((row) => row.answerId)).toEqual([first, second]);
    expect(payload?.rows.every((row) => row.rank === null)).toBe(true);
  });
});

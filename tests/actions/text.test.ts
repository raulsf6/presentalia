import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import type { TalkAccess } from "@/lib/membership";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  pglite: undefined as unknown,
  getSessionUser: vi.fn(),
  requireTalkManager: vi.fn(),
  isRosteredAttendee: vi.fn(),
  generate: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
  isRosteredAttendee: mocks.isRosteredAttendee,
}));
vi.mock("@/lib/text-ranking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/text-ranking")>();
  return { ...actual, generateRankingWithGateway: mocks.generate };
});
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError,
  logServerWarning: vi.fn(),
}));

import {
  createTextActivityAction,
  publishTextUnrankedAction,
  rankTextActivityAction,
  submitTextAnswerAction,
} from "@/actions/text";
import { createDb, exec, makeUser, seedTalk, seedTextActivity } from "../db/harness";

type Setup = {
  pglite: Awaited<ReturnType<typeof createDb>>;
  db: Db;
  talkId: string;
  activityId: string;
  member: { id: string; email: string };
  other: { id: string; email: string };
  memberAccess: TalkAccess;
};

async function setup(status: "draft" | "active" | "locked" | "closed" = "active") {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  mocks.db = db;
  mocks.pglite = pglite;

  const owner = await makeUser(pglite, "owner@example.com");
  const member = await makeUser(pglite, "member@example.com");
  const other = await makeUser(pglite, "other@example.com");
  const talkId = await seedTalk(
    pglite,
    "Talk",
    [member.email, other.email],
    owner.id,
  );
  const activityId = await seedTextActivity(pglite, talkId, { status });

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

  mocks.getSessionUser.mockResolvedValue(memberViewer);
  mocks.isRosteredAttendee.mockResolvedValue(true);
  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: managerViewer,
    talk,
    access: "presenter",
  });

  return {
    pglite,
    db,
    talkId,
    activityId,
    member,
    other,
    memberAccess: { user: memberViewer, talk, access: "member" },
  } satisfies Setup;
}

async function addAnswer(
  f: Setup,
  user: { id: string; email: string },
  body: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await f.pglite.query(
    "insert into public.text_answers (id, activity_id, user_id, body) values ($1, $2, $3, $4)",
    [id, f.activityId, user.id, body],
  );
  return id;
}

function validOutput(ids: { first: string; second: string }) {
  return {
    ranked: [
      { id: ids.first, score: 92, rationale: "Concrete and small." },
      { id: ids.second, score: 70 },
    ],
    dropped: [],
    summary: "Start small.",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockReturnValue(undefined);
  mocks.generate.mockReset();
});

describe("createTextActivityAction", () => {
  test("creates the activity and its text configuration", async () => {
    const pglite = await createDb();
    const db = drizzle(pglite, { schema }) as unknown as Db;
    mocks.db = db;
    const owner = await makeUser(pglite, "owner@example.com");
    const talkId = await seedTalk(pglite, "Talk", [], owner.id);
    mocks.requireTalkManager.mockResolvedValue({
      ok: true,
      user: { id: owner.id, email: owner.email, role: "presenter" },
      talk: { id: talkId },
      access: "presenter",
    });

    const form = new FormData();
    form.set("prompt", "  What should we ship next?  ");
    form.set("criteria", "  Most actionable  ");
    form.set("resultsIdentifiable", "on");

    await createTextActivityAction(talkId, { ok: true }, form);

    const rows = await pglite.query(
      `select a.id, a.type, a.status, t.prompt, t.criteria, t.results_identifiable
       from public.activities a
       join public.text_activities t on t.activity_id = a.id
       where a.talk_id = $1`,
      [talkId],
    );
    expect(rows.rows[0]).toMatchObject({
      type: "text",
      status: "draft",
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      results_identifiable: true,
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/talks/${talkId}/activities/${(rows.rows[0] as { id: string }).id}`,
    );
  });
});

describe("submitTextAnswerAction", () => {
  test("stores one answer and returns the talk id", async () => {
    const f = await setup();

    const result = await submitTextAnswerAction(
      f.activityId,
      "  Ship the small thing.  ",
    );

    const rows = await f.pglite.query(
      "select user_id, body from public.text_answers where activity_id = $1",
      [f.activityId],
    );
    expect(result).toEqual({ ok: true, talkId: f.talkId });
    expect(rows.rows[0]).toEqual({
      user_id: f.member.id,
      body: "Ship the small thing.",
    });
  });

  test("refuses an answer once the activity is locked", async () => {
    const f = await setup("locked");

    const result = await submitTextAnswerAction(f.activityId, "Too late");

    expect(result).toEqual({
      ok: false,
      error: "This activity is not accepting answers.",
    });
  });

  test("refuses a second answer from the same attendee", async () => {
    const f = await setup();
    await addAnswer(f, f.member, "First answer");

    const result = await submitTextAnswerAction(f.activityId, "Second answer");

    expect(result).toEqual({
      ok: false,
      error: "You have already answered this activity.",
    });
  });
});

describe("rankTextActivityAction", () => {
  test("locks, ranks, and closes atomically", async () => {
    const f = await setup();
    const first = await addAnswer(f, f.member, "Ship the small thing.");
    const second = await addAnswer(f, f.other, "Talk to users first.");
    mocks.generate.mockResolvedValue({ output: validOutput({ first, second }) });

    const result = await rankTextActivityAction(f.activityId);

    const activity = await f.pglite.query(
      "select status from public.activities where id = $1",
      [f.activityId],
    );
    const runs = await exec(f.pglite,
      "select status, published_at, summary from public.text_ranking_runs where activity_id = $1",
      [f.activityId],
    );
    const rankings = await f.pglite.query(
      "select answer_id, rank, score from public.text_rankings order by rank",
      [],
    );

    expect(result).toEqual({ ok: true });
    expect(activity.rows[0]).toEqual({ status: "closed" });
    expect(runs[0]).toMatchObject({
      status: "succeeded",
      summary: "Start small.",
    });
    expect(runs[0]?.published_at).not.toBeNull();
    expect(rankings.rows).toEqual([
      { answer_id: first, rank: 1, score: 92 },
      { answer_id: second, rank: 2, score: 70 },
    ]);
  });

  test("leaves the activity locked when the model fails", async () => {
    const f = await setup();
    await addAnswer(f, f.member, "Ship the small thing.");
    mocks.generate.mockRejectedValue(new Error("gateway down"));

    const result = await rankTextActivityAction(f.activityId);

    const activity = await f.pglite.query(
      "select status from public.activities where id = $1",
      [f.activityId],
    );
    const runs = await exec(f.pglite,
      "select status, error from public.text_ranking_runs where activity_id = $1",
      [f.activityId],
    );

    expect(result.ok).toBe(false);
    expect(activity.rows[0]).toEqual({ status: "locked" });
    expect(runs[0]).toMatchObject({ status: "failed" });
  });

  test("refuses above the answer cap without locking", async () => {
    const f = await setup();
    await f.pglite.query(
      `insert into auth.users (id, email)
       select gen_random_uuid(), 'cap' || n || '@example.com'
       from generate_series(1, 101) n`,
    );
    await f.pglite.query(
      `insert into public.text_answers (activity_id, user_id, body)
       select $1, u.id, 'answer ' || u.email
       from auth.users u where u.email like 'cap%@example.com'`,
      [f.activityId],
    );

    const result = await rankTextActivityAction(f.activityId);

    const activity = await f.pglite.query(
      "select status from public.activities where id = $1",
      [f.activityId],
    );
    const runs = await exec(f.pglite,
      "select count(*)::int as count from public.text_ranking_runs where activity_id = $1",
      [f.activityId],
    );

    expect(result).toEqual({
      ok: false,
      error: "Too many answers to rank (101). Publish all answers instead.",
    });
    expect(activity.rows[0]).toEqual({ status: "active" });
    expect(runs[0]?.count).toBe(0);
  });

  test("sweeps a stale run and retries successfully", async () => {
    const f = await setup();
    const first = await addAnswer(f, f.member, "Ship the small thing.");
    const second = await addAnswer(f, f.other, "Talk to users first.");
    await f.pglite.query(
      "update public.activities set status = 'locked' where id = $1",
      [f.activityId],
    );
    await f.pglite.query(
      `insert into public.text_ranking_runs
         (activity_id, status, prompt_version, criteria_snapshot, answer_count, started_at)
       values ($1, 'running', 'text-ranking-v1', 'Most actionable', 2, now() - interval '5 minutes')`,
      [f.activityId],
    );
    mocks.generate.mockResolvedValue({ output: validOutput({ first, second }) });

    const result = await rankTextActivityAction(f.activityId);

    const runs = await exec(f.pglite,
      "select status from public.text_ranking_runs where activity_id = $1 order by started_at",
      [f.activityId],
    );

    expect(result).toEqual({ ok: true });
    expect(runs.map((row) => row.status)).toEqual(["failed", "succeeded"]);
  });
});

describe("publishTextUnrankedAction", () => {
  test("closes an active activity without a run", async () => {
    const f = await setup();
    await addAnswer(f, f.member, "Ship the small thing.");

    const result = await publishTextUnrankedAction(f.activityId);

    const activity = await f.pglite.query(
      "select status from public.activities where id = $1",
      [f.activityId],
    );
    const runs = await exec(f.pglite,
      "select count(*)::int as count from public.text_ranking_runs where activity_id = $1",
      [f.activityId],
    );

    expect(result).toEqual({ ok: true });
    expect(activity.rows[0]).toEqual({ status: "closed" });
    expect(runs[0]?.count).toBe(0);
  });

  test("refuses while a live run is still running", async () => {
    const f = await setup("locked");
    await f.pglite.query(
      `insert into public.text_ranking_runs
         (activity_id, prompt_version, criteria_snapshot, answer_count)
       values ($1, 'text-ranking-v1', 'Most actionable', 0)`,
      [f.activityId],
    );

    const result = await publishTextUnrankedAction(f.activityId);

    const activity = await f.pglite.query(
      "select status from public.activities where id = $1",
      [f.activityId],
    );

    expect(result).toEqual({
      ok: false,
      error: "Ranking is still running. Wait for it to finish or time out.",
    });
    expect(activity.rows[0]).toEqual({ status: "locked" });
  });
});

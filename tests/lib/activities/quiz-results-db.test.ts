import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";
import type { TalkAccess } from "@/lib/talks/membership";
import { clearQuizResultsCache, loadQuizResults } from "@/lib/activities/quiz-results";
import {
  createDb,
  makeUser,
  seedQuiz,
  seedTalk,
  setStatus,
} from "../../db/harness";

type Setup = {
  pglite: Awaited<ReturnType<typeof createDb>>;
  db: Db;
  talkId: string;
  quizId: string;
  optionIds: string[];
  owner: { id: string; email: string };
  member: { id: string; email: string };
  other: { id: string; email: string };
  managerViewer: SessionUser;
  managerAccess: TalkAccess;
  memberViewer: SessionUser;
  memberAccess: TalkAccess;
};

async function setup(
  opts: { identifiable?: boolean; status?: "ready" | "active" | "closed" } = {},
): Promise<Setup> {
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
  const quiz = await seedQuiz(pglite, talkId, {
    identifiable: opts.identifiable ?? false,
    options: ["Framework A", "Framework B"],
    correctIndex: 1,
  });
  await setStatus(pglite, quiz.quizId, opts.status ?? "active");

  const managerViewer: SessionUser = {
    id: owner.id,
    email: owner.email,
    role: "admin",
  };
  const memberViewer: SessionUser = {
    id: member.id,
    email: member.email,
    role: "attendee",
  };
  const talk = { id: talkId } as TalkRow;

  return {
    pglite,
    db,
    talkId,
    quizId: quiz.quizId,
    optionIds: quiz.optionIds,
    owner,
    member,
    other,
    managerViewer,
    managerAccess: { user: managerViewer, talk, access: "admin" },
    memberViewer,
    memberAccess: { user: memberViewer, talk, access: "member" },
  };
}

async function vote(
  f: Setup,
  user: { id: string; email: string },
  optionId: string,
): Promise<void> {
  await f.pglite.query(
    `insert into public.quiz_votes (quiz_id, user_id, option_id)
     values ($1, $2, $3)`,
    [f.quizId, user.id, optionId],
  );
}

beforeEach(() => {
  clearQuizResultsCache();
});

describe("loadQuizResults", () => {
  test("hides live percentages and the answer from a manager", async () => {
    const f = await setup();
    await vote(f, f.member, f.optionIds[0]);

    const payload = await loadQuizResults(f.quizId, f.managerAccess, {
      db: f.db,
    });

    expect(payload?.showResults).toBe(false);
    expect(payload?.rows).toEqual([]);
    expect(payload?.total).toBeNull();
    expect(payload?.quiz.correctOptionId).toBeNull();
    expect(payload?.quiz.correctVotes).toBeNull();
  });

  test("asks an unvoted member to vote before showing results", async () => {
    const f = await setup();

    const payload = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });

    expect(payload?.needsVote).toBe(true);
    expect(payload?.showResults).toBe(false);
    expect(payload?.total).toBeNull();
  });

  test("shows live percentages without the answer to a member who voted", async () => {
    const f = await setup();
    await vote(f, f.member, f.optionIds[0]);

    const payload = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });

    expect(payload?.needsVote).toBe(false);
    expect(payload?.showResults).toBe(true);
    expect(payload?.total).toBe(1);
    expect(payload?.rows).toEqual([
      {
        optionId: f.optionIds[0],
        label: "Framework A",
        votes: 1,
        percent: 100,
      },
      {
        optionId: f.optionIds[1],
        label: "Framework B",
        votes: 0,
        percent: 0,
      },
    ]);
    expect(payload?.quiz.correctOptionId).toBeNull();
    expect(payload?.viewer).toBeNull();
  });

  test("hides live results from a projector", async () => {
    const f = await setup();
    await vote(f, f.member, f.optionIds[0]);

    const payload = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
      projector: true,
    });

    expect(payload?.showResults).toBe(false);
    expect(payload?.rows).toEqual([]);
    expect(payload?.total).toBeNull();
  });

  test("reveals the answer and viewer correctness once closed", async () => {
    const f = await setup({ status: "closed" });
    await vote(f, f.member, f.optionIds[0]);
    await vote(f, f.other, f.optionIds[1]);

    const payload = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });

    expect(payload?.showResults).toBe(true);
    expect(payload?.total).toBe(2);
    expect(payload?.quiz.correctOptionId).toBe(f.optionIds[1]);
    expect(payload?.quiz.correctVotes).toBe(1);
    expect(payload?.viewer).toEqual({
      optionId: f.optionIds[0],
      correct: false,
    });
  });

  test("returns voter emails only for visible, identifiable results", async () => {
    const f = await setup({ identifiable: true });
    await vote(f, f.member, f.optionIds[0]);
    await vote(f, f.other, f.optionIds[1]);

    const memberPayload = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });
    const managerPayload = await loadQuizResults(f.quizId, f.managerAccess, {
      db: f.db,
    });

    expect(memberPayload?.voters).toEqual(
      expect.arrayContaining([
        { optionId: f.optionIds[0], name: f.member.email },
        { optionId: f.optionIds[1], name: f.other.email },
      ]),
    );
    expect(managerPayload?.voters).toBeNull();
  });

  test("returns null when the access belongs to another talk", async () => {
    const f = await setup();
    const otherAccess: TalkAccess = {
      ...f.memberAccess,
      talk: { id: crypto.randomUUID() } as TalkRow,
    };

    await expect(
      loadQuizResults(f.quizId, otherAccess, { db: f.db }),
    ).resolves.toBeNull();
  });

  test("checks access before returning a cached payload", async () => {
    const f = await setup();
    await loadQuizResults(f.quizId, f.managerAccess, { db: f.db });
    const otherAccess: TalkAccess = {
      ...f.managerAccess,
      talk: { id: crypto.randomUUID() } as TalkRow,
    };

    await expect(
      loadQuizResults(f.quizId, otherAccess, { db: f.db }),
    ).resolves.toBeNull();
  });

  test("caches counts for the TTL and reloads them after clearing", async () => {
    const f = await setup({ status: "closed" });
    await vote(f, f.member, f.optionIds[0]);
    const first = await loadQuizResults(f.quizId, f.managerAccess, {
      db: f.db,
    });
    expect(first?.total).toBe(1);

    await vote(f, f.other, f.optionIds[1]);

    const cached = await loadQuizResults(f.quizId, f.managerAccess, {
      db: f.db,
    });
    expect(cached?.total).toBe(1);

    clearQuizResultsCache();
    const fresh = await loadQuizResults(f.quizId, f.managerAccess, {
      db: f.db,
    });
    expect(fresh?.total).toBe(2);
  });

  test("does not serve a deleted quiz from cache", async () => {
    const f = await setup();
    await loadQuizResults(f.quizId, f.managerAccess, { db: f.db });

    await f.pglite.query("delete from public.activities where id = $1", [
      f.quizId,
    ]);

    await expect(
      loadQuizResults(f.quizId, f.managerAccess, { db: f.db }),
    ).resolves.toBeNull();
  });

  test("reads the quiz status fresh even when counts are cached", async () => {
    const f = await setup();
    await vote(f, f.member, f.optionIds[0]);
    const first = await loadQuizResults(f.quizId, f.memberAccess, { db: f.db });
    expect(first?.quiz.status).toBe("active");
    expect(first?.quiz.correctOptionId).toBeNull();

    await setStatus(f.pglite, f.quizId, "closed");

    const second = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });
    expect(second?.quiz.status).toBe("closed");
    expect(second?.quiz.correctOptionId).toBe(f.optionIds[1]);
  });

  test("does not cache the vote-first state", async () => {
    const f = await setup();
    const before = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });
    expect(before?.needsVote).toBe(true);

    await vote(f, f.member, f.optionIds[0]);

    const after = await loadQuizResults(f.quizId, f.memberAccess, { db: f.db });
    expect(after?.needsVote).toBe(false);
    expect(after?.showResults).toBe(true);
  });

  test("builds projector and non-projector payloads from cached data", async () => {
    const f = await setup();
    await vote(f, f.member, f.optionIds[0]);

    const normal = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
    });
    const projector = await loadQuizResults(f.quizId, f.memberAccess, {
      db: f.db,
      projector: true,
    });

    expect(normal?.showResults).toBe(true);
    expect(projector?.showResults).toBe(false);
  });
});

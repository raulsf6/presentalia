import { describe, expect, test } from "vitest";

import {
  attempt,
  attemptAs,
  createDb,
  exec,
  makeUser,
  seedPoll,
  seedQuiz,
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
  quizId: string;
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
  const { quizId, optionIds } = await seedQuiz(db, talkId);
  return { db, member, member2, talkId, quizId, optionIds };
}

describe("quiz migration", () => {
  test("creates the quiz module tables", async () => {
    const db = await createDb();
    const rows = await exec(
      db,
      `select c.relname as table_name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    for (const table of [
      "quizzes",
      "quiz_options",
      "quiz_votes",
      "quiz_vote_counts",
    ]) {
      expect(
        rows.find((row) => row.table_name === table),
        `table ${table} exists`,
      ).toBeDefined();
    }
  });

  test("activities accepts quiz and still rejects unknown types", async () => {
    const f = await setup();
    const stored = await exec(
      f.db,
      "select type from public.activities where id = $1",
      [f.quizId],
    );
    const rejected = await attempt(
      f.db,
      "insert into public.activities (talk_id, type) values ($1, 'trivia')",
      [f.talkId],
    );

    expect(stored[0]?.type).toBe("quiz");
    expect(rejected?.message).toMatch(
      /activities_type_check|check constraint/i,
    );
  });

  test("a quiz stores exactly one correct option", async () => {
    const f = await setup();
    const correct = await exec(
      f.db,
      "select count(*)::int as count from public.quiz_options where quiz_id = $1 and is_correct",
      [f.quizId],
    );
    expect(correct[0]?.count).toBe(1);
  });

  test("a second correct option is rejected", async () => {
    const f = await setup();
    const rejected = await attempt(
      f.db,
      "insert into public.quiz_options (quiz_id, label, position, is_correct) values ($1, 'A third', 2, true)",
      [f.quizId],
    );

    expect(rejected?.message).toMatch(
      /quiz_options_one_correct|duplicate key value violates unique constraint/i,
    );
  });

  test("activity summaries join polls and quizzes without duplicate rows", async () => {
    const f = await setup();
    await seedPoll(f.db, f.talkId, { options: ["A", "B"] });

    const rows = await exec(
      f.db,
      `select a.type, coalesce(p.question, q.question) as question
       from public.activities a
       left join public.polls p on p.activity_id = a.id
       left join public.quizzes q on q.activity_id = a.id
       where a.talk_id = $1
       order by a.type`,
      [f.talkId],
    );

    expect(rows).toHaveLength(2);
    expect(rows).toEqual([
      { type: "poll", question: "Which framework wins?" },
      { type: "quiz", question: "Which framework is correct?" },
    ]);
  });

  test("vote tables resolve voter identities from app_users, not a snapshot", async () => {
    const db = await createDb();
    const rows = await exec(
      db,
      `select table_name, column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name in ('poll_votes', 'quiz_votes')
         and column_name = 'voter_email'`,
    );

    expect(rows).toEqual([]);
  });

  test("quiz tables are not readable by the authenticated API role", async () => {
    const f = await setup();
    const rejected = await attemptAs(
      f.db,
      f.member,
      "select * from public.quizzes",
    );

    expect(rejected?.message).toMatch(/permission denied/i);
  });
});

describe("quiz voting", () => {
  test("a vote on an active quiz increments the count", async () => {
    const f = await setup();
    await setStatus(f.db, f.quizId, "active");
    await exec(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member.id, f.optionIds[0]],
    );

    const counts = await exec(
      f.db,
      "select option_id, votes from public.quiz_vote_counts where quiz_id = $1",
      [f.quizId],
    );
    expect(counts).toHaveLength(1);
    expect(counts[0]?.option_id).toBe(f.optionIds[0]);
    expect(counts[0]?.votes).toBe(1);
  });

  test("the primary key prevents duplicate quiz votes by the same user", async () => {
    const f = await setup();
    await setStatus(f.db, f.quizId, "active");
    await exec(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member.id, f.optionIds[0]],
    );
    const error = await attempt(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member.id, f.optionIds[1]],
    );

    expect(error?.message).toMatch(
      /duplicate key value violates unique constraint/,
    );
  });

  test("the counts trigger tallies multiple quiz votes", async () => {
    const f = await setup();
    await setStatus(f.db, f.quizId, "active");
    await exec(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member.id, f.optionIds[0]],
    );
    await exec(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member2.id, f.optionIds[1]],
    );

    const counts = await exec(
      f.db,
      "select option_id, votes from public.quiz_vote_counts where quiz_id = $1 order by option_id",
      [f.quizId],
    );
    const total = counts.reduce((sum, row) => sum + Number(row.votes), 0);
    expect(total).toBe(2);
    expect(counts).toHaveLength(2);
  });

  test("deleting a quiz voter decrements the count", async () => {
    const f = await setup();
    await setStatus(f.db, f.quizId, "active");
    await exec(
      f.db,
      "insert into public.quiz_votes (quiz_id, user_id, option_id) values ($1, $2, $3)",
      [f.quizId, f.member.id, f.optionIds[0]],
    );

    await exec(f.db, "delete from auth.users where id = $1", [f.member.id]);

    const counts = await exec(
      f.db,
      "select votes from public.quiz_vote_counts where quiz_id = $1 and option_id = $2",
      [f.quizId, f.optionIds[0]],
    );
    expect(Number(counts[0]?.votes)).toBe(0);
  });
});

describe("quiz activity lifecycle", () => {
  test("a poll and a quiz cannot be active in the same talk", async () => {
    const f = await setup();
    const { pollId } = await seedPoll(f.db, f.talkId);
    await setStatus(f.db, pollId, "active");

    const error = await attempt(
      f.db,
      `update public.activities set status = 'active', launched_at = now()
       where id = $1`,
      [f.quizId],
    );

    expect(error?.message).toMatch(
      /duplicate key value violates unique constraint "activities_one_active_per_talk"/,
    );
  });
});

import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";
import type { TalkAccess } from "@/lib/talks/membership";
import { clearPollResultsCache, loadPollResults } from "@/lib/activities/poll-results";
import {
  createDb,
  makeUser,
  seedPoll,
  seedTalk,
  setStatus,
} from "../../db/harness";

type Setup = {
  pglite: Awaited<ReturnType<typeof createDb>>;
  db: Db;
  talkId: string;
  pollId: string;
  optionIds: string[];
  voter: { id: string; email: string };
  access: TalkAccess;
};

async function setupPoll(identifiable = false): Promise<Setup> {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;

  const owner = await makeUser(pglite, "owner@example.com");
  const talkId = await seedTalk(pglite, "Talk", [], owner.id);
  const poll = await seedPoll(pglite, talkId, {
    identifiable,
    options: ["Framework A", "Framework B"],
  });
  await setStatus(pglite, poll.pollId, "active");

  const voter = await makeUser(pglite, "voter@example.com");
  await pglite.query(
    `insert into public.poll_votes (poll_id, user_id, option_id)
     values ($1, $2, $3)`,
    [poll.pollId, voter.id, poll.optionIds[0]],
  );

  const viewer: SessionUser = {
    id: owner.id,
    email: owner.email,
    role: "admin",
  };
  const access: TalkAccess = {
    user: viewer,
    talk: { id: talkId } as TalkRow,
    access: "admin",
  };

  return {
    pglite,
    db,
    talkId,
    pollId: poll.pollId,
    optionIds: poll.optionIds,
    voter,
    access,
  };
}

beforeEach(() => {
  clearPollResultsCache();
});

describe("loadPollResults", () => {
  test("returns aggregated counts without voter emails for anonymous polls", async () => {
    const { db, pollId, optionIds, access } = await setupPoll(false);

    const payload = await loadPollResults(pollId, access, { db });

    expect(payload?.total).toBe(1);
    expect(payload?.voters).toBeNull();
    expect(payload?.rows).toEqual([
      {
        optionId: optionIds[0],
        label: "Framework A",
        votes: 1,
        percent: 100,
      },
      {
        optionId: optionIds[1],
        label: "Framework B",
        votes: 0,
        percent: 0,
      },
    ]);
  });

  test("returns voter emails only for identifiable polls", async () => {
    const { db, pollId, optionIds, voter, access } = await setupPoll(true);

    const payload = await loadPollResults(pollId, access, { db });

    expect(payload?.voters).toEqual([
      { optionId: optionIds[0], name: voter.email },
    ]);
  });

  test("returns null when the access belongs to another talk", async () => {
    const { db, pollId, access } = await setupPoll(false);
    const otherAccess: TalkAccess = {
      ...access,
      talk: { id: crypto.randomUUID() } as TalkRow,
    };

    await expect(
      loadPollResults(pollId, otherAccess, { db }),
    ).resolves.toBeNull();
  });

  test("checks access before returning a cached payload", async () => {
    const { db, pollId, access } = await setupPoll(false);
    await loadPollResults(pollId, access, { db });
    const otherAccess: TalkAccess = {
      ...access,
      talk: { id: crypto.randomUUID() } as TalkRow,
    };

    await expect(
      loadPollResults(pollId, otherAccess, { db }),
    ).resolves.toBeNull();
  });

  test("caches counts for the TTL and reloads after clearing", async () => {
    const { pglite, db, pollId, optionIds, access } = await setupPoll(false);
    const first = await loadPollResults(pollId, access, { db });
    expect(first?.total).toBe(1);

    const secondVoter = await makeUser(pglite, "voter2@example.com");
    await pglite.query(
      `insert into public.poll_votes (poll_id, user_id, option_id)
       values ($1, $2, $3)`,
      [pollId, secondVoter.id, optionIds[0]],
    );

    const cached = await loadPollResults(pollId, access, { db });
    expect(cached?.total).toBe(1);

    clearPollResultsCache();
    const fresh = await loadPollResults(pollId, access, { db });
    expect(fresh?.total).toBe(2);
  });

  test("does not serve a deleted poll from cache", async () => {
    const { pglite, db, pollId, access } = await setupPoll(false);
    await loadPollResults(pollId, access, { db });

    await pglite.query("delete from public.activities where id = $1", [pollId]);

    await expect(loadPollResults(pollId, access, { db })).resolves.toBeNull();
  });

  test("reads the poll status fresh even when counts are cached", async () => {
    const { pglite, db, pollId, access } = await setupPoll(false);
    const first = await loadPollResults(pollId, access, { db });
    expect(first?.poll.status).toBe("active");

    await setStatus(pglite, pollId, "closed");

    const second = await loadPollResults(pollId, access, { db });
    expect(second?.poll.status).toBe("closed");
  });
});

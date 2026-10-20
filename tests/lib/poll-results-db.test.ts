import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import type { TalkAccess } from "@/lib/membership";
import { clearPollResultsCache, loadPollResults } from "@/lib/poll-results";
import {
  createDb,
  makeUser,
  seedPoll,
  seedTalk,
  setStatus,
} from "../db/harness";

const mocks = vi.hoisted(() => ({
  getTalkAccessForUser: vi.fn(),
}));

vi.mock("@/lib/membership", () => ({
  getTalkAccessForUser: mocks.getTalkAccessForUser,
}));

type Setup = {
  pglite: Awaited<ReturnType<typeof createDb>>;
  db: Db;
  talkId: string;
  pollId: string;
  optionIds: string[];
  voter: { id: string; email: string };
  viewer: SessionUser;
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
    `insert into public.poll_votes (poll_id, user_id, option_id, voter_email)
     values ($1, $2, $3, $4)`,
    [poll.pollId, voter.id, poll.optionIds[0], voter.email],
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
    viewer,
    access,
  };
}

beforeEach(() => {
  clearPollResultsCache();
  vi.clearAllMocks();
});

describe("loadPollResults", () => {
  test("returns aggregated counts without voter emails for anonymous polls", async () => {
    const { db, pollId, optionIds, viewer, access } = await setupPoll(false);

    const payload = await loadPollResults(pollId, viewer, { db, access });

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
    const { db, pollId, optionIds, voter, viewer, access } =
      await setupPoll(true);

    const payload = await loadPollResults(pollId, viewer, { db, access });

    expect(payload?.voters).toEqual([
      { optionId: optionIds[0], email: voter.email },
    ]);
  });

  test("returns null when the viewer cannot access the poll's talk", async () => {
    const { db, pollId, viewer } = await setupPoll(false);
    mocks.getTalkAccessForUser.mockResolvedValue(null);

    await expect(loadPollResults(pollId, viewer, { db })).resolves.toBeNull();
  });

  test("checks access before returning a cached payload", async () => {
    const { db, pollId, viewer, access } = await setupPoll(false);
    await loadPollResults(pollId, viewer, { db, access });

    mocks.getTalkAccessForUser.mockResolvedValue(null);

    await expect(loadPollResults(pollId, viewer, { db })).resolves.toBeNull();
  });

  test("caches counts for the TTL and reloads after clearing", async () => {
    const { pglite, db, pollId, optionIds, viewer, access } =
      await setupPoll(false);
    const first = await loadPollResults(pollId, viewer, { db, access });
    expect(first?.total).toBe(1);

    const secondVoter = await makeUser(pglite, "voter2@example.com");
    await pglite.query(
      `insert into public.poll_votes (poll_id, user_id, option_id, voter_email)
       values ($1, $2, $3, $4)`,
      [pollId, secondVoter.id, optionIds[0], secondVoter.email],
    );

    const cached = await loadPollResults(pollId, viewer, { db, access });
    expect(cached?.total).toBe(1);

    clearPollResultsCache();
    const fresh = await loadPollResults(pollId, viewer, { db, access });
    expect(fresh?.total).toBe(2);
  });

  test("does not serve a deleted poll from cache", async () => {
    const { pglite, db, pollId, viewer, access } = await setupPoll(false);
    await loadPollResults(pollId, viewer, { db, access });

    await pglite.query("delete from public.activities where id = $1", [pollId]);

    await expect(
      loadPollResults(pollId, viewer, { db, access }),
    ).resolves.toBeNull();
  });

  test("reads the poll status fresh even when counts are cached", async () => {
    const { pglite, db, pollId, viewer, access } = await setupPoll(false);
    const first = await loadPollResults(pollId, viewer, { db, access });
    expect(first?.poll.status).toBe("active");

    await setStatus(pglite, pollId, "closed");

    const second = await loadPollResults(pollId, viewer, { db, access });
    expect(second?.poll.status).toBe("closed");
  });
});

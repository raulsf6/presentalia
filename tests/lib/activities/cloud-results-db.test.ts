import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import type { Db } from "@/db";
import * as schema from "@/db/schema";
import type { TalkRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/auth";
import type { TalkAccess } from "@/lib/talks/membership";
import { loadCloudResults } from "@/lib/activities/cloud-results";
import {
  createDb,
  makeUser,
  seedCloudActivity,
  seedTalk,
  setStatus,
} from "../../db/harness";

type Setup = {
  db: Db;
  pglite: Awaited<ReturnType<typeof createDb>>;
  activityId: string;
  talkId: string;
  member: { id: string; email: string };
  other: { id: string; email: string };
  third: { id: string; email: string };
  memberAccess: TalkAccess;
  otherAccess: TalkAccess;
  managerAccess: TalkAccess;
};

async function setup(): Promise<Setup> {
  const pglite = await createDb();
  const db = drizzle(pglite, { schema }) as unknown as Db;
  const owner = await makeUser(pglite, "owner@example.com");
  const member = await makeUser(pglite, "member@example.com");
  const other = await makeUser(pglite, "other@example.com");
  const third = await makeUser(pglite, "third@example.com");
  const talkId = await seedTalk(
    pglite,
    "Talk",
    [member.email, other.email, third.email],
    owner.id,
  );
  const activityId = await seedCloudActivity(pglite, talkId, {
    status: "active",
  });

  const talk = { id: talkId } as TalkRow;
  const memberViewer: SessionUser = {
    id: member.id,
    email: member.email,
    role: "attendee",
  };
  const otherViewer: SessionUser = {
    id: other.id,
    email: other.email,
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
    third,
    memberAccess: { user: memberViewer, talk, access: "member" },
    otherAccess: { user: otherViewer, talk, access: "member" },
    managerAccess: { user: managerViewer, talk, access: "presenter" },
  };
}

async function addIdea(f: Setup, userId: string, body: string): Promise<void> {
  await f.pglite.query(
    "insert into public.cloud_answers (id, activity_id, user_id, body) values ($1, $2, $3, $4)",
    [crypto.randomUUID(), f.activityId, userId, body],
  );
}

describe("loadCloudResults", () => {
  let f: Setup;

  beforeEach(async () => {
    f = await setup();
  });

  test("a member who has not submitted is asked to submit and sees no cloud", async () => {
    await addIdea(f, f.other.id, "Voice");

    const payload = await loadCloudResults(f.activityId, f.memberAccess, {
      db: f.db,
    });

    expect(payload?.mode).toBe("waiting");
    expect(payload?.needsVote).toBe(true);
    expect(payload?.items).toEqual([]);
    expect(payload?.activity.totalIdeas).toBe(1);
  });

  test("a manager sees grouped ideas live", async () => {
    await addIdea(f, f.other.id, "Better onboarding");
    await addIdea(f, f.member.id, "better onboarding!");
    await addIdea(f, f.third.id, "voice");

    const payload = await loadCloudResults(f.activityId, f.managerAccess, {
      db: f.db,
    });

    expect(payload?.mode).toBe("live");
    expect(payload?.needsVote).toBe(false);
    expect(payload?.items).toEqual([
      { key: "better onboarding", label: "Better onboarding", count: 2 },
      { key: "voice", label: "voice", count: 1 },
    ]);
  });

  test("after close the member sees the final cloud", async () => {
    await addIdea(f, f.other.id, "Better onboarding");
    await addIdea(f, f.member.id, "Faster responses");
    await setStatus(f.pglite, f.activityId, "closed");

    const member = await loadCloudResults(f.activityId, f.memberAccess, {
      db: f.db,
    });
    const otherView = await loadCloudResults(f.activityId, f.otherAccess, {
      db: f.db,
    });

    expect(member?.mode).toBe("final");
    expect(member?.needsVote).toBe(false);
    expect(member?.items).toHaveLength(2);
    expect(otherView?.items).toHaveLength(2);
  });
});

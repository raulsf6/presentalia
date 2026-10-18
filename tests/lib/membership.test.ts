import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getDb: vi.fn(),
  tables: {
    talks: { id: "talks.id" },
    talkRoster: {
      talkId: "talk_roster.talk_id",
      userId: "talk_roster.user_id",
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/db/schema", () => ({
  talks: mocks.tables.talks,
  talkRoster: mocks.tables.talkRoster,
}));

vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
}));

import { loadTalkAccess } from "@/lib/membership";
import * as membership from "@/lib/membership";

function mockDb(...queries: Record<string, unknown>[][]) {
  let queryIndex = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => queries[queryIndex++] ?? [],
        }),
      }),
    }),
  };
}

describe("loadTalkAccess", () => {
  const presenter = {
    id: "presenter-id",
    email: "presenter@example.com",
    role: "presenter",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue(presenter);
    mocks.getDb.mockReturnValue(mockDb());
  });

  test("marks a presenter-owned talk as manageable", async () => {
    const talk = {
      id: "talk-1",
      name: "Owned talk",
      createdBy: presenter.id,
      slidesUpdatedAt: null,
    };
    mocks.getDb.mockReturnValue(mockDb([talk]));

    const access = await loadTalkAccess("talk-1");

    expect(access?.access).toBe("presenter");
    expect(access?.talk).toEqual(talk);
  });

  test("keeps a rostered talk as attendee access for a presenter", async () => {
    const talk = {
      id: "talk-2",
      name: "Invited talk",
      createdBy: "another-presenter",
      slidesUpdatedAt: null,
    };
    mocks.getDb.mockReturnValue(mockDb([talk], [{ userId: presenter.id }]));

    const access = await loadTalkAccess("talk-2");

    expect(access?.access).toBe("member");
  });

  test("allows only an owner or admin to manage a talk", async () => {
    const requireTalkManager = (
      membership as unknown as {
        requireTalkManager?: (talkId: string) => Promise<unknown>;
      }
    ).requireTalkManager;
    expect(requireTalkManager).toBeTypeOf("function");

    const ownedTalk = {
      id: "owned-talk",
      name: "Owned talk",
      createdBy: presenter.id,
      slidesUpdatedAt: null,
    };
    mocks.getDb.mockReturnValue(mockDb([ownedTalk]));
    await expect(requireTalkManager?.("owned-talk")).resolves.toMatchObject({
      ok: true,
      access: "presenter",
    });

    const invitedTalk = {
      ...ownedTalk,
      id: "invited-talk",
      createdBy: "other",
    };
    mocks.getDb.mockReturnValue(
      mockDb([invitedTalk], [{ userId: presenter.id }]),
    );
    await expect(requireTalkManager?.("invited-talk")).resolves.toMatchObject({
      ok: false,
    });

    const admin = { ...presenter, id: "admin-id", role: "admin" };
    mocks.getSessionUser.mockResolvedValue(admin);
    mocks.getDb.mockReturnValue(mockDb([invitedTalk]));
    await expect(requireTalkManager?.("invited-talk")).resolves.toMatchObject({
      ok: true,
      access: "admin",
    });
  });
});

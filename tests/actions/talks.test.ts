import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requirePresenter: vi.fn(),
  requireTalkManager: vi.fn(),
  insertValues: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
  requirePresenter: mocks.requirePresenter,
}));

vi.mock("@/lib/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
}));

vi.mock("@/db/schema", () => ({
  talks: {
    id: "talks.id",
    name: "talks.name",
    createdBy: "talks.created_by",
    createdAt: "talks.created_at",
  },
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: mocks.insertValues,
    }),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { createTalkAction } from "@/actions/talks";

describe("createTalkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const user = {
      id: "presenter-1",
      email: "presenter@example.com",
      role: "presenter",
    };
    mocks.requireAdmin.mockResolvedValue({ ok: true, user });
    mocks.requirePresenter.mockResolvedValue({ ok: true, user });
    mocks.insertValues.mockReturnValue({
      returning: async () => [{ id: "talk-1" }],
    });
    mocks.redirect.mockReturnValue(undefined);
  });

  test("stores the verified presenter as the new talk's owner", async () => {
    const form = new FormData();
    form.set("name", "A new talk");

    await createTalkAction({ ok: true }, form);

    expect(mocks.insertValues).toHaveBeenCalledWith({
      name: "A new talk",
      description: null,
      heldAt: null,
      createdBy: "presenter-1",
      isPublic: false,
      anonymousJoinOpen: true,
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("talks");
  });

  test("creates a public talk with anonymous joining open", async () => {
    const form = new FormData();
    form.set("name", "Open talk");
    form.set("isPublic", "on");

    await createTalkAction({ ok: true }, form);

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Open talk",
        isPublic: true,
        anonymousJoinOpen: true,
      }),
    );
  });
});

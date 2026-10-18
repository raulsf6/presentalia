import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

import { requireAdmin } from "@/lib/require-admin";
import * as roleGuards from "@/lib/require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("accepts a database-backed admin role", async () => {
    const user = {
      id: "admin-id",
      email: "admin@example.com",
      role: "admin",
    };
    mocks.getSessionUser.mockResolvedValue(user);

    await expect(requireAdmin()).resolves.toEqual({ ok: true, user });
  });

  test("rejects a presenter even when the user is signed in", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "presenter-id",
      email: "presenter@example.com",
      role: "presenter",
    });

    await expect(requireAdmin()).resolves.toEqual({
      ok: false,
      error: "Only the admin can do this.",
    });
  });

  test("allows presenters and admins through the presenter guard", async () => {
    const requirePresenter = (
      roleGuards as unknown as {
        requirePresenter?: () => Promise<unknown>;
      }
    ).requirePresenter;
    expect(requirePresenter).toBeTypeOf("function");

    const presenter = {
      id: "presenter-id",
      email: "presenter@example.com",
      role: "presenter",
    };
    mocks.getSessionUser.mockResolvedValue(presenter);
    await expect(requirePresenter?.()).resolves.toEqual({
      ok: true,
      user: presenter,
    });

    const admin = { ...presenter, id: "admin-id", role: "admin" };
    mocks.getSessionUser.mockResolvedValue(admin);
    await expect(requirePresenter?.()).resolves.toEqual({
      ok: true,
      user: admin,
    });
  });
});

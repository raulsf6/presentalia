import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  ensureAppUser: vi.fn(),
  sendAppUserInvite: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    execute: mocks.execute,
  }),
}));

vi.mock("@/lib/provision-user", () => ({
  ensureAppUser: mocks.ensureAppUser,
  sendAppUserInvite: mocks.sendAppUserInvite,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => args,
  sql: Object.assign(
    (parts: TemplateStringsArray, ...values: unknown[]) => ({ parts, values }),
    { raw: (text: string) => text },
  ),
}));

describe("user role actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      ok: true,
      user: { id: "admin-id", email: "admin@example.com", role: "admin" },
    });
    mocks.ensureAppUser.mockResolvedValue({
      id: "new-presenter-id",
      email: "new@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    mocks.sendAppUserInvite.mockResolvedValue(true);
    mocks.execute.mockResolvedValue({});
  });

  test("an admin can provision a presenter from a new email", async () => {
    const { addPresenterAction } = await import("@/actions/users");

    await expect(
      addPresenterAction("  New@Example.com "),
    ).resolves.toMatchObject({
      ok: true,
    });

    expect(mocks.ensureAppUser).toHaveBeenCalledWith("new@example.com");
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith("new@example.com");
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  test("an existing attendee account can be promoted", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    const { addPresenterAction } = await import("@/actions/users");

    await expect(
      addPresenterAction("existing@example.com"),
    ).resolves.toMatchObject({
      ok: true,
    });

    expect(mocks.ensureAppUser).toHaveBeenCalledWith("existing@example.com");
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith(
      "existing@example.com",
    );
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  test("a non-admin cannot provision presenters", async () => {
    mocks.requireAdmin.mockResolvedValue({
      ok: false,
      error: "Only the admin can do this.",
    });
    const { addPresenterAction } = await import("@/actions/users");

    await expect(addPresenterAction("new@example.com")).resolves.toEqual({
      ok: false,
      error: "Only the admin can do this.",
    });
    expect(mocks.ensureAppUser).not.toHaveBeenCalled();
    expect(mocks.sendAppUserInvite).not.toHaveBeenCalled();
  });

  test("rejects invalid role values before executing a role change", async () => {
    const { changeUserRoleAction } = await import("@/actions/users");

    await expect(
      changeUserRoleAction("user-id", "owner"),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

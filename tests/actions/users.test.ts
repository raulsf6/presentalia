import { beforeEach, describe, expect, test, vi } from "vitest";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const TARGET_ID = "00000000-0000-4000-8000-000000000002";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  ensureAppUser: vi.fn(),
  sendAppUserInvite: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  deleteUser: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
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

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => args,
  sql: Object.assign(
    (parts: TemplateStringsArray, ...values: unknown[]) => ({ parts, values }),
    { raw: (text: string) => text },
  ),
}));

function resetMocks() {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({
    ok: true,
    user: { id: ADMIN_ID, email: "admin@example.com", role: "admin" },
  });
  mocks.ensureAppUser.mockResolvedValue({
    id: "new-presenter-id",
    email: "new@example.com",
    emailVerifiedAt: null,
    role: "attendee",
  });
  mocks.sendAppUserInvite.mockResolvedValue(true);
  mocks.execute.mockResolvedValue({});
  mocks.createSupabaseServiceClient.mockReturnValue({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  });
  mocks.deleteUser.mockResolvedValue({ data: { user: null }, error: null });
}

describe("adding users", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("adds a new attendee without changing roles", async () => {
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("  New@Example.com ", "attendee"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.ensureAppUser).toHaveBeenCalledWith("new@example.com");
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith("new@example.com");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  test("adds a presenter by promoting an existing attendee", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("existing@example.com", "presenter"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith(
      "existing@example.com",
    );
  });

  test("leaves an existing presenter unchanged when adding a presenter", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "presenter",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("existing@example.com", "presenter"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith(
      "existing@example.com",
    );
  });

  test("refuses to demote a presenter by adding them as an attendee", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "presenter",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("existing@example.com", "attendee"),
    ).resolves.toEqual({
      ok: false,
      error: "That email already has a presenter or admin role.",
    });

    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.sendAppUserInvite).not.toHaveBeenCalled();
  });

  test("adds an admin by promoting an existing attendee", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("existing@example.com", "admin"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith(
      "existing@example.com",
    );
  });

  test("adds an admin for a new email", async () => {
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("new@example.com", "admin"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith("new@example.com");
  });

  test("leaves an existing admin unchanged when adding an admin", async () => {
    mocks.ensureAppUser.mockResolvedValue({
      id: "existing-id",
      email: "existing@example.com",
      emailVerifiedAt: null,
      role: "admin",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(
      addUserAction("existing@example.com", "admin"),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.execute).not.toHaveBeenCalled();
  });

  test("only accepts a known role", async () => {
    const { addUserAction } = await import("@/actions/users");

    await expect(addUserAction("new@example.com", "owner")).resolves.toEqual({
      ok: false,
      error: "Choose a valid role.",
    });
    expect(mocks.ensureAppUser).not.toHaveBeenCalled();
  });

  test("rejects invalid email addresses before provisioning", async () => {
    const { addUserAction } = await import("@/actions/users");

    await expect(addUserAction("not-an-email", "attendee")).resolves.toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
    expect(mocks.ensureAppUser).not.toHaveBeenCalled();
  });

  test("a non-admin cannot add users", async () => {
    mocks.requireAdmin.mockResolvedValue({
      ok: false,
      error: "Only the admin can do this.",
    });
    const { addUserAction } = await import("@/actions/users");

    await expect(addUserAction("new@example.com", "attendee")).resolves.toEqual(
      {
        ok: false,
        error: "Only the admin can do this.",
      },
    );
    expect(mocks.ensureAppUser).not.toHaveBeenCalled();
    expect(mocks.sendAppUserInvite).not.toHaveBeenCalled();
  });
});

describe("user role actions", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("rejects invalid role values before executing a role change", async () => {
    const { changeUserRoleAction } = await import("@/actions/users");

    await expect(
      changeUserRoleAction("user-id", "owner"),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("user deletion", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("an admin can delete another user", async () => {
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction(TARGET_ID)).resolves.toEqual({ ok: true });

    expect(mocks.deleteUser).toHaveBeenCalledWith(TARGET_ID);
    expect(mocks.updateTag).toHaveBeenCalledWith("users");
    expect(mocks.updateTag).toHaveBeenCalledWith("talks");
    expect(mocks.updateTag).toHaveBeenCalledWith("roster");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/talks");
  });

  test("an admin cannot delete their own account", async () => {
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction(ADMIN_ID)).resolves.toMatchObject({
      ok: false,
      error: "You can't delete your own account.",
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  test("rejects a malformed user id before calling Supabase", async () => {
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction("not-a-uuid")).resolves.toMatchObject({
      ok: false,
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  test("a non-admin cannot delete users", async () => {
    mocks.requireAdmin.mockResolvedValue({
      ok: false,
      error: "Only the admin can do this.",
    });
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction(TARGET_ID)).resolves.toEqual({
      ok: false,
      error: "Only the admin can do this.",
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  test("explains that the final admin must remain", async () => {
    mocks.deleteUser.mockResolvedValue({
      data: { user: null },
      error: { message: "At least one admin must remain." },
    });
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction(TARGET_ID)).resolves.toMatchObject({
      ok: false,
      error: "At least one admin must remain. Promote another user first.",
    });
  });

  test("reports a deletion failure when the Auth request throws", async () => {
    mocks.deleteUser.mockRejectedValue(new Error("network down"));
    const { deleteUserAction } = await import("@/actions/users");

    await expect(deleteUserAction(TARGET_ID)).resolves.toMatchObject({
      ok: false,
      error: "Could not delete that user.",
    });
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  inviteUserByEmail: vi.fn(),
  selectRows: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => mocks.selectRows() }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    auth: {
      admin: {
        createUser: mocks.createUser,
        inviteUserByEmail: mocks.inviteUserByEmail,
      },
    },
  }),
}));

import { ensureAppUser, sendAppUserInvite } from "@/lib/provision-user";

describe("ensureAppUser", () => {
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectRows.mockResolvedValue([]);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("logs unexpected account-creation failures and returns null", async () => {
    mocks.createUser.mockResolvedValue({
      data: {},
      error: {
        message: "Invalid API key",
        code: "invalid_api_key",
        status: 401,
      },
    });

    await expect(ensureAppUser("User@Example.com")).resolves.toBeNull();

    const [scope, payload] = errorSpy.mock.calls[0] ?? [];
    expect(scope).toBe("[provision-user.create]");
    expect(payload).toContain("invalid_api_key");
    expect(payload).toContain("u***@example.com");
    expect(payload).not.toContain("user@example.com");
  });

  test("treats an existing Auth account as expected and stays quiet", async () => {
    mocks.createUser.mockResolvedValue({
      data: {},
      error: { code: "email_exists", message: "already exists" },
    });
    mocks.selectRows.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "user-id",
        email: "user@example.com",
        emailVerifiedAt: null,
        role: "attendee",
      },
    ]);

    await expect(ensureAppUser("user@example.com")).resolves.toEqual({
      id: "user-id",
      email: "user@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("logs and returns null when account creation throws", async () => {
    mocks.createUser.mockRejectedValue(new Error("network down"));

    await expect(ensureAppUser("user@example.com")).resolves.toBeNull();

    expect(errorSpy.mock.calls[0]?.[1]).toContain("network down");
  });
});

describe("sendAppUserInvite", () => {
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("logs and returns false when the invite fails", async () => {
    mocks.inviteUserByEmail.mockResolvedValue({
      error: {
        message: "Email address not authorized",
        code: "email_address_not_authorized",
      },
    });

    await expect(sendAppUserInvite("Invitee@Example.com")).resolves.toBe(false);

    const [, payload] = errorSpy.mock.calls[0] ?? [];
    expect(payload).toContain("email_address_not_authorized");
    expect(payload).toContain("i***@example.com");
    expect(payload).not.toContain("invitee@example.com");
  });

  test("logs and returns false when sending throws", async () => {
    mocks.inviteUserByEmail.mockRejectedValue(new Error("fetch failed"));

    await expect(sendAppUserInvite("invitee@example.com")).resolves.toBe(false);

    expect(errorSpy.mock.calls[0]?.[1]).toContain("fetch failed");
  });
});

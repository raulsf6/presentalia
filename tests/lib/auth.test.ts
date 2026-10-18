import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  roleRows: [] as { role: string; emailVerifiedAt: Date | null }[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("@/db/schema", () => ({
  appUsers: {
    id: "app_users.id",
    role: "app_users.role",
    emailVerifiedAt: "app_users.email_verified_at",
  },
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => mocks.roleRows,
        }),
      }),
    }),
  }),
}));

import { getSessionUser } from "@/lib/auth";

describe("getSessionUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAIL", "");
    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "Presenter@Example.com" },
      },
      error: null,
    });
    mocks.roleRows = [{ role: "presenter", emailVerifiedAt: new Date() }];
  });

  test("loads the authoritative role from the database and normalizes email", async () => {
    await expect(getSessionUser()).resolves.toEqual({
      id: "user-1",
      email: "presenter@example.com",
      role: "presenter",
    });
  });

  test("does not authorize an authenticated user without an app role row", async () => {
    mocks.roleRows = [];

    await expect(getSessionUser()).resolves.toBeNull();
  });
});

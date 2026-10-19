import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  headers: vi.fn(),
  roleRows: [] as { role: string; emailVerifiedAt: Date | null }[],
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
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
import {
  SESSION_USER_EMAIL_HEADER,
  SESSION_USER_ID_HEADER,
} from "@/lib/session-headers";

describe("getSessionUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAIL", "");
    mocks.headers.mockResolvedValue(new Headers());
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

  test("uses the proxy-verified identity without calling Supabase again", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        [SESSION_USER_ID_HEADER]: "proxy-user",
        [SESSION_USER_EMAIL_HEADER]: "Proxy@Example.com",
      }),
    );

    await expect(getSessionUser()).resolves.toEqual({
      id: "proxy-user",
      email: "proxy@example.com",
      role: "presenter",
    });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  test("falls back to Supabase when the proxy identity is absent", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ [SESSION_USER_EMAIL_HEADER]: "spoofed@example.com" }),
    );

    await expect(getSessionUser()).resolves.toEqual({
      id: "user-1",
      email: "presenter@example.com",
      role: "presenter",
    });
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  test("does not authorize an authenticated user without an app role row", async () => {
    mocks.roleRows = [];

    await expect(getSessionUser()).resolves.toBeNull();
  });
});

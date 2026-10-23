import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appUserRows: [] as { id: string }[],
}));

vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => args,
}));

vi.mock("@/db/schema", () => ({
  appUsers: {
    name: "app_users",
    id: "app_users.id",
    email: "app_users.email",
  },
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: (table: { name: string }) => ({
        where: () => ({
          limit: async () =>
            table.name === "app_users" ? mocks.appUserRows : [],
        }),
      }),
    }),
  }),
}));

import { isAllowedLoginEmail } from "@/lib/auth/login-gate";

describe("isAllowedLoginEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAIL", "");
    mocks.appUserRows = [];
  });

  test("allows provisioned presenters and admins to sign in without a roster", async () => {
    mocks.appUserRows = [{ id: "presenter-id" }];
    await expect(isAllowedLoginEmail("presenter@example.com")).resolves.toBe(
      true,
    );

    mocks.appUserRows = [{ id: "admin-id" }];
    await expect(isAllowedLoginEmail("admin@example.com")).resolves.toBe(true);
  });

  test("allows an attendee account without talk membership but rejects unknown email", async () => {
    mocks.appUserRows = [{ id: "attendee-id" }];
    await expect(isAllowedLoginEmail("attendee@example.com")).resolves.toBe(
      true,
    );

    mocks.appUserRows = [];
    await expect(isAllowedLoginEmail("attendee@example.com")).resolves.toBe(
      false,
    );
  });

  test("allows the configured bootstrap email before its first app role exists", async () => {
    vi.stubEnv("ADMIN_EMAIL", "Admin@Example.com");

    await expect(isAllowedLoginEmail("admin@example.com")).resolves.toBe(true);
  });
});

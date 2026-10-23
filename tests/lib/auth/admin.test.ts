import { afterEach, describe, expect, test, vi } from "vitest";

import { isBootstrapAdminEmail } from "@/lib/auth/admin";

describe("isBootstrapAdminEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("matches the configured admin email case-insensitively", () => {
    vi.stubEnv("ADMIN_EMAIL", "Admin@Example.com");
    expect(isBootstrapAdminEmail("admin@example.com")).toBe(true);
    expect(isBootstrapAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
  });

  test("rejects a non-admin email", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    expect(isBootstrapAdminEmail("attendee@example.com")).toBe(false);
  });

  test("trims whitespace on both the env value and the argument", () => {
    vi.stubEnv("ADMIN_EMAIL", "  admin@example.com  ");
    expect(isBootstrapAdminEmail(" admin@example.com ")).toBe(true);
  });

  test("returns false when ADMIN_EMAIL is unset", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isBootstrapAdminEmail("anyone@example.com")).toBe(false);
  });

  test("returns false for null, undefined, or empty email", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    expect(isBootstrapAdminEmail(null)).toBe(false);
    expect(isBootstrapAdminEmail(undefined)).toBe(false);
    expect(isBootstrapAdminEmail("")).toBe(false);
    expect(isBootstrapAdminEmail("   ")).toBe(false);
  });
});

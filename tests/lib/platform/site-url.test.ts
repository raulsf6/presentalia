import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

import { getSiteUrl } from "@/lib/platform/site-url";

function headerMap(values: Record<string, string>) {
  return new Headers(values);
}

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  test("uses NEXT_PUBLIC_SITE_URL without a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://talks.example.com/");

    await expect(getSiteUrl()).resolves.toBe("https://talks.example.com");
  });

  test("falls back to the forwarded request origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    mocks.headers.mockResolvedValue(
      headerMap({
        "x-forwarded-host": "talks.example.com",
        "x-forwarded-proto": "https",
      }),
    );

    await expect(getSiteUrl()).resolves.toBe("https://talks.example.com");
  });

  test("falls back to localhost without headers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    mocks.headers.mockResolvedValue(headerMap({}));

    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });
});

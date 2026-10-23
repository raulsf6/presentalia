import { describe, expect, test } from "vitest";

import {
  createGuestToken,
  formatGuestJoinedAt,
  guestCookieName,
  hashGuestToken,
  normalizeGuestUsername,
  parseGuestCookie,
  validateGuestUsername,
  verifyGuestToken,
} from "@/lib/talks/talk-guests";

describe("guest usernames", () => {
  test("trims, collapses whitespace, and lowercases the uniqueness key", () => {
    expect(normalizeGuestUsername("  Sam   Smith ")).toBe("sam smith");
    expect(validateGuestUsername("  Sam   Smith ")).toEqual({
      ok: true,
      username: "Sam Smith",
      normalized: "sam smith",
    });
  });

  test("accepts letters, numbers, spaces, dots, underscores, and hyphens", () => {
    for (const name of ["Sam", "Ana 2", "J.R", "dev_1", "ana-maria", "李雷"]) {
      expect(validateGuestUsername(name).ok, name).toBe(true);
    }
  });

  test("rejects names that are too short, too long, or start/end with punctuation", () => {
    for (const name of ["A", "a".repeat(33), "-Sam", "Sam-", ".Sam", "Sam_"]) {
      expect(validateGuestUsername(name).ok, name).toBe(false);
    }
  });

  test("rejects characters outside the allowed set", () => {
    expect(validateGuestUsername("sam@example.com").ok).toBe(false);
    expect(validateGuestUsername("sam<script>").ok).toBe(false);
  });
});

describe("guest tokens", () => {
  test("creates a token whose hash verifies", () => {
    const { token, hash } = createGuestToken();

    expect(token.length).toBeGreaterThan(20);
    expect(hash).toBe(hashGuestToken(token));
    expect(verifyGuestToken(token, hash)).toBe(true);
  });

  test("rejects a different or malformed token", () => {
    const { token, hash } = createGuestToken();
    const other = createGuestToken();

    expect(verifyGuestToken(other.token, hash)).toBe(false);
    expect(verifyGuestToken(`${token}x`, hash)).toBe(false);
    expect(verifyGuestToken("", hash)).toBe(false);
  });
});

describe("guest cookies", () => {
  test("names the cookie after the talk", () => {
    const talkId = crypto.randomUUID();
    expect(guestCookieName(talkId)).toBe(`presentalia_guest_${talkId}`);
  });

  test("parses a guest id and token from the cookie value", () => {
    const guestId = crypto.randomUUID();
    const { token } = createGuestToken();

    expect(parseGuestCookie(`${guestId}.${token}`)).toEqual({ guestId, token });
  });

  test("rejects malformed cookie values", () => {
    expect(parseGuestCookie(undefined)).toBeNull();
    expect(parseGuestCookie("")).toBeNull();
    expect(parseGuestCookie("not-a-uuid.token")).toBeNull();
    expect(parseGuestCookie(`${crypto.randomUUID()}.`)).toBeNull();
    expect(parseGuestCookie(crypto.randomUUID())).toBeNull();
  });
});

describe("guest timestamps", () => {
  test("formats a join time for the roster", () => {
    expect(formatGuestJoinedAt(new Date("2026-10-21T10:05:00Z"))).toBe(
      "Oct 21, 10:05 AM",
    );
  });
});

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export const GUEST_COOKIE_PREFIX = "presentalia_guest_";
export const GUEST_USERNAME_MIN = 2;
export const GUEST_USERNAME_MAX = 32;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u;

export type ValidGuestUsername = {
  ok: true;
  username: string;
  normalized: string;
};

export type GuestUsernameResult =
  ValidGuestUsername | { ok: false; error: string };

/** The stable uniqueness key for a name inside one talk. */
export function normalizeGuestUsername(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The name as it is shown, before lower-casing. */
function displayGuestUsername(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function validateGuestUsername(raw: string): GuestUsernameResult {
  const username = displayGuestUsername(raw);
  const length = [...username].length;
  if (length < GUEST_USERNAME_MIN || length > GUEST_USERNAME_MAX) {
    return {
      ok: false,
      error: `Choose a name between ${GUEST_USERNAME_MIN} and ${GUEST_USERNAME_MAX} characters.`,
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        "Use letters, numbers, spaces, dots, underscores, or hyphens, starting and ending with a letter or number.",
    };
  }
  return {
    ok: true,
    username,
    normalized: normalizeGuestUsername(username),
  };
}

export function createGuestToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashGuestToken(token) };
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyGuestToken(token: string, hash: string): boolean {
  if (!token || !hash) {
    return false;
  }
  const actual = Buffer.from(hashGuestToken(token), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function guestCookieName(talkId: string): string {
  return `${GUEST_COOKIE_PREFIX}${talkId}`;
}

export function isTalkId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseGuestCookie(
  value: string | undefined,
): { guestId: string; token: string } | null {
  if (!value) {
    return null;
  }
  const separator = value.indexOf(".");
  if (separator <= 0) {
    return null;
  }
  const guestId = value.slice(0, separator);
  const token = value.slice(separator + 1);
  if (!UUID_PATTERN.test(guestId) || !token) {
    return null;
  }
  return { guestId, token };
}

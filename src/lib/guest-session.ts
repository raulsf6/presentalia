import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb, type Db, type DbTx } from "@/db";
import { talkGuests, talks } from "@/db/schema";
import {
  guestCookieName,
  isTalkId,
  parseGuestCookie,
  verifyGuestToken,
} from "@/lib/talk-guests";

export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type GuestSession = {
  id: string;
  talkId: string;
  username: string;
};

/**
 * Reads and validates the guest cookie for one talk. A guest session stops
 * working when the talk stops being public, even if the cookie is still valid.
 */
export async function readGuestSession(
  talkId: string,
  db: Db | DbTx = getDb(),
): Promise<GuestSession | null> {
  if (!isTalkId(talkId)) {
    return null;
  }
  const store = await cookies();
  const parsed = parseGuestCookie(store.get(guestCookieName(talkId))?.value);
  if (!parsed) {
    return null;
  }

  const [row] = await db
    .select({
      id: talkGuests.id,
      username: talkGuests.username,
      tokenHash: talkGuests.tokenHash,
      isPublic: talks.isPublic,
    })
    .from(talkGuests)
    .innerJoin(talks, eq(talks.id, talkGuests.talkId))
    .where(
      and(eq(talkGuests.id, parsed.guestId), eq(talkGuests.talkId, talkId)),
    )
    .limit(1);

  if (!row || !row.isPublic) {
    return null;
  }
  if (!verifyGuestToken(parsed.token, row.tokenHash)) {
    return null;
  }
  return { id: row.id, talkId, username: row.username };
}

/** Stores the browser's identity for one talk. */
export async function setGuestCookie(
  talkId: string,
  guestId: string,
  token: string,
): Promise<void> {
  const store = await cookies();
  store.set(guestCookieName(talkId), `${guestId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
}

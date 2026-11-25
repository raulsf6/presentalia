"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { talkGuests, talks } from "@/db/schema";
import { isUniqueViolation } from "@/lib/platform/db-errors";
import { setGuestCookie } from "@/lib/talks/guest-session";
import { requireTalkManager } from "@/lib/talks/membership";
import {
  createGuestToken,
  isTalkId,
  validateGuestUsername,
} from "@/lib/talks/talk-guests";
import type { ActionFailure } from "@/lib/i18n/errors";

export type AnonymousAccessResult = { ok: true } | ActionFailure;

/** Admit an anonymous attendee to a public talk that is accepting joins. */
export async function joinPublicTalkAction(
  talkId: string,
  _previous: AnonymousAccessResult,
  formData: FormData,
): Promise<AnonymousAccessResult> {
  if (!isTalkId(talkId)) {
    return { ok: false, errorKey: "errors.talk.notAvailable" };
  }

  const db = getDb();
  const [talk] = await db
    .select({
      isPublic: talks.isPublic,
      anonymousJoinOpen: talks.anonymousJoinOpen,
    })
    .from(talks)
    .where(eq(talks.id, talkId))
    .limit(1);

  if (!talk || !talk.isPublic) {
    return { ok: false, errorKey: "errors.talk.notAvailable" };
  }
  if (!talk.anonymousJoinOpen) {
    return { ok: false, errorKey: "errors.talk.joinClosed" };
  }

  const validation = validateGuestUsername(
    String(formData.get("username") ?? ""),
  );
  if (!validation.ok) {
    return validation;
  }

  const { token, hash } = createGuestToken();
  let guestId = "";
  try {
    const [guest] = await db
      .insert(talkGuests)
      .values({
        talkId,
        username: validation.username,
        usernameNormalized: validation.normalized,
        tokenHash: hash,
      })
      .returning({ id: talkGuests.id });
    guestId = guest.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        errorKey: "errors.talk.usernameTaken",
      };
    }
    throw error;
  }

  await setGuestCookie(talkId, guestId, token);
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/roster`);
  redirect(`/talks/${talkId}`);
  return { ok: true };
}

/** Turn anonymous access on or off. Enabling it reopens the door. */
export async function setTalkPublicAction(
  talkId: string,
  isPublic: boolean,
): Promise<AnonymousAccessResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  await getDb()
    .update(talks)
    .set(
      isPublic
        ? { isPublic: true, anonymousJoinOpen: true }
        : { isPublic: false },
    )
    .where(eq(talks.id, talkId));

  revalidateTalkSettings(talkId);
  return { ok: true };
}

/** Stop admitting new guests without removing anyone already in the room. */
export async function setAnonymousJoinOpenAction(
  talkId: string,
  joinOpen: boolean,
): Promise<AnonymousAccessResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }
  if (!guard.talk.isPublic && joinOpen) {
    return { ok: false, errorKey: "errors.talk.publicRequired" };
  }

  await getDb()
    .update(talks)
    .set({ anonymousJoinOpen: joinOpen })
    .where(eq(talks.id, talkId));

  revalidateTalkSettings(talkId);
  return { ok: true };
}

function revalidateTalkSettings(talkId: string): void {
  updateTag("talks");
  revalidatePath("/talks");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/roster`);
  revalidatePath(`/talks/${talkId}/join-qr`);
}

/**
 * Removes one guest from the talk. Their votes and answers cascade with the
 * guest row, so live tallies and rankings reflect the removal. The browser's
 * cookie stops working; with joining open they could return under a new name.
 */
export async function removeTalkGuestAction(
  talkId: string,
  guestId: string,
): Promise<AnonymousAccessResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const removed = await getDb()
    .delete(talkGuests)
    .where(and(eq(talkGuests.id, guestId), eq(talkGuests.talkId, talkId)))
    .returning({ id: talkGuests.id });

  if (removed.length === 0) {
    return { ok: false, errorKey: "errors.talk.guestGone" };
  }

  revalidateTalkSettings(talkId);
  return { ok: true };
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { talkGuests, talks } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { setGuestCookie } from "@/lib/guest-session";
import { requireTalkManager } from "@/lib/membership";
import {
  createGuestToken,
  isTalkId,
  validateGuestUsername,
} from "@/lib/talk-guests";

export type AnonymousAccessResult = { ok: boolean; error?: string };

/** Admit an anonymous attendee to a public talk that is accepting joins. */
export async function joinPublicTalkAction(
  talkId: string,
  _previous: AnonymousAccessResult,
  formData: FormData,
): Promise<AnonymousAccessResult> {
  if (!isTalkId(talkId)) {
    return { ok: false, error: "This talk is not available." };
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
    return { ok: false, error: "This talk is not available." };
  }
  if (!talk.anonymousJoinOpen) {
    return { ok: false, error: "Joining for this talk is closed." };
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
        error: "That username is already taken in this talk.",
      };
    }
    throw error;
  }

  await setGuestCookie(talkId, guestId, token);
  revalidatePath(`/talks/${talkId}`);
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
    return { ok: false, error: "Make the talk public first." };
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

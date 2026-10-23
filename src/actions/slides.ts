"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireTalkManager } from "@/lib/talks/membership";
import { clearSlides, markSlidesUploaded } from "@/lib/deck/slide-state";
import {
  createSlidesUploadTicket,
  type SlidesUploadTicket,
} from "@/lib/deck/slides-upload";
import { createSupabaseServiceClient } from "@/lib/platform/supabase/service";

export type SlidesResult = { ok: boolean; error?: string };

/**
 * Validates the declared file metadata and returns a time-limited
 * signed upload token for `${talkId}/slides.pdf`. The browser uploads
 * directly to Supabase Storage so a 20 MB PDF never passes through a Vercel
 * Server Action. The private bucket enforces both PDF MIME type and size.
 */
export async function createSlidesUploadAction(
  talkId: string,
  file: { name: string; type: string; size: number; pdfHeader: string },
): Promise<SlidesUploadTicket> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const service = createSupabaseServiceClient();
  return createSlidesUploadTicket(talkId, file, async (path, options) => {
    const { data, error } = await service.storage
      .from("talk-slides")
      .createSignedUploadUrl(path, options);
    if (error || !data) {
      return null;
    }
    return { path: data.path, token: data.token };
  });
}

/** Records the upload after verifying the expected private object exists. */
export async function completeSlidesUploadAction(
  talkId: string,
): Promise<SlidesResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const service = createSupabaseServiceClient();
  const { data: objects, error } = await service.storage
    .from("talk-slides")
    .list(talkId, { limit: 100, search: "slides.pdf" });
  if (error) {
    return { ok: false, error: "Could not verify the uploaded slides." };
  }
  if (!objects?.some((object) => object.name === "slides.pdf")) {
    return {
      ok: false,
      error: "The upload did not complete. Please try again.",
    };
  }

  const updated = await markSlidesUploaded(talkId);
  if (!updated) {
    return { ok: false, error: "Talk not found." };
  }

  updateTag("talks");
  revalidatePath("/talks");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/slides`);
  return { ok: true };
}

/**
 * Removes the talk's PDF and everything that pointed into it: the plan
 * placements, the page count, and the step on screen. The stored object goes
 * first, so a failed delete never leaves a talk claiming slides it still has.
 */
export async function removeSlidesAction(
  talkId: string,
): Promise<SlidesResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.storage
    .from("talk-slides")
    .remove([`${talkId}/slides.pdf`]);
  if (error) {
    return { ok: false, error: "Could not remove the slides. Try again." };
  }

  const cleared = await clearSlides(talkId);
  if (!cleared) {
    return { ok: false, error: "Talk not found." };
  }

  updateTag("talks");
  revalidatePath("/talks");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/slides`);
  return { ok: true };
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { getDb } from "@/db";
import { talks } from "@/db/schema";
import { requireTalkManager } from "@/lib/membership";
import {
  createSlidesUploadTicket,
  type SlidesUploadTicket,
} from "@/lib/slides-upload";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  const [updated] = await getDb()
    .update(talks)
    .set({ slidesUpdatedAt: new Date() })
    .where(eq(talks.id, talkId))
    .returning({ id: talks.id });
  if (!updated) {
    return { ok: false, error: "Talk not found." };
  }

  updateTag("talks");
  revalidatePath("/talks");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/slides`);
  return { ok: true };
}

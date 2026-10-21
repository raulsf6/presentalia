"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { talks } from "@/db/schema";
import { requireTalkManager } from "@/lib/membership";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requirePresenter } from "@/lib/require-admin";

export type ActionResult = { ok: boolean; error?: string };

/** Creates a presenter-owned talk. */
export async function createTalkAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const presenter = await requirePresenter();
  if (!presenter.ok) {
    return presenter;
  }
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 200) {
    return { ok: false, error: "Give the talk a name (1–200 characters)." };
  }
  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
      ? descriptionRaw.trim()
      : null;
  const heldAtRaw = formData.get("heldAt");
  let heldAt: Date | null = null;
  if (typeof heldAtRaw === "string" && heldAtRaw.length > 0) {
    heldAt = new Date(heldAtRaw);
    if (Number.isNaN(heldAt.getTime())) {
      return { ok: false, error: "That date could not be read." };
    }
  }
  const isPublic = formData.get("isPublic") !== null;
  const [talk] = await getDb()
    .insert(talks)
    .values({
      name,
      description,
      heldAt,
      createdBy: presenter.user.id,
      isPublic,
      anonymousJoinOpen: true,
    })
    .returning();
  updateTag("talks");
  revalidatePath("/talks");
  redirect(`/talks/${talk.id}`);
}

/**
 * Deletes a talk and everything it owns — roster, polls, votes, counts (DB
 * cascade) and the uploaded PDF (storage) — revoking attendee access.
 * Available to the talk's presenter or any admin.
 */
export async function deleteTalkAction(talkId: string): Promise<ActionResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }
  const service = createSupabaseServiceClient();
  const { data: files } = await service.storage
    .from("talk-slides")
    .list(talkId);
  if (files && files.length > 0) {
    await service.storage
      .from("talk-slides")
      .remove(files.map((file) => `${talkId}/${file.name}`));
  }
  await getDb().delete(talks).where(eq(talks.id, guard.talk.id));
  updateTag("talks");
  revalidatePath("/talks");
  redirect("/talks");
}

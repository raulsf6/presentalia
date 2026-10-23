"use server";

import { revalidatePath } from "next/cache";

import {
  saveDeckPlan,
  type DeckPlanInput,
  type DeckPlanResult,
} from "@/lib/deck/deck-plan";
import { requireTalkManager } from "@/lib/talks/membership";

/** Replaces a talk's deck plan. Whole-plan replacement, last write wins. */
export async function saveDeckPlanAction(
  talkId: string,
  input: DeckPlanInput,
): Promise<DeckPlanResult> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }

  const result = await saveDeckPlan(talkId, input);
  if (result.ok) {
    revalidatePath(`/talks/${talkId}/slides`);
    revalidatePath(`/talks/${talkId}`);
  }
  return result;
}

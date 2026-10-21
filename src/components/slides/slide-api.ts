import type { SlideDirection, SlidePosition } from "@/lib/slide-state";

export type MoveResult = { ok: true; state: SlidePosition } | { ok: false };

/**
 * Sends one page move. The projector applies the returned position at once;
 * the phone fires it and ignores the result.
 */
export async function requestSlideMove(
  talkId: string,
  direction: SlideDirection,
): Promise<MoveResult> {
  try {
    const response = await fetch(`/api/talks/${talkId}/slides/navigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false };
    }
    return { ok: true, state: (await response.json()) as SlidePosition };
  } catch {
    return { ok: false };
  }
}

/** Stores the deck's page count so the remote knows where the last slide is. */
export async function reportSlideCount(
  talkId: string,
  count: number,
): Promise<boolean> {
  try {
    const response = await fetch(`/api/talks/${talkId}/slides/count`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

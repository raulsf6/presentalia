"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { startLiveEvents, talkEventsUrl } from "@/lib/platform/live-events";

/**
 * Keeps the talk overview current while it is visible. Activity changes arrive
 * over SSE; the normal authorized page render is still the source of truth.
 */
export function LiveActivityRefresh({ talkId }: { talkId: string }) {
  const router = useRouter();

  useEffect(
    () =>
      startLiveEvents({
        url: talkEventsUrl(talkId),
        refresh: () => router.refresh(),
        visibility: {
          isVisible: () => document.visibilityState === "visible",
          subscribe: (listener) => {
            document.addEventListener("visibilitychange", listener);
            return () => {
              document.removeEventListener("visibilitychange", listener);
            };
          },
        },
      }),
    [router, talkId],
  );

  return null;
}

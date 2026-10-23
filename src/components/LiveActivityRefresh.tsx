"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { startLiveRefresh } from "@/lib/platform/live-refresh";

const REFRESH_INTERVAL_MS = 10_000;

/**
 * The talk page is where attendees wait between activities. Refresh it while
 * visible so a launch or close elsewhere reaches them without a manual reload.
 * The server cache is tag-invalidated by the activity actions, so the refreshed
 * payload is current.
 */
export function LiveActivityRefresh() {
  const router = useRouter();

  useEffect(
    () =>
      startLiveRefresh({
        refresh: () => router.refresh(),
        intervalMs: REFRESH_INTERVAL_MS,
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
    [router],
  );

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Keeps the screen awake while a slide screen is visible. The platform releases
 * the lock whenever the tab hides, so it is re-requested on visibility.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) {
      return;
    }

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (released) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // A browser may refuse (battery saver, unsupported). Not fatal.
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}

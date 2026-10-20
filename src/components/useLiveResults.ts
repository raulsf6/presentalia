"use client";

import { useEffect, useState } from "react";

/**
 * Shared live-results polling. Refreshes every five seconds while the
 * payload reports an active activity, pauses in background tabs, and backs
 * off after transient failures. A 401/404 clears the payload and reports that
 * access was revoked.
 */
export function useLiveResults<T>({
  initial,
  url,
  isActive,
}: {
  initial: T;
  url: string;
  isActive: (payload: T) => boolean;
}) {
  const [payload, setPayload] = useState<T | null>(initial);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const active = payload ? isActive(payload) : false;

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let timer: number | undefined;
    let refreshing = false;
    let failures = 0;

    function schedule(ms: number) {
      if (disposed) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        void refresh();
      }, ms);
    }

    async function refresh() {
      if (disposed || refreshing) return;

      // Do not spend timers or requests while the tab is in the background;
      // the visibility listener refreshes immediately when it returns.
      if (document.visibilityState === "hidden") return;

      refreshing = true;
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (disposed) return;

        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setPayload(null);
            setAccessRevoked(true);
            return;
          }
          failures = Math.min(failures + 1, 3);
          schedule(Math.min(5_000 * 2 ** failures, 30_000));
          return;
        }

        const next = (await response.json()) as T;
        if (!disposed) {
          setPayload(next);
          setAccessRevoked(false);
          failures = 0;
        }
        schedule(5_000);
      } catch {
        // Keep the last known result and retry with backoff.
        failures = Math.min(failures + 1, 3);
        schedule(Math.min(5_000 * 2 ** failures, 30_000));
      } finally {
        refreshing = false;
      }
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      void refresh();
    }

    schedule(5_000);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, url]);

  return { payload, accessRevoked };
}

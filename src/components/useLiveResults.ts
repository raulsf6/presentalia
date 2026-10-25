"use client";

import { useEffect, useState } from "react";

import {
  activityResultsEventsUrl,
  startLiveEvents,
  type LiveEventSource,
} from "@/lib/platform/live-events";
import type { LiveRefreshVisibility } from "@/lib/platform/live-refresh";

function documentVisibility(): LiveRefreshVisibility {
  return {
    isVisible: () => document.visibilityState === "visible",
    subscribe(listener) {
      document.addEventListener("visibilitychange", listener);
      return () => {
        document.removeEventListener("visibilitychange", listener);
      };
    },
  };
}

/** Push-triggered reads bypass the short per-instance results cache. */
function freshResultsUrl(url: string): string {
  const target = new URL(url, window.location.origin);
  target.searchParams.set("fresh", "1");
  return target.toString();
}

/**
 * Shared live-results updates. When an activity id is supplied, the hook
 * subscribes to its SSE stream and fetches the existing results JSON on a
 * change; a fallback poll covers reconnects. Without an activity id it keeps
 * the original polling behavior.
 *
 * Pauses in background tabs, backs off after transient failures, and a
 * 401/404 clears the payload and reports that access was revoked.
 */
export function useLiveResults<T>({
  initial,
  url,
  isActive,
  activityId,
  intervalMs = 5_000,
  createEventSource,
}: {
  initial: T;
  url: string;
  isActive: (payload: T) => boolean;
  /** Subscribe to this activity's SSE updates instead of polling it. */
  activityId?: string;
  /** Fallback polling cadence; also the base for failure backoff. */
  intervalMs?: number;
  /** Test seam for the browser EventSource constructor. */
  createEventSource?: (url: string) => LiveEventSource;
}) {
  const [payload, setPayload] = useState<T | null>(initial);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const active = payload ? isActive(payload) : false;

  useEffect(() => {
    if (!active || accessRevoked) return;

    let disposed = false;
    let pollTimer: number | undefined;
    let retryTimer: number | undefined;
    let refreshing = false;
    let failures = 0;

    function clearPoll() {
      if (pollTimer !== undefined) {
        window.clearTimeout(pollTimer);
        pollTimer = undefined;
      }
    }

    function clearRetry() {
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    }

    function schedulePoll(ms: number) {
      if (disposed || activityId) return;
      clearPoll();
      pollTimer = window.setTimeout(() => {
        pollTimer = undefined;
        void refresh();
      }, ms);
    }

    function scheduleRetry() {
      if (disposed || retryTimer !== undefined) return;
      failures = Math.min(failures + 1, 3);
      retryTimer = window.setTimeout(
        () => {
          retryTimer = undefined;
          void refresh();
        },
        Math.min(intervalMs * 2 ** failures, 30_000),
      );
    }

    async function refresh() {
      if (disposed || refreshing) return;

      // Do not spend timers or requests while the tab is in the background;
      // the visibility listener refreshes immediately when it returns.
      if (document.visibilityState === "hidden") return;

      refreshing = true;
      try {
        const response = await fetch(freshResultsUrl(url), {
          cache: "no-store",
        });
        if (disposed) return;

        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setPayload(null);
            setAccessRevoked(true);
            return;
          }
          scheduleRetry();
          return;
        }

        const next = (await response.json()) as T;
        if (!disposed) {
          clearRetry();
          failures = 0;
          setPayload(next);
          setAccessRevoked(false);
          schedulePoll(intervalMs);
        }
      } catch {
        // Keep the last known result and retry with backoff.
        scheduleRetry();
      } finally {
        refreshing = false;
      }
    }

    let stopEvents: (() => void) | undefined;

    if (activityId) {
      stopEvents = startLiveEvents({
        url: activityResultsEventsUrl(activityId),
        refresh: () => {
          void refresh();
        },
        visibility: documentVisibility(),
        fallbackIntervalMs: intervalMs,
        createEventSource,
      });
    } else {
      const visibility = documentVisibility();
      function handleVisibility() {
        if (document.visibilityState !== "visible") return;
        clearPoll();
        void refresh();
      }
      stopEvents = visibility.subscribe(handleVisibility);
      schedulePoll(intervalMs);
    }

    return () => {
      disposed = true;
      clearPoll();
      clearRetry();
      stopEvents?.();
    };
  }, [active, url, intervalMs, activityId, accessRevoked, createEventSource]);

  return { payload, accessRevoked };
}

import type { LiveRefreshVisibility } from "@/lib/platform/live-refresh";

/** Slower safety net while the event stream is unavailable or reconnecting. */
export const LIVE_EVENTS_FALLBACK_INTERVAL_MS = 60_000;

/** Avoid a burst of route refreshes when several events arrive together. */
const REFRESH_GAP_MS = 1_000;

export type LiveEventSource = {
  onopen: (() => void) | null;
  onerror: (() => void) | null;
  addEventListener(type: "changed" | "resync", listener: () => void): void;
  close(): void;
};

export type StartLiveEventsOptions = {
  url: string;
  refresh: () => void;
  visibility: LiveRefreshVisibility;
  /** Fallback cadence while the stream is not open. */
  fallbackIntervalMs?: number;
  createEventSource?: (url: string) => LiveEventSource;
};

export function talkEventsUrl(talkId: string): string {
  return `/api/talks/${encodeURIComponent(talkId)}/events`;
}

export function activityResultsEventsUrl(activityId: string): string {
  return `/api/activities/${encodeURIComponent(activityId)}/events`;
}

/**
 * Keeps a page in sync while it is visible. The stream is the fast path; the
 * fallback refresh covers the time before it opens, after an error, and while
 * the browser is reconnecting. Hidden tabs do neither.
 */
export function startLiveEvents({
  url,
  refresh,
  visibility,
  fallbackIntervalMs = LIVE_EVENTS_FALLBACK_INTERVAL_MS,
  createEventSource = (target) =>
    new EventSource(target) as unknown as LiveEventSource,
}: StartLiveEventsOptions): () => void {
  let stopped = false;
  let source: LiveEventSource | null = null;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  let coalesce: ReturnType<typeof setTimeout> | undefined;
  let lastRefreshAt = Number.NEGATIVE_INFINITY;

  function clearFallback() {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
  }

  function startFallback() {
    if (stopped || !visibility.isVisible() || fallback !== undefined) {
      return;
    }
    fallback = setTimeout(() => {
      fallback = undefined;
      requestRefresh();
      startFallback();
    }, fallbackIntervalMs);
  }

  function requestRefresh() {
    if (stopped || !visibility.isVisible()) {
      return;
    }
    if (coalesce !== undefined) {
      return;
    }

    const elapsed = Date.now() - lastRefreshAt;
    if (elapsed >= REFRESH_GAP_MS) {
      lastRefreshAt = Date.now();
      refresh();
      return;
    }

    coalesce = setTimeout(() => {
      coalesce = undefined;
      requestRefresh();
    }, REFRESH_GAP_MS - elapsed);
  }

  function disconnect() {
    if (source) {
      source.close();
      source = null;
    }
    clearFallback();
  }

  function connect() {
    if (stopped || !visibility.isVisible() || source) {
      return;
    }

    let next: LiveEventSource;
    try {
      next = createEventSource(url);
    } catch {
      startFallback();
      return;
    }
    next.onopen = () => clearFallback();
    next.onerror = () => startFallback();
    next.addEventListener("changed", requestRefresh);
    next.addEventListener("resync", requestRefresh);
    source = next;
    startFallback();
  }

  function handleVisibility() {
    if (visibility.isVisible()) {
      clearFallback();
      requestRefresh();
      connect();
    } else {
      disconnect();
    }
  }

  const unsubscribe = visibility.subscribe(handleVisibility);
  if (visibility.isVisible()) {
    connect();
  }

  return () => {
    stopped = true;
    if (coalesce !== undefined) {
      clearTimeout(coalesce);
      coalesce = undefined;
    }
    disconnect();
    unsubscribe();
  };
}

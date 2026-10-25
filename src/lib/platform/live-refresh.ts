/**
 * Keeps a page fresh while it is visible: refreshes on an interval, pauses
 * in background tabs, and refreshes immediately when the tab comes back.
 */
export const TALK_OVERVIEW_REFRESH_INTERVAL_MS = 2_000;

export type LiveRefreshVisibility = {
  isVisible(): boolean;
  /** Subscribes to visibility changes and returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

export type LiveRefreshOptions = {
  refresh: () => void;
  intervalMs: number;
  visibility: LiveRefreshVisibility;
};

/**
 * Starts refreshing and returns the stop function. Timers are scheduled only
 * while visible, so a hidden tab costs nothing and a returning tab catches up
 * without waiting for the next interval.
 */
export function startLiveRefresh({
  refresh,
  intervalMs,
  visibility,
}: LiveRefreshOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function schedule() {
    if (stopped || !visibility.isVisible()) return;
    timer = setTimeout(() => {
      timer = undefined;
      tick();
    }, intervalMs);
  }

  function tick() {
    if (stopped || !visibility.isVisible()) return;
    refresh();
    schedule();
  }

  function handleVisibility() {
    clearTimer();
    if (visibility.isVisible()) {
      tick();
    }
  }

  const unsubscribe = visibility.subscribe(handleVisibility);
  schedule();

  return () => {
    stopped = true;
    clearTimer();
    unsubscribe();
  };
}

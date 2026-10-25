import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  startLiveRefresh,
  TALK_OVERVIEW_REFRESH_INTERVAL_MS,
} from "@/lib/platform/live-refresh";

function fakeVisibility(initialVisible: boolean) {
  let visible = initialVisible;
  const listeners = new Set<() => void>();
  return {
    isVisible: () => visible,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: boolean) {
      visible = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startLiveRefresh", () => {
  test("uses a two-second cadence for the talk overview", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const stop = startLiveRefresh({
      refresh,
      intervalMs: TALK_OVERVIEW_REFRESH_INTERVAL_MS,
      visibility,
    });

    vi.advanceTimersByTime(1_999);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    stop();
  });

  test("refreshes on the interval while the page is visible", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const stop = startLiveRefresh({ refresh, intervalMs: 10_000, visibility });

    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(3);

    stop();
  });

  test("pauses in a hidden tab and refreshes as soon as it is visible", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const stop = startLiveRefresh({ refresh, intervalMs: 10_000, visibility });

    vi.advanceTimersByTime(10_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    visibility.set(false);
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    visibility.set(true);
    expect(refresh).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10_000);
    expect(refresh).toHaveBeenCalledTimes(3);

    stop();
  });

  test("does not poll a page that starts hidden", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(false);
    const stop = startLiveRefresh({ refresh, intervalMs: 10_000, visibility });

    vi.advanceTimersByTime(30_000);
    expect(refresh).not.toHaveBeenCalled();

    visibility.set(true);
    expect(refresh).toHaveBeenCalledTimes(1);

    stop();
  });

  test("stops polling and unsubscribes when stopped", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const stop = startLiveRefresh({ refresh, intervalMs: 10_000, visibility });

    vi.advanceTimersByTime(10_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    stop();
    vi.advanceTimersByTime(30_000);
    visibility.set(false);
    visibility.set(true);

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

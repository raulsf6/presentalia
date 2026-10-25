import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  activityResultsEventsUrl,
  startLiveEvents,
  LIVE_EVENTS_FALLBACK_INTERVAL_MS,
  talkEventsUrl,
  type LiveEventSource,
} from "@/lib/platform/live-events";

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

class FakeEventSource implements LiveEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, Set<() => void>>();
  close = vi.fn();

  constructor(readonly url: string) {}

  addEventListener(type: string, listener: () => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

function fakeEventSources() {
  const sources: FakeEventSource[] = [];
  return {
    sources,
    create(url: string) {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startLiveEvents", () => {
  test("opens the talk stream and refreshes on resync", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    expect(events.sources[0]?.url).toBe("/api/talks/talk-1/events");
    events.sources[0]?.emit("resync");

    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  test("coalesces events that arrive close together", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    events.sources[0]?.emit("changed");
    events.sources[0]?.emit("changed");
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
  });

  test("falls back to a slow refresh while the stream is unavailable", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    events.sources[0]?.onerror?.();
    vi.advanceTimersByTime(LIVE_EVENTS_FALLBACK_INTERVAL_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  test("uses a caller-provided fallback cadence", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      fallbackIntervalMs: 5_000,
      createEventSource: events.create,
    });

    vi.advanceTimersByTime(4_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  test("stops the fallback once the stream opens", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    events.sources[0]?.emit("changed");
    events.sources[0]?.onopen?.();
    vi.advanceTimersByTime(LIVE_EVENTS_FALLBACK_INTERVAL_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  test("closes the stream while hidden and reconnects when visible", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    visibility.set(false);
    expect(events.sources[0]?.close).toHaveBeenCalledTimes(1);

    visibility.set(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(events.sources).toHaveLength(2);

    stop();
  });

  test("falls back when EventSource is unavailable", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: () => {
        throw new Error("unsupported");
      },
    });

    vi.advanceTimersByTime(LIVE_EVENTS_FALLBACK_INTERVAL_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  test("closes the stream and unsubscribes on stop", () => {
    const refresh = vi.fn();
    const visibility = fakeVisibility(true);
    const events = fakeEventSources();
    const stop = startLiveEvents({
      url: talkEventsUrl("talk-1"),
      refresh,
      visibility,
      createEventSource: events.create,
    });

    stop();
    events.sources[0]?.emit("changed");
    vi.advanceTimersByTime(LIVE_EVENTS_FALLBACK_INTERVAL_MS);

    expect(events.sources[0]?.close).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("talkEventsUrl", () => {
  test("encodes the talk id", () => {
    expect(talkEventsUrl("a/b c")).toBe("/api/talks/a%2Fb%20c/events");
  });
});

describe("activityResultsEventsUrl", () => {
  test("encodes the activity id", () => {
    expect(activityResultsEventsUrl("a/b c")).toBe(
      "/api/activities/a%2Fb%20c/events",
    );
  });
});

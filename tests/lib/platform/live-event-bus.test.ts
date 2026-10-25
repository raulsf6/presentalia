import { afterEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import {
  createLiveEventBus,
  publishActivityResultsChanged,
  publishActivityStatusChanged,
  liveEventConnectionString,
  type LiveEventClient,
} from "@/lib/platform/live-event-bus";

function fakeClient() {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  const client = {
    connect: vi.fn(async () => {}),
    query: vi.fn(async () => ({})),
    end: vi.fn(async () => {}),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      const set = handlers.get(event) ?? new Set();
      set.add(listener);
      handlers.set(event, set);
      return client;
    }),
  };

  function emit(event: string, value?: unknown) {
    for (const listener of handlers.get(event) ?? []) {
      listener(value);
    }
  }

  return { client, emit };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("liveEventConnectionString", () => {
  test("prefers the session pooler for LISTEN", () => {
    vi.stubEnv("SUPABASE_DB_URL", "postgres://session");
    vi.stubEnv("POSTGRES_URL", "postgres://transaction");

    expect(liveEventConnectionString()).toBe("postgres://session");
  });

  test("falls back to the app connection when no session URL is set", () => {
    vi.stubEnv("SUPABASE_DB_URL", "");
    vi.stubEnv("POSTGRES_URL", "postgres://transaction");

    expect(liveEventConnectionString()).toBe("postgres://transaction");
  });
});

describe("createLiveEventBus", () => {
  test("sends talk changes only to that talk's subscribers", async () => {
    const { client, emit } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe("talk-1", first);
    bus.subscribe("talk-2", second);
    await flush();

    emit("notification", { payload: JSON.stringify({ talkId: "talk-1" }) });

    expect(first).toHaveBeenCalledWith({ type: "changed" });
    expect(second.mock.calls).not.toContainEqual([{ type: "changed" }]);
    bus.stop();
  });

  test("resyncs connected streams after the listener connects", async () => {
    const { client } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const listener = vi.fn();
    bus.subscribe("talk-1", listener);
    await flush();

    expect(listener).toHaveBeenCalledWith({ type: "resync" });
    expect(client.query).toHaveBeenCalledWith("listen activity_events");
    bus.stop();
  });

  test("routes activity updates only to that activity's subscribers", async () => {
    const { client, emit } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const talkListener = vi.fn();
    const activityListener = vi.fn();
    bus.subscribe("talk-1", talkListener);
    bus.subscribeToActivityResults("activity-1", activityListener);
    await flush();
    talkListener.mockClear();
    activityListener.mockClear();

    emit("notification", {
      payload: JSON.stringify({
        scope: "results",
        talkId: "talk-1",
        activityId: "activity-1",
      }),
    });

    expect(activityListener).toHaveBeenCalledWith({ type: "changed" });
    expect(talkListener).not.toHaveBeenCalled();
    bus.stop();
  });

  test("a status change reaches both the talk and its activity", async () => {
    const { client, emit } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const talkListener = vi.fn();
    const activityListener = vi.fn();
    bus.subscribe("talk-1", talkListener);
    bus.subscribeToActivityResults("activity-1", activityListener);
    await flush();
    talkListener.mockClear();
    activityListener.mockClear();

    emit("notification", {
      payload: JSON.stringify({
        scope: "status",
        talkId: "talk-1",
        activityId: "activity-1",
      }),
    });

    expect(talkListener).toHaveBeenCalledWith({ type: "changed" });
    expect(activityListener).toHaveBeenCalledWith({ type: "changed" });
    bus.stop();
  });

  test("ignores malformed notifications", async () => {
    const { client, emit } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const listener = vi.fn();
    bus.subscribe("talk-1", listener);
    await flush();

    emit("notification", { payload: "not-json" });
    emit("notification", { payload: JSON.stringify({ talkId: 42 }) });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: "resync" });
    bus.stop();
  });

  test("unsubscribing the last listener closes the database client", async () => {
    const { client } = fakeClient();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => client as unknown as LiveEventClient,
    });
    const unsubscribe = bus.subscribe("talk-1", vi.fn());
    await flush();

    unsubscribe();

    expect(client.end).toHaveBeenCalledTimes(1);
    bus.stop();
  });

  test("a failed client construction leaves the bus in fallback mode", () => {
    const onError = vi.fn();
    const bus = createLiveEventBus({
      connectionString: "postgres://test",
      createClient: () => {
        throw new Error("bad connection string");
      },
      onError,
    });

    expect(() => bus.subscribe("talk-1", vi.fn())).not.toThrow();
    expect(onError).toHaveBeenCalledWith(
      "live-events.listen",
      expect.any(Error),
    );
    bus.stop();
  });
});

describe("publishActivityResultsChanged", () => {
  test("sends result changes without failing the vote action", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));

    await expect(
      publishActivityResultsChanged("talk-1", "activity-1", {
        db: { execute } as unknown as Db,
      }),
    ).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("publishActivityStatusChanged", () => {
  test("notifies Postgres with the talk id", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));

    await publishActivityStatusChanged("talk-1", {
      db: { execute } as unknown as Db,
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("swallows publish failures so the activity action still succeeds", async () => {
    const error = new Error("database unavailable");
    const execute = vi.fn(async () => {
      throw error;
    });
    const onError = vi.fn();

    await expect(
      publishActivityStatusChanged("talk-1", {
        db: { execute } as unknown as Db,
        onError,
      }),
    ).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledWith("live-events.publish", error, {
      scope: "status",
      talkId: "talk-1",
    });
  });
});

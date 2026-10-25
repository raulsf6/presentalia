import { sql } from "drizzle-orm";
import { Client } from "pg";

import { getDb, withLibpqSslCompat, type Db } from "@/db";
import { logServerError } from "@/lib/platform/server-log";

export const LIVE_EVENTS_CHANNEL = "activity_events";

export type LiveEvent = { type: "changed" } | { type: "resync" };
export type LiveEventListener = (event: LiveEvent) => void;

/** The narrow pg.Client surface used by the bus, injectable for tests. */
export type LiveEventClient = Pick<Client, "connect" | "query" | "end" | "on">;

type ReportError = (
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
) => void;

/**
 * `LISTEN` only works on a session-mode connection. Prefer the connection the
 * Vercel/Supabase integration marks as non-pooling, then an explicitly
 * configured session URL. Never fall back to `POSTGRES_URL`, which is the
 * transaction pooler and cannot keep a listener open.
 */
export function liveEventConnectionString(): string | null {
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    null
  );
}

export type LiveEventBusOptions = {
  connectionString: string | null;
  createClient?: (connectionString: string) => LiveEventClient;
  retryDelayMs?: number;
  onError?: ReportError;
};

export type LiveEventBus = {
  subscribe(talkId: string, listener: LiveEventListener): () => void;
  subscribeToActivityResults(
    activityId: string,
    listener: LiveEventListener,
  ): () => void;
  stop(): void;
};

/**
 * One Postgres listener per server instance, fanned out in memory to the open
 * talk streams. A notification carries only a talk id; the stream emits a
 * generic change event.
 */
export function createLiveEventBus({
  connectionString,
  createClient = (url) =>
    new Client({ connectionString: withLibpqSslCompat(url) }),
  retryDelayMs = 2_000,
  onError = logServerError,
}: LiveEventBusOptions): LiveEventBus {
  const talkListeners = new Map<string, Set<LiveEventListener>>();
  const activityListeners = new Map<string, Set<LiveEventListener>>();
  let client: LiveEventClient | null = null;
  let connecting = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let missingConnectionReported = false;

  function report(scope: string, error: unknown) {
    onError(scope, error);
  }

  function closeClient() {
    const current = client;
    client = null;
    connecting = false;
    if (current) {
      try {
        void current.end();
      } catch {
        // The socket is already gone; there is nothing else to clean up.
      }
    }
  }

  function notify(map: Map<string, Set<LiveEventListener>>, id: string): void {
    for (const listener of map.get(id) ?? []) {
      listener({ type: "changed" });
    }
  }

  function listenerCount(): number {
    let count = 0;
    for (const set of talkListeners.values()) {
      count += set.size;
    }
    for (const set of activityListeners.values()) {
      count += set.size;
    }
    return count;
  }

  function dispatch(payload: string | undefined): void {
    if (!payload) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const { scope, talkId, activityId } = parsed as {
      scope?: unknown;
      talkId?: unknown;
      activityId?: unknown;
    };

    // Result updates go only to one activity's results viewers. Status
    // changes (scope "status") also reach the talk overview and, when an
    // activity is present, that activity's results viewers.
    if (scope !== "results" && typeof talkId === "string") {
      notify(talkListeners, talkId);
    }
    if (typeof activityId === "string") {
      notify(activityListeners, activityId);
    }
  }

  function resyncAll(): void {
    for (const map of [talkListeners, activityListeners]) {
      for (const set of map.values()) {
        for (const listener of set) {
          listener({ type: "resync" });
        }
      }
    }
  }

  function scheduleReconnect(): void {
    if (stopped || retry !== undefined || listenerCount() === 0) {
      return;
    }
    retry = setTimeout(() => {
      retry = undefined;
      connect();
    }, retryDelayMs);
  }

  function disconnect(instance: LiveEventClient): void {
    if (client !== instance) {
      return;
    }
    closeClient();
    scheduleReconnect();
  }

  function connect(): void {
    if (stopped || connecting || client || listenerCount() === 0) {
      return;
    }
    if (!connectionString) {
      if (!missingConnectionReported) {
        missingConnectionReported = true;
        report(
          "live-events.listen",
          new Error(
            "POSTGRES_URL_NON_POOLING or SUPABASE_DB_URL is required for live events; POSTGRES_URL is pooled and cannot LISTEN.",
          ),
        );
      }
      return;
    }

    connecting = true;
    let created: LiveEventClient;
    try {
      created = createClient(connectionString);
    } catch (error) {
      connecting = false;
      report("live-events.listen", error);
      return;
    }
    client = created;

    created.on("notification", (message) => {
      dispatch(message.payload);
    });
    created.on("error", (error) => {
      report("live-events.listen", error);
      disconnect(created);
    });
    created.on("end", () => {
      disconnect(created);
    });

    void created
      .connect()
      .then(() => created.query(`listen ${LIVE_EVENTS_CHANNEL}`))
      .then(() => {
        if (client !== created) {
          return;
        }
        connecting = false;
        // NOTIFY is not durable. Anything sent while the listener was down is
        // gone, so every open stream re-reads its authorized page.
        resyncAll();
      })
      .catch((error) => {
        report("live-events.listen", error);
        disconnect(created);
      });
  }

  function addListener(
    map: Map<string, Set<LiveEventListener>>,
    id: string,
    listener: LiveEventListener,
  ): () => void {
    const set = map.get(id) ?? new Set();
    set.add(listener);
    map.set(id, set);
    connect();

    return () => {
      const current = map.get(id);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        map.delete(id);
      }
      if (listenerCount() === 0) {
        if (retry !== undefined) {
          clearTimeout(retry);
          retry = undefined;
        }
        closeClient();
      }
    };
  }

  return {
    subscribe(talkId, listener) {
      return addListener(talkListeners, talkId, listener);
    },

    subscribeToActivityResults(activityId, listener) {
      return addListener(activityListeners, activityId, listener);
    },

    stop() {
      stopped = true;
      if (retry !== undefined) {
        clearTimeout(retry);
        retry = undefined;
      }
      talkListeners.clear();
      activityListeners.clear();
      closeClient();
    },
  };
}

declare global {
  var __presentaliaLiveEvents: LiveEventBus | undefined;
}

function getLiveEventBus(): LiveEventBus {
  if (!globalThis.__presentaliaLiveEvents) {
    globalThis.__presentaliaLiveEvents = createLiveEventBus({
      connectionString: liveEventConnectionString(),
    });
  }
  return globalThis.__presentaliaLiveEvents;
}

/** Subscribes to generic activity-change signals for one talk. */
export function subscribeToTalkStatus(
  talkId: string,
  listener: LiveEventListener,
): () => void {
  return getLiveEventBus().subscribe(talkId, listener);
}

/** Subscribes to result changes for one activity. */
export function subscribeToActivityResults(
  activityId: string,
  listener: LiveEventListener,
): () => void {
  return getLiveEventBus().subscribeToActivityResults(activityId, listener);
}

type PublishOptions = {
  db?: Db;
  onError?: ReportError;
};

export type PublishActivityStatusOptions = PublishOptions & {
  /** A status change that also refreshes that activity's results viewers. */
  activityId?: string;
};

async function publishNotification(
  payload: Record<string, string>,
  { db, onError = logServerError }: PublishOptions,
): Promise<void> {
  try {
    const connection = db ?? getDb();
    await connection.execute(
      sql`select pg_notify(${LIVE_EVENTS_CHANNEL}, ${JSON.stringify(payload)})`,
    );
  } catch (error) {
    onError("live-events.publish", error, payload);
  }
}

/**
 * Best-effort signal after the activity action has invalidated the talk's
 * cache. Publishing must never turn a successful activity change into an
 * error; the next reconnect or fallback refresh repairs a missed signal.
 */
export async function publishActivityStatusChanged(
  talkId: string,
  { activityId, ...options }: PublishActivityStatusOptions = {},
): Promise<void> {
  await publishNotification(
    {
      scope: "status",
      talkId,
      ...(activityId ? { activityId } : {}),
    },
    options,
  );
}

/** Tells only the activity's results viewers that their payload changed. */
export async function publishActivityResultsChanged(
  talkId: string,
  activityId: string,
  options: PublishOptions = {},
): Promise<void> {
  await publishNotification({ scope: "results", talkId, activityId }, options);
}

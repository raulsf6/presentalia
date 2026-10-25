import type { LiveEventListener } from "@/lib/platform/live-event-bus";

export const LIVE_EVENT_STREAM_LIFETIME_MS = 270_000;
export const LIVE_EVENT_HEARTBEAT_MS = 20_000;

export type LiveEventStreamOptions = {
  lifetimeMs?: number;
  heartbeatMs?: number;
  /** Request abort signal so a disconnected client releases the listener. */
  signal?: AbortSignal;
};

type Subscribe = (listener: LiveEventListener) => () => void;

/**
 * Builds an SSE body that lives just under Vercel Hobby's five-minute Function
 * limit. EventSource reconnects after the close and receives a fresh resync.
 */
export function createLiveEventStream(
  subscribe: Subscribe,
  {
    lifetimeMs = LIVE_EVENT_STREAM_LIFETIME_MS,
    heartbeatMs = LIVE_EVENT_HEARTBEAT_MS,
    signal,
  }: LiveEventStreamOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let cleaned = false;

      const send = (event: string) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
        } catch {
          closed = true;
          cleanup();
        }
      };

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // The consumer already cancelled; the cleanup above is enough.
        }
      };

      const heartbeat = setInterval(() => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, heartbeatMs);
      const lifetime = setTimeout(close, lifetimeMs);
      const unsubscribe = subscribe((event) => send(event.type));

      cleanup = () => {
        if (cleaned) {
          return;
        }
        cleaned = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        signal?.removeEventListener("abort", close);
        unsubscribe();
      };

      signal?.addEventListener("abort", close, { once: true });
      if (signal?.aborted) {
        close();
      } else {
        send("resync");
      }
    },

    cancel() {
      cleanup();
    },
  });
}

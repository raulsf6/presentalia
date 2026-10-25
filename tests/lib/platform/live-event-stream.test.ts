import { describe, expect, test, vi } from "vitest";

import { createLiveEventStream } from "@/lib/platform/live-event-stream";
import type { LiveEventListener } from "@/lib/platform/live-event-bus";

const decoder = new TextDecoder();

async function readFrame(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const result = await reader.read();
  if (result.done) {
    return "";
  }
  return decoder.decode(result.value);
}

describe("createLiveEventStream", () => {
  test("starts with a resync so the page can close the subscription gap", async () => {
    const unsubscribe = vi.fn();
    const stream = createLiveEventStream(() => unsubscribe);
    const reader = stream.getReader();

    await expect(readFrame(reader)).resolves.toBe(
      "event: resync\ndata: {}\n\n",
    );

    await reader.cancel();
  });

  test("forwards changed and resync events without a payload", async () => {
    let listener: LiveEventListener = () => {};
    const stream = createLiveEventStream((next) => {
      listener = next;
      return () => {};
    });
    const reader = stream.getReader();
    await readFrame(reader);

    listener({ type: "changed" });
    await expect(readFrame(reader)).resolves.toBe(
      "event: changed\ndata: {}\n\n",
    );

    listener({ type: "resync" });
    await expect(readFrame(reader)).resolves.toBe(
      "event: resync\ndata: {}\n\n",
    );

    await reader.cancel();
  });

  test("unsubscribes when the reader cancels", async () => {
    const unsubscribe = vi.fn();
    const stream = createLiveEventStream(() => unsubscribe);
    const reader = stream.getReader();
    await readFrame(reader);

    await reader.cancel();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("unsubscribes when the request aborts", async () => {
    const unsubscribe = vi.fn();
    const abort = new AbortController();
    const stream = createLiveEventStream(() => unsubscribe, {
      signal: abort.signal,
    });
    const reader = stream.getReader();
    await readFrame(reader);

    abort.abort();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await reader.cancel();
  });
});

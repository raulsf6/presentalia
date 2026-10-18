import { afterEach, describe, expect, test, vi } from "vitest";

import { waitForMinimumDuration } from "@/lib/auth-timing";

describe("waitForMinimumDuration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("waits until the configured response duration has elapsed", async () => {
    vi.useFakeTimers({ now: 1_000 });
    const startedAt = Date.now();
    const wait = waitForMinimumDuration(startedAt, 2_000);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(wait).resolves.toBeUndefined();
  });

  test("does not add delay when the minimum duration already elapsed", async () => {
    vi.useFakeTimers({ now: 5_000 });
    const wait = waitForMinimumDuration(1_000, 2_000);

    await expect(wait).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});

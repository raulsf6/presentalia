/** Pad a sensitive auth response to a minimum duration to reduce timing leaks. */
export async function waitForMinimumDuration(
  startedAt: number,
  minimumDurationMs: number,
): Promise<void> {
  const remaining = minimumDurationMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
}

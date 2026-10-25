import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActivityTalkAccess: vi.fn(),
  subscribeToActivityResults: vi.fn(),
  unsubscribe: vi.fn(),
  listener: undefined as
    ((event: { type: "changed" | "resync" }) => void) | undefined,
}));

vi.mock("@/lib/activities/results-access", () => ({
  getActivityTalkAccess: mocks.getActivityTalkAccess,
}));

vi.mock("@/lib/platform/live-event-bus", () => ({
  subscribeToActivityResults: mocks.subscribeToActivityResults,
}));

import {
  GET,
  maxDuration,
} from "@/app/api/activities/[activityId]/events/route";

const params = Promise.resolve({ activityId: "activity-1" });
const decoder = new TextDecoder();

async function readFrame(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const result = await reader.read();
  return result.done ? "" : decoder.decode(result.value);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActivityTalkAccess.mockResolvedValue({
    access: "member",
    user: { id: "member-1", email: "m@example.com", role: "attendee" },
    talk: { id: "talk-1" },
  });
  mocks.subscribeToActivityResults.mockImplementation(
    (_activityId: string, listener: typeof mocks.listener) => {
      mocks.listener = listener;
      return mocks.unsubscribe;
    },
  );
});

describe("GET /api/activities/[activityId]/events", () => {
  test("rejects a request without talk access", async () => {
    mocks.getActivityTalkAccess.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/activities/activity-1/events"),
      { params },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.subscribeToActivityResults).not.toHaveBeenCalled();
  });

  test("streams a resync first and then result changes for one activity", async () => {
    const response = await GET(
      new Request("http://localhost/api/activities/activity-1/events"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(maxDuration).toBe(300);
    expect(mocks.getActivityTalkAccess).toHaveBeenCalledWith("activity-1");
    expect(mocks.subscribeToActivityResults).toHaveBeenCalledWith(
      "activity-1",
      expect.any(Function),
    );

    const reader = response.body!.getReader();
    await expect(readFrame(reader)).resolves.toBe(
      "event: resync\ndata: {}\n\n",
    );

    mocks.listener?.({ type: "changed" });
    await expect(readFrame(reader)).resolves.toBe(
      "event: changed\ndata: {}\n\n",
    );

    await reader.cancel();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

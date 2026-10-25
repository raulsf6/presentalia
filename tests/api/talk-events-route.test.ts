import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadTalkAccess: vi.fn(),
  subscribeToTalkStatus: vi.fn(),
  unsubscribe: vi.fn(),
  listener: undefined as
    ((event: { type: "changed" | "resync" }) => void) | undefined,
}));

vi.mock("@/lib/talks/membership", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/talks/membership")>();
  return { ...actual, loadTalkAccess: mocks.loadTalkAccess };
});

vi.mock("@/lib/platform/live-event-bus", () => ({
  subscribeToTalkStatus: mocks.subscribeToTalkStatus,
}));

import { GET, maxDuration } from "@/app/api/talks/[talkId]/events/route";

const params = Promise.resolve({ talkId: "talk-1" });

const decoder = new TextDecoder();

async function readFrame(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const result = await reader.read();
  return result.done ? "" : decoder.decode(result.value);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadTalkAccess.mockResolvedValue({
    access: "member",
    user: { id: "member-1", email: "m@example.com", role: "attendee" },
    talk: { id: "talk-1" },
  });
  mocks.subscribeToTalkStatus.mockImplementation(
    (_talkId: string, listener: typeof mocks.listener) => {
      mocks.listener = listener;
      return mocks.unsubscribe;
    },
  );
});

describe("GET /api/talks/[talkId]/events", () => {
  test("rejects a request without talk access", async () => {
    mocks.loadTalkAccess.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/talks/talk-1/events"),
      { params },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.subscribeToTalkStatus).not.toHaveBeenCalled();
  });

  test("streams a resync first and then generic change events", async () => {
    const response = await GET(
      new Request("http://localhost/api/talks/talk-1/events"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
    expect(maxDuration).toBe(300);
    expect(mocks.loadTalkAccess).toHaveBeenCalledWith("talk-1");
    expect(mocks.subscribeToTalkStatus).toHaveBeenCalledWith(
      "talk-1",
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

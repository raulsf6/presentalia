import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  loadTextResults: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/text-results", () => ({
  loadTextResults: mocks.loadTextResults,
}));

import { GET } from "@/app/api/text/[activityId]/results/route";

const params = Promise.resolve({ activityId: "activity-1" });

function request(url = "http://localhost/api/text/activity-1/results") {
  return new Request(url);
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    activity: { id: "activity-1", talkId: "talk-1", status: "active" },
    mode: "waiting",
    needsVote: false,
    rows: [],
    dropped: null,
    run: null,
    summary: null,
    droppedCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue({
    id: "user-1",
    email: "member@example.com",
    role: "attendee",
  });
});

describe("GET /api/text/[activityId]/results", () => {
  test("requires a session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    const response = await GET(request(), { params });

    expect(response.status).toBe(401);
  });

  test("hides a missing or draft activity", async () => {
    mocks.loadTextResults.mockResolvedValue(
      payload({ activity: { id: "activity-1", talkId: "talk-1", status: "draft" } }),
    );

    const response = await GET(request(), { params });

    expect(response.status).toBe(404);
  });

  test("asks a member to answer before seeing results", async () => {
    mocks.loadTextResults.mockResolvedValue(payload({ needsVote: true }));

    const response = await GET(request(), { params });

    expect(response.status).toBe(403);
  });

  test("returns the payload without caching", async () => {
    mocks.loadTextResults.mockResolvedValue(payload());

    const response = await GET(request(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

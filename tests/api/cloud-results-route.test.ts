import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActivityTalkAccess: vi.fn(),
  loadCloudResults: vi.fn(),
}));

vi.mock("@/lib/activities/results-access", () => ({
  getActivityTalkAccess: mocks.getActivityTalkAccess,
}));
vi.mock("@/lib/activities/cloud-results", () => ({
  loadCloudResults: mocks.loadCloudResults,
}));

import { GET } from "@/app/api/cloud/[activityId]/results/route";

const params = Promise.resolve({ activityId: "activity-1" });

const memberAccess = {
  access: "member" as const,
  user: {
    id: "user-1",
    email: "member@example.com",
    role: "attendee" as const,
  },
  talk: { id: "talk-1" },
};

function request() {
  return new Request("http://localhost/api/cloud/activity-1/results");
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    activity: {
      id: "activity-1",
      talkId: "talk-1",
      status: "active",
      prompt: "What next?",
    },
    mode: "waiting",
    needsVote: false,
    items: [],
    hiddenIdeas: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActivityTalkAccess.mockResolvedValue(memberAccess);
});

describe("GET /api/cloud/[activityId]/results", () => {
  test("requires talk access", async () => {
    mocks.getActivityTalkAccess.mockResolvedValue(null);

    const response = await GET(request(), { params });

    expect(response.status).toBe(401);
  });

  test("serves a guest with access to the talk", async () => {
    const guestAccess = {
      access: "guest" as const,
      guest: { id: "guest-1", talkId: "talk-1", username: "Sam" },
      talk: { id: "talk-1" },
    };
    mocks.getActivityTalkAccess.mockResolvedValue(guestAccess);
    mocks.loadCloudResults.mockResolvedValue(payload());

    const response = await GET(request(), { params });

    expect(response.status).toBe(200);
    expect(mocks.loadCloudResults).toHaveBeenCalledWith(
      "activity-1",
      guestAccess,
    );
  });

  test("hides a missing or ready activity", async () => {
    mocks.loadCloudResults.mockResolvedValue(
      payload({
        activity: {
          id: "activity-1",
          talkId: "talk-1",
          status: "ready",
          prompt: "What next?",
        },
      }),
    );

    const response = await GET(request(), { params });

    expect(response.status).toBe(404);
  });

  test("asks an attendee to submit before seeing results", async () => {
    mocks.loadCloudResults.mockResolvedValue(payload({ needsVote: true }));

    const response = await GET(request(), { params });

    expect(response.status).toBe(403);
  });

  test("returns the payload without caching", async () => {
    mocks.loadCloudResults.mockResolvedValue(payload());

    const response = await GET(request(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

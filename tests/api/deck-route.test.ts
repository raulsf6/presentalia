import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeManagerAccess: vi.fn(),
  loadDeckActivity: vi.fn(),
}));

vi.mock("@/lib/slide-access", () => ({
  authorizeManagerAccess: mocks.authorizeManagerAccess,
}));
vi.mock("@/lib/deck-activity", () => ({
  loadDeckActivity: mocks.loadDeckActivity,
}));

import { GET } from "@/app/api/talks/[talkId]/activities/[activityId]/deck/route";

const params = Promise.resolve({
  talkId: "talk-1",
  activityId: "activity-1",
});

const managerAccess = {
  access: "presenter" as const,
  user: {
    id: "user-1",
    email: "owner@example.com",
    role: "presenter" as const,
  },
  talk: { id: "talk-1" },
};

function request() {
  return new Request(
    "http://localhost/api/talks/talk-1/activities/activity-1/deck",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizeManagerAccess.mockResolvedValue({
    ok: true,
    access: managerAccess,
  });
});

describe("GET /api/talks/[talkId]/activities/[activityId]/deck", () => {
  test("passes the authorization failure through", async () => {
    mocks.authorizeManagerAccess.mockResolvedValue({
      ok: false,
      status: 403,
      error: "You can't control this talk.",
    });

    const response = await GET(request(), { params });

    expect(response.status).toBe(403);
    expect(mocks.loadDeckActivity).not.toHaveBeenCalled();
  });

  test("hides an activity from another talk", async () => {
    mocks.loadDeckActivity.mockResolvedValue(null);

    const response = await GET(request(), { params });

    expect(response.status).toBe(404);
  });

  test("returns a ready activity's payload without caching", async () => {
    mocks.loadDeckActivity.mockResolvedValue({
      type: "poll",
      payload: {
        poll: { id: "activity-1", status: "ready" },
        rows: [],
        total: 0,
      },
    });

    const response = await GET(request(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.loadDeckActivity).toHaveBeenCalledWith(
      "talk-1",
      "activity-1",
      managerAccess,
    );
    expect(await response.json()).toMatchObject({
      poll: { id: "activity-1", status: "ready" },
    });
  });
});

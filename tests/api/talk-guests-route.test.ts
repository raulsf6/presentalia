import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadTalkAccess: vi.fn(),
  loadTalkGuests: vi.fn(),
}));

vi.mock("@/lib/talks/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/talks/membership")>();
  return { ...actual, loadTalkAccess: mocks.loadTalkAccess };
});

vi.mock("@/lib/talks/talk-guests-db", () => ({
  loadTalkGuests: mocks.loadTalkGuests,
}));

import { GET } from "@/app/api/talks/[talkId]/guests/route";

const params = Promise.resolve({ talkId: "talk-1" });

const managerAccess = {
  access: "presenter",
  user: { id: "presenter-1", email: "p@example.com", role: "presenter" },
  talk: { id: "talk-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadTalkAccess.mockResolvedValue(managerAccess);
  mocks.loadTalkGuests.mockResolvedValue([
    {
      id: "guest-1",
      username: "Sam",
      joinedAt: new Date("2026-10-21T10:05:00Z"),
    },
  ]);
});

describe("GET /api/talks/[talkId]/guests", () => {
  test("returns the talk's guests to a manager", async () => {
    const response = await GET(
      new Request("http://localhost/api/talks/talk-1/guests"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      guests: [
        { id: "guest-1", username: "Sam", joinedAtLabel: "Oct 21, 10:05 AM" },
      ],
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  test("hides the list from members and guests", async () => {
    mocks.loadTalkAccess.mockResolvedValue({
      access: "member",
      user: { id: "member-1", email: "m@example.com", role: "attendee" },
      talk: { id: "talk-1" },
    });

    const response = await GET(
      new Request("http://localhost/api/talks/talk-1/guests"),
      { params },
    );

    expect(response.status).toBe(404);
    expect(mocks.loadTalkGuests).not.toHaveBeenCalled();
  });

  test("hides the list without talk access", async () => {
    mocks.loadTalkAccess.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/talks/talk-1/guests"),
      { params },
    );

    expect(response.status).toBe(404);
  });
});

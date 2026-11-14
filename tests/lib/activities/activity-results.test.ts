import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Db } from "@/db";
import type { TalkAccess } from "@/lib/talks/membership";

const mocks = vi.hoisted(() => ({
  loadPollResults: vi.fn(),
  loadQuizResults: vi.fn(),
  loadTextResults: vi.fn(),
  loadCloudResults: vi.fn(),
}));

vi.mock("@/lib/activities/poll-results", () => ({
  loadPollResults: mocks.loadPollResults,
}));
vi.mock("@/lib/activities/quiz-results", () => ({
  loadQuizResults: mocks.loadQuizResults,
}));
vi.mock("@/lib/activities/text-results", () => ({
  loadTextResults: mocks.loadTextResults,
}));
vi.mock("@/lib/activities/cloud-results", () => ({
  loadCloudResults: mocks.loadCloudResults,
}));

import { loadActivityResults } from "@/lib/activities/activity-results";

const db = {} as Db;
const access = {
  access: "member",
  user: { id: "user-1", email: "member@example.com", role: "attendee" },
  talk: { id: "talk-1" },
} as TalkAccess;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadActivityResults", () => {
  test("normalizes a poll and skips the vote guard", async () => {
    const payload = {
      poll: { talkId: "talk-1", status: "active" },
      rows: [],
      total: 0,
      voters: null,
    };
    mocks.loadPollResults.mockResolvedValue(payload);

    const loaded = await loadActivityResults(
      { id: "activity-1", type: "poll" },
      access,
      { db },
    );

    expect(loaded).toEqual({
      type: "poll",
      payload,
      talkId: "talk-1",
      status: "active",
      needsVote: false,
    });
    expect(mocks.loadPollResults).toHaveBeenCalledWith("activity-1", access, {
      db,
    });
  });

  test("forwards projector mode to the quiz and text loaders", async () => {
    mocks.loadQuizResults.mockResolvedValue({
      quiz: { talkId: "talk-1", status: "active" },
      needsVote: true,
    });
    mocks.loadTextResults.mockResolvedValue({
      activity: { talkId: "talk-1", status: "closed" },
      needsVote: false,
    });

    const quiz = await loadActivityResults(
      { id: "quiz-1", type: "quiz" },
      access,
      { db, projector: true },
    );
    const text = await loadActivityResults(
      { id: "text-1", type: "text" },
      access,
      { db, projector: true },
    );

    expect(quiz).toMatchObject({
      type: "quiz",
      talkId: "talk-1",
      status: "active",
      needsVote: true,
    });
    expect(text).toMatchObject({
      type: "text",
      talkId: "talk-1",
      status: "closed",
      needsVote: false,
    });
    expect(mocks.loadQuizResults).toHaveBeenCalledWith("quiz-1", access, {
      db,
      projector: true,
    });
    expect(mocks.loadTextResults).toHaveBeenCalledWith("text-1", access, {
      db,
      projector: true,
    });
  });

  test("normalizes a cloud and forwards its vote guard", async () => {
    const payload = {
      activity: { talkId: "talk-1", status: "active" },
      needsVote: true,
    };
    mocks.loadCloudResults.mockResolvedValue(payload);

    const loaded = await loadActivityResults(
      { id: "cloud-1", type: "cloud" },
      access,
      { db },
    );

    expect(loaded).toEqual({
      type: "cloud",
      payload,
      talkId: "talk-1",
      status: "active",
      needsVote: true,
    });
    expect(mocks.loadCloudResults).toHaveBeenCalledWith("cloud-1", access, {
      db,
    });
  });

  test("returns null for an unknown type or a missing payload", async () => {
    await expect(
      loadActivityResults({ id: "x", type: "unknown" }, access, { db }),
    ).resolves.toBeNull();

    mocks.loadPollResults.mockResolvedValue(null);
    await expect(
      loadActivityResults({ id: "poll-1", type: "poll" }, access, { db }),
    ).resolves.toBeNull();
  });
});

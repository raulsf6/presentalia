import { describe, expect, test } from "vitest";

import { buildPollResultsPayload } from "@/lib/poll-results";

const poll = {
  id: "poll-1",
  talkId: "talk-1",
  question: "Which framework?",
  status: "active" as const,
  resultsIdentifiable: false,
  closedAt: null,
};

const options = [
  { id: "option-a", label: "Framework A" },
  { id: "option-b", label: "Framework B" },
];

describe("buildPollResultsPayload", () => {
  test("does not expose voter identity in anonymous mode", () => {
    const payload = buildPollResultsPayload({
      poll,
      options,
      counts: [
        { optionId: "option-a", votes: 1 },
        { optionId: "option-b", votes: 1 },
      ],
      votes: [{ optionId: "option-a", name: "private@example.com" }],
    });

    expect(payload?.total).toBe(2);
    expect(payload?.voters).toBeNull();
    expect(JSON.stringify(payload)).not.toContain("private@example.com");
  });

  test("includes emails only when the poll is identifiable", () => {
    const payload = buildPollResultsPayload({
      poll: { ...poll, resultsIdentifiable: true },
      options,
      counts: [{ optionId: "option-a", votes: 1 }],
      votes: [{ optionId: "option-a", name: "voter@example.com" }],
    });

    expect(payload?.voters).toEqual([
      { optionId: "option-a", name: "voter@example.com" },
    ]);
  });

  test("returns null when the poll is hidden or does not exist", () => {
    expect(
      buildPollResultsPayload({ poll: null, options: [], counts: [] }),
    ).toBeNull();
  });
});

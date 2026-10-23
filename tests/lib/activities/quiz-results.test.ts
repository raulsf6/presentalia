import { describe, expect, test } from "vitest";

import {
  buildQuizResultsPayload,
  getQuizResultsVisibility,
} from "@/lib/activities/quiz-results";

const quiz = {
  id: "quiz-1",
  talkId: "talk-1",
  question: "Which framework is correct?",
  status: "active" as const,
  resultsIdentifiable: false,
  closedAt: null,
};

const options = [
  { id: "option-a", label: "LangGraph", isCorrect: false },
  { id: "option-b", label: "CrewAI", isCorrect: true },
];

const counts = [
  { optionId: "option-a", votes: 1 },
  { optionId: "option-b", votes: 3 },
];

const votedViewer = {
  isAttendee: true,
  hasVoted: true,
  optionId: "option-a",
};

describe("getQuizResultsVisibility", () => {
  test("requires a member to vote before seeing an active quiz's results", () => {
    expect(
      getQuizResultsVisibility({
        status: "active",
        viewer: { isAttendee: true, hasVoted: false, optionId: null },
        projector: false,
      }),
    ).toEqual({ needsVote: true, showResults: false });
  });

  test("shows live results to a member who has voted", () => {
    expect(
      getQuizResultsVisibility({
        status: "active",
        viewer: votedViewer,
        projector: false,
      }),
    ).toEqual({ needsVote: false, showResults: true });
  });

  test("hides live results from managers and the projector", () => {
    expect(
      getQuizResultsVisibility({
        status: "active",
        viewer: { isAttendee: false, hasVoted: false, optionId: null },
        projector: false,
      }),
    ).toEqual({ needsVote: false, showResults: false });
    expect(
      getQuizResultsVisibility({
        status: "active",
        viewer: votedViewer,
        projector: true,
      }),
    ).toEqual({ needsVote: false, showResults: false });
  });

  test("shows results to everyone once the quiz is closed", () => {
    expect(
      getQuizResultsVisibility({
        status: "closed",
        viewer: { isAttendee: true, hasVoted: false, optionId: null },
        projector: true,
      }),
    ).toEqual({ needsVote: false, showResults: true });
  });
});

describe("buildQuizResultsPayload", () => {
  test("hides percentages and the correct answer from a manager while active", () => {
    const payload = buildQuizResultsPayload({
      quiz,
      options,
      counts,
      viewer: { isAttendee: false, hasVoted: false, optionId: null },
      projector: false,
    });

    expect(payload?.needsVote).toBe(false);
    expect(payload?.showResults).toBe(false);
    expect(payload?.options).toEqual([
      { optionId: "option-a", label: "LangGraph" },
      { optionId: "option-b", label: "CrewAI" },
    ]);
    expect(payload?.rows).toEqual([]);
    expect(payload?.total).toBeNull();
    expect(payload?.quiz.correctOptionId).toBeNull();
    expect(payload?.quiz.correctVotes).toBeNull();
    expect(payload?.viewer).toBeNull();
    expect(payload?.voters).toBeNull();
  });

  test("marks an unvoted member as needing to vote and hides results", () => {
    const payload = buildQuizResultsPayload({
      quiz,
      options,
      counts,
      viewer: { isAttendee: true, hasVoted: false, optionId: null },
      projector: false,
    });

    expect(payload?.needsVote).toBe(true);
    expect(payload?.showResults).toBe(false);
    expect(payload?.rows).toEqual([]);
    expect(payload?.total).toBeNull();
  });

  test("shows percentages to a member who voted without revealing the answer", () => {
    const payload = buildQuizResultsPayload({
      quiz,
      options,
      counts,
      viewer: votedViewer,
      projector: false,
    });

    expect(payload?.needsVote).toBe(false);
    expect(payload?.showResults).toBe(true);
    expect(payload?.total).toBe(4);
    expect(payload?.rows).toEqual([
      { optionId: "option-a", label: "LangGraph", votes: 1, percent: 25 },
      { optionId: "option-b", label: "CrewAI", votes: 3, percent: 75 },
    ]);
    expect(payload?.quiz.correctOptionId).toBeNull();
    expect(payload?.quiz.correctVotes).toBeNull();
    expect(payload?.viewer).toBeNull();
    expect(payload?.rows.every((row) => !("isCorrect" in row))).toBe(true);
  });

  test("hides live percentages from a projector even when the viewer voted", () => {
    const payload = buildQuizResultsPayload({
      quiz,
      options,
      counts,
      viewer: votedViewer,
      projector: true,
    });

    expect(payload?.showResults).toBe(false);
    expect(payload?.rows).toEqual([]);
    expect(payload?.total).toBeNull();
  });

  test("reveals the correct option and group accuracy once closed", () => {
    const payload = buildQuizResultsPayload({
      quiz: { ...quiz, status: "closed", closedAt: new Date("2026-10-20") },
      options,
      counts,
      viewer: votedViewer,
      projector: false,
    });

    expect(payload?.showResults).toBe(true);
    expect(payload?.total).toBe(4);
    expect(payload?.quiz.correctOptionId).toBe("option-b");
    expect(payload?.quiz.correctVotes).toBe(3);
    expect(payload?.viewer).toEqual({ optionId: "option-a", correct: false });
  });

  test("marks a correct viewer pick", () => {
    const payload = buildQuizResultsPayload({
      quiz: { ...quiz, status: "closed" },
      options,
      counts,
      viewer: { isAttendee: true, hasVoted: true, optionId: "option-b" },
      projector: false,
    });

    expect(payload?.viewer).toEqual({ optionId: "option-b", correct: true });
  });

  test("includes voter emails only when results are visible and identifiable", () => {
    const votes = [{ optionId: "option-b", name: "voter@example.com" }];
    const live = buildQuizResultsPayload({
      quiz: { ...quiz, resultsIdentifiable: true },
      options,
      counts,
      votes,
      viewer: votedViewer,
      projector: false,
    });
    const manager = buildQuizResultsPayload({
      quiz: { ...quiz, resultsIdentifiable: true },
      options,
      counts,
      votes,
      viewer: { isAttendee: false, hasVoted: false, optionId: null },
      projector: false,
    });

    expect(live?.voters).toEqual(votes);
    expect(manager?.voters).toBeNull();
  });

  test("drops emails in anonymous mode even when vote rows are supplied", () => {
    const payload = buildQuizResultsPayload({
      quiz,
      options,
      counts,
      votes: [{ optionId: "option-b", name: "private@example.com" }],
      viewer: votedViewer,
      projector: false,
    });

    expect(payload?.voters).toBeNull();
    expect(JSON.stringify(payload)).not.toContain("private@example.com");
  });

  test("returns null when the quiz does not exist", () => {
    expect(
      buildQuizResultsPayload({
        quiz: null,
        options: [],
        counts: [],
        viewer: votedViewer,
        projector: false,
      }),
    ).toBeNull();
  });
});

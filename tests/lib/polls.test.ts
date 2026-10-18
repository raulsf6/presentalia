import { describe, expect, test } from "vitest";

import {
  canClose,
  canLaunch,
  canVote,
  computeResults,
  validatePollInput,
} from "@/lib/polls";

describe("validatePollInput", () => {
  test("accepts a minimal valid poll and defaults results to anonymous", () => {
    expect(
      validatePollInput({
        question: "Best agent framework?",
        options: ["LangGraph", "CrewAI"],
      }),
    ).toEqual({
      ok: true,
      question: "Best agent framework?",
      options: ["LangGraph", "CrewAI"],
      resultsIdentifiable: false,
    });
  });

  test("preserves an explicit identifiable-results choice", () => {
    const result = validatePollInput({
      question: "Q?",
      options: ["A", "B"],
      resultsIdentifiable: true,
    });
    expect(result.ok && result.resultsIdentifiable).toBe(true);
  });

  test("trims the question and option labels", () => {
    const result = validatePollInput({
      question: "  Q?  ",
      options: ["  A  ", " B "],
    });
    expect(result.ok && result.question).toBe("Q?");
    expect(result.ok && result.options).toEqual(["A", "B"]);
  });

  test("rejects a missing question", () => {
    expect(validatePollInput({ question: "", options: ["A", "B"] })).toEqual({
      ok: false,
      error: "A poll needs a question.",
    });
  });

  test("rejects a whitespace-only question", () => {
    expect(validatePollInput({ question: "   ", options: ["A", "B"] })).toEqual(
      {
        ok: false,
        error: "A poll needs a question.",
      },
    );
  });

  test("rejects fewer than two options", () => {
    expect(validatePollInput({ question: "Q?", options: ["A"] })).toEqual({
      ok: false,
      error: "A poll needs at least 2 answer options.",
    });
  });

  test("rejects more than eight options", () => {
    const options = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    expect(validatePollInput({ question: "Q?", options })).toEqual({
      ok: false,
      error: "A poll can have at most 8 answer options.",
    });
  });

  test("rejects whitespace-only option labels", () => {
    expect(
      validatePollInput({ question: "Q?", options: ["A", "   "] }),
    ).toEqual({
      ok: false,
      error: "Answer options cannot be empty.",
    });
  });
});

describe("activity lifecycle guards", () => {
  test("canLaunch is only true for draft", () => {
    expect(canLaunch("draft")).toBe(true);
    expect(canLaunch("active")).toBe(false);
    expect(canLaunch("closed")).toBe(false);
  });

  test("canClose is only true for active", () => {
    expect(canClose("draft")).toBe(false);
    expect(canClose("active")).toBe(true);
    expect(canClose("closed")).toBe(false);
  });

  test("canVote is only true for active", () => {
    expect(canVote("draft")).toBe(false);
    expect(canVote("active")).toBe(true);
    expect(canVote("closed")).toBe(false);
  });
});

describe("computeResults", () => {
  test("preserves option order and computes counts and rounded percentages", () => {
    const result = computeResults(
      [
        { id: "o1", label: "LangGraph" },
        { id: "o2", label: "CrewAI" },
      ],
      { o1: 3, o2: 1 },
    );
    expect(result).toEqual({
      rows: [
        { optionId: "o1", label: "LangGraph", votes: 3, percent: 75 },
        { optionId: "o2", label: "CrewAI", votes: 1, percent: 25 },
      ],
      total: 4,
    });
  });

  test("treats missing counts as zero votes", () => {
    const result = computeResults(
      [
        { id: "o1", label: "A" },
        { id: "o2", label: "B" },
      ],
      { o2: 2 },
    );
    expect(result.rows[0]).toEqual({
      optionId: "o1",
      label: "A",
      votes: 0,
      percent: 0,
    });
    expect(result.rows[1]).toEqual({
      optionId: "o2",
      label: "B",
      votes: 2,
      percent: 100,
    });
    expect(result.total).toBe(2);
  });

  test("returns zero percent for every option when there are no votes", () => {
    const result = computeResults([{ id: "o1", label: "A" }], {});
    expect(result).toEqual({
      rows: [{ optionId: "o1", label: "A", votes: 0, percent: 0 }],
      total: 0,
    });
  });

  test("rounds percentages to whole numbers", () => {
    const result = computeResults(
      [
        { id: "o1", label: "A" },
        { id: "o2", label: "B" },
      ],
      { o1: 3, o2: 4 },
    );
    expect(result.rows[0].percent).toBe(43);
    expect(result.rows[1].percent).toBe(57);
  });
});

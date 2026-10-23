import { describe, expect, test } from "vitest";

import { validateQuizInput } from "@/lib/activities/quizzes";

describe("validateQuizInput", () => {
  test("accepts a minimal valid quiz and defaults results to anonymous", () => {
    expect(
      validateQuizInput({
        question: "Which framework is correct?",
        options: ["LangGraph", "CrewAI"],
        correctIndex: 0,
      }),
    ).toEqual({
      ok: true,
      question: "Which framework is correct?",
      options: ["LangGraph", "CrewAI"],
      correctIndex: 0,
      resultsIdentifiable: false,
    });
  });

  test("preserves an explicit identifiable-results choice", () => {
    const result = validateQuizInput({
      question: "Q?",
      options: ["A", "B"],
      correctIndex: 1,
      resultsIdentifiable: true,
    });
    expect(result.ok && result.resultsIdentifiable).toBe(true);
  });

  test("trims the question and option labels", () => {
    const result = validateQuizInput({
      question: "  Q?  ",
      options: ["  A  ", " B "],
      correctIndex: 1,
    });
    expect(result.ok && result.question).toBe("Q?");
    expect(result.ok && result.options).toEqual(["A", "B"]);
  });

  test("rejects a missing question", () => {
    expect(
      validateQuizInput({ question: "", options: ["A", "B"], correctIndex: 0 }),
    ).toEqual({
      ok: false,
      error: "A quiz needs a question.",
    });
  });

  test("rejects a whitespace-only question", () => {
    expect(
      validateQuizInput({
        question: "   ",
        options: ["A", "B"],
        correctIndex: 0,
      }),
    ).toEqual({
      ok: false,
      error: "A quiz needs a question.",
    });
  });

  test("rejects fewer than two options", () => {
    expect(
      validateQuizInput({ question: "Q?", options: ["A"], correctIndex: 0 }),
    ).toEqual({
      ok: false,
      error: "A quiz needs at least 2 answer options.",
    });
  });

  test("rejects more than eight options", () => {
    const options = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    expect(
      validateQuizInput({ question: "Q?", options, correctIndex: 0 }),
    ).toEqual({
      ok: false,
      error: "A quiz can have at most 8 answer options.",
    });
  });

  test("rejects whitespace-only option labels", () => {
    expect(
      validateQuizInput({
        question: "Q?",
        options: ["A", "   "],
        correctIndex: 0,
      }),
    ).toEqual({
      ok: false,
      error: "Answer options cannot be empty.",
    });
  });

  test("rejects duplicate labels regardless of case", () => {
    expect(
      validateQuizInput({
        question: "Q?",
        options: ["CrewAI", "crewai"],
        correctIndex: 0,
      }),
    ).toEqual({
      ok: false,
      error: "Answer options must be unique.",
    });
  });

  test("rejects a missing correct answer", () => {
    expect(
      validateQuizInput({
        question: "Q?",
        options: ["A", "B"],
        correctIndex: Number.NaN,
      }),
    ).toEqual({
      ok: false,
      error: "Choose the correct answer.",
    });
  });

  test("rejects a correct answer outside the options", () => {
    expect(
      validateQuizInput({
        question: "Q?",
        options: ["A", "B"],
        correctIndex: 2,
      }),
    ).toEqual({
      ok: false,
      error: "Choose the correct answer.",
    });
  });

  test("accepts a correct answer at the last option", () => {
    const result = validateQuizInput({
      question: "Q?",
      options: ["A", "B", "C"],
      correctIndex: 2,
    });
    expect(result.ok && result.correctIndex).toBe(2);
  });
});

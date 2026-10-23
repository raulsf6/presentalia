import { describe, expect, test } from "vitest";

import {
  ANSWER_MAX_LENGTH,
  CRITERIA_MAX_LENGTH,
  PROMPT_MAX_LENGTH,
  REMOVED_ANSWER_BODY,
  isRemovedAnswer,
  validateTextActivityInput,
  validateTextAnswer,
} from "@/lib/activities/text-activity";

describe("validateTextActivityInput", () => {
  test("trims the prompt and criterion", () => {
    const result = validateTextActivityInput({
      prompt: "  What should we ship next?  ",
      criteria: "  Most actionable  ",
    });

    expect(result).toEqual({
      ok: true,
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      resultsIdentifiable: false,
    });
  });

  test("requires a prompt", () => {
    expect(
      validateTextActivityInput({ prompt: "   ", criteria: "Most useful" }),
    ).toEqual({ ok: false, error: "A text prompt needs a question." });
  });

  test("caps the prompt length", () => {
    const result = validateTextActivityInput({
      prompt: "x".repeat(PROMPT_MAX_LENGTH + 1),
      criteria: "Most useful",
    });

    expect(result).toEqual({ ok: false, error: "A text prompt needs a question." });
  });

  test("requires a criterion", () => {
    expect(
      validateTextActivityInput({ prompt: "Ship what?", criteria: "  " }),
    ).toEqual({
      ok: false,
      error: "Add a criterion for ranking the answers.",
    });
  });

  test("caps the criterion length", () => {
    const result = validateTextActivityInput({
      prompt: "Ship what?",
      criteria: "x".repeat(CRITERIA_MAX_LENGTH + 1),
    });

    expect(result).toEqual({
      ok: false,
      error: "Add a criterion for ranking the answers.",
    });
  });

  test("carries the identifiable flag", () => {
    const result = validateTextActivityInput({
      prompt: "Ship what?",
      criteria: "Most useful",
      resultsIdentifiable: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultsIdentifiable).toBe(true);
    }
  });
});

describe("validateTextAnswer", () => {
  test("trims an answer", () => {
    expect(validateTextAnswer("  Ship the small thing.  ")).toEqual({
      ok: true,
      body: "Ship the small thing.",
    });
  });

  test("rejects an empty answer", () => {
    expect(validateTextAnswer("   ")).toEqual({
      ok: false,
      error: "Write an answer first.",
    });
  });

  test("caps the answer length", () => {
    expect(validateTextAnswer("x".repeat(ANSWER_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: `Answers can be at most ${ANSWER_MAX_LENGTH} characters.`,
    });
  });
});

describe("isRemovedAnswer", () => {
  test("recognises the GDPR removal notice", () => {
    expect(isRemovedAnswer(REMOVED_ANSWER_BODY)).toBe(true);
    expect(isRemovedAnswer("A real answer")).toBe(false);
  });
});

import { describe, expect, test, vi } from "vitest";

import {
  RankingError,
  buildRankingPrompt,
  orderRanking,
  rankTextAnswers,
  validateRankingOutput,
  type RankingAnswer,
} from "@/lib/text-ranking";

const answers: RankingAnswer[] = [
  {
    id: "a",
    text: "Ship the smallest useful thing.",
    createdAt: new Date("2026-01-01T10:00:00Z"),
  },
  {
    id: "b",
    text: "Talk to five users first.",
    createdAt: new Date("2026-01-02T10:00:00Z"),
  },
  {
    id: "c",
    text: "Rewrite the roadmap.",
    createdAt: new Date("2026-01-03T10:00:00Z"),
  },
];

function validOutput() {
  return {
    ranked: [
      { id: "a", score: 90, rationale: "Concrete and small." },
      { id: "b", score: 90 },
      { id: "c", score: 60 },
    ],
    dropped: [],
    summary: "The first two are the most actionable.",
  };
}

describe("buildRankingPrompt", () => {
  test("includes the criterion and every answer id", () => {
    const prompt = buildRankingPrompt({
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      answers,
    });

    expect(prompt.system).toMatch(/untrusted/i);
    expect(prompt.system).toMatch(/never follow/i);
    expect(prompt.user).toContain("Most actionable");
    for (const answer of answers) {
      expect(prompt.user).toContain(answer.id);
      expect(prompt.user).toContain(answer.text);
    }
  });
});

describe("validateRankingOutput", () => {
  test("accepts a complete ordered ranking", () => {
    const result = validateRankingOutput(validOutput(), answers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranked).toEqual([
        { answerId: "a", score: 90, rationale: "Concrete and small." },
        { answerId: "b", score: 90, rationale: null },
        { answerId: "c", score: 60, rationale: null },
      ]);
      expect(result.dropped).toEqual([]);
      expect(result.summary).toBe("The first two are the most actionable.");
    }
  });

  test("accepts a run where every answer was dropped", () => {
    const result = validateRankingOutput(
      {
        ranked: [],
        dropped: [
          { id: "a", reason: "Spam" },
          { id: "b", reason: "Not an answer" },
          { id: "c", reason: "Abuse" },
        ],
        summary: "No usable answers.",
      },
      answers,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranked).toEqual([]);
      expect(result.dropped).toHaveLength(3);
    }
  });

  test("rejects an unknown id", () => {
    const result = validateRankingOutput(
      { ...validOutput(), ranked: [{ id: "nope", score: 90 }] },
      answers,
    );

    expect(result).toEqual({
      ok: false,
      error: "Ranking referenced an unknown answer.",
    });
  });

  test("rejects duplicate ids", () => {
    const result = validateRankingOutput(
      {
        ...validOutput(),
        dropped: [{ id: "a", reason: "Duplicate" }],
      },
      answers,
    );

    expect(result).toEqual({
      ok: false,
      error: "Ranking listed an answer more than once.",
    });
  });

  test("rejects a missing answer", () => {
    const result = validateRankingOutput(
      {
        ...validOutput(),
        ranked: validOutput().ranked.slice(0, 2),
      },
      answers,
    );

    expect(result).toEqual({
      ok: false,
      error: "Ranking did not account for every answer.",
    });
  });

  test("rejects an out-of-range score", () => {
    const result = validateRankingOutput(
      {
        ...validOutput(),
        ranked: [{ id: "a", score: 101 }, { id: "b", score: 90 }, { id: "c", score: 60 }],
      },
      answers,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid/i);
    }
  });

  test("rejects an over-long summary", () => {
    const result = validateRankingOutput(
      { ...validOutput(), summary: "x".repeat(301) },
      answers,
    );

    expect(result.ok).toBe(false);
  });
});

describe("orderRanking", () => {
  test("sorts by score with a deterministic tie-break and assigns ranks", () => {
    const ordered = orderRanking(
      [
        { answerId: "c", score: 60, rationale: null },
        { answerId: "b", score: 90, rationale: null },
        { answerId: "a", score: 90, rationale: "Best" },
      ],
      answers,
    );

    expect(ordered).toEqual([
      { answerId: "a", rank: 1, score: 90, rationale: "Best" },
      { answerId: "b", rank: 2, score: 90, rationale: null },
      { answerId: "c", rank: 3, score: 60, rationale: null },
    ]);
  });
});

describe("rankTextAnswers", () => {
  test("returns the validated ranking from one call", async () => {
    const generate = vi.fn().mockResolvedValue({ output: validOutput() });
    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.ranked.map((row) => row.answerId)).toEqual(["a", "b", "c"]);
    expect(result.dropped).toEqual([]);
  });

  test("retries once with the validation error and succeeds", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ output: { ranked: [], dropped: [], summary: "" } })
      .mockResolvedValueOnce({ output: validOutput() });
    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].user).toMatch(/previous output was invalid/i);
    expect(result.ranked).toHaveLength(3);
  });

  test("fails after two invalid outputs", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ output: { ranked: [], dropped: [], summary: "" } });

    await expect(
      rankTextAnswers(
        { prompt: "What next?", criteria: "Most actionable", answers },
        generate,
      ),
    ).rejects.toBeInstanceOf(RankingError);
  });
});

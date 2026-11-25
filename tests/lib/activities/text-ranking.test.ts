import { NoObjectGeneratedError } from "ai";
import { describe, expect, test, vi } from "vitest";

import {
  RankingError,
  buildRankingPrompt,
  orderRanking,
  rankingOutputSchema,
  rankTextAnswers,
  validateRankingOutput,
  type RankingAnswer,
} from "@/lib/activities/text-ranking";

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
    expect(prompt.system).toMatch(/reason of at most 120 characters/i);
    expect(prompt.system).toMatch(/rationale to null/i);
    expect(prompt.system).toMatch(/"ranked"/);
    expect(prompt.user).toContain("Most actionable");
    for (const answer of answers) {
      expect(prompt.user).toContain(answer.id);
      expect(prompt.user).toContain(answer.text);
    }
  });

  test("writes the model's output in the request language", () => {
    const defaults = buildRankingPrompt({
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      answers,
    });
    const spanish = buildRankingPrompt({
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      answers,
      locale: "es",
    });

    expect(defaults.system).toContain("in English");
    expect(spanish.system).toContain("in Spanish");
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

  test("rejects a missing answer and names it", () => {
    const result = validateRankingOutput(
      {
        ...validOutput(),
        ranked: validOutput().ranked.slice(0, 2),
      },
      answers,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/^Ranking did not account for every answer/);
      expect(result.error).toContain("omitted 1 answer (c)");
    }
  });

  test("rounds and clamps scores instead of failing the run", () => {
    const result = validateRankingOutput(
      {
        dropped: [],
        summary: "ok",
        ranked: [
          { id: "a", score: 101 },
          { id: "b", score: 87.4 },
          { id: "c", score: -3 },
        ],
      },
      answers,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranked.map((row) => row.score)).toEqual([100, 87, 0]);
    }
  });

  test("truncates over-long rationale, reasons, and summaries", () => {
    const result = validateRankingOutput(
      {
        ranked: [
          { id: "a", score: 90, rationale: "y".repeat(275) },
          { id: "b", score: 80, rationale: null },
        ],
        dropped: [{ id: "c", reason: "z".repeat(130) }],
        summary: "s".repeat(350),
      },
      answers,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranked[0]?.rationale).toHaveLength(200);
      expect(result.dropped[0]?.reason).toHaveLength(120);
      expect(result.summary).toHaveLength(300);
    }
  });

  test("falls back to a null rationale when the model sends unusable content", () => {
    const result = validateRankingOutput(
      {
        ranked: [
          { id: "a", score: 90, rationale: 123 },
          { id: "b", score: 80 },
          { id: "c", score: 60 },
        ],
        dropped: [],
        summary: "ok",
      },
      answers,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranked[0]?.rationale).toBeNull();
    }
  });

  test("tolerates missing arrays when every answer is accounted for", () => {
    const result = validateRankingOutput(
      {
        ranked: [
          { id: "a", score: 90 },
          { id: "b", score: 80 },
          { id: "c", score: 60 },
        ],
        summary: "ok",
      },
      answers,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dropped).toEqual([]);
    }
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
      .mockResolvedValueOnce({
        output: { ranked: [], dropped: [], summary: "" },
      })
      .mockResolvedValueOnce({ output: validOutput() });
    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].user).toMatch(
      /previous output was invalid/i,
    );
    expect(result.ranked).toHaveLength(3);
  });

  test("retries when the SDK rejects output that violates the schema", async () => {
    const schemaError = new NoObjectGeneratedError({
      message: "Generated object failed schema validation.",
      text: JSON.stringify({ summary: "x".repeat(301) }),
      response: {} as never,
      usage: {} as never,
      finishReason: "stop",
    });
    const generate = vi
      .fn()
      .mockRejectedValueOnce(schemaError)
      .mockResolvedValueOnce({ output: validOutput() });

    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].user).toMatch(
      /previous output was invalid/i,
    );
    expect(generate.mock.calls[1][0].user).not.toContain(
      "Generated object failed",
    );
    expect(generate.mock.calls[1][0].user).not.toContain("x".repeat(301));
    expect(result.ranked).toHaveLength(3);
  });

  test("feeds the failing field back when the SDK reports a schema violation", async () => {
    const parsed = rankingOutputSchema.safeParse({
      ranked: [{ id: "a", score: "87" }],
    });
    const schemaError = new NoObjectGeneratedError({
      message: "No object generated: response did not match schema.",
      text: JSON.stringify({ ranked: [{ id: "a", score: "87" }] }),
      response: {} as never,
      usage: {} as never,
      finishReason: "stop",
      cause: parsed.error,
    });
    const generate = vi
      .fn()
      .mockRejectedValueOnce(schemaError)
      .mockResolvedValueOnce({ output: validOutput() });

    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(result.ranked).toHaveLength(3);
    expect(generate.mock.calls[1][0].user).toMatch(/ranked\.0\.score/i);
  });

  test("names the token limit when the model output was cut off", async () => {
    const generate = vi.fn().mockRejectedValue(
      new NoObjectGeneratedError({
        message: "No object generated: could not parse the response.",
        text: "{",
        response: {} as never,
        usage: {} as never,
        finishReason: "length",
      }),
    );

    await expect(
      rankTextAnswers(
        { prompt: "What next?", criteria: "Most actionable", answers },
        generate,
      ),
    ).rejects.toThrow(/cut off at the output token limit/);
  });

  test("names the omitted answers in the retry prompt", async () => {
    const partial = {
      ...validOutput(),
      ranked: validOutput().ranked.slice(0, 2),
    };
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ output: partial })
      .mockResolvedValueOnce({ output: validOutput() });

    const result = await rankTextAnswers(
      { prompt: "What next?", criteria: "Most actionable", answers },
      generate,
    );

    expect(result.ranked).toHaveLength(3);
    expect(generate.mock.calls[1][0].user).toMatch(/omitted 1 answer \(c\)/);
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

import { describe, expect, test } from "vitest";

import {
  buildTextResultsPayload,
  type TextResultsSource,
} from "@/lib/text-results";

const at = (day: number) => new Date(`2026-01-0${day}T10:00:00Z`);

function source(overrides: Partial<TextResultsSource> = {}): TextResultsSource {
  return {
    activity: {
      id: "activity-1",
      talkId: "talk-1",
      prompt: "What should we ship next?",
      criteria: "Most actionable",
      status: "active",
      resultsIdentifiable: false,
      closedAt: null,
    },
    answers: [
      { id: "a", body: "Ship the small thing.", email: "a@example.com", createdAt: at(1) },
      { id: "b", body: "Talk to users first.", email: "b@example.com", createdAt: at(2) },
      { id: "c", body: "Rewrite the roadmap.", email: "c@example.com", createdAt: at(3) },
    ],
    run: null,
    rankings: [],
    viewer: { isMember: true, hasAnswered: false },
    projector: false,
    ...overrides,
  };
}

const rankedRun = {
  status: "succeeded" as const,
  error: null,
  model: "openai/test",
  startedAt: at(4),
  finishedAt: at(4),
  summary: "The first two are the most actionable.",
};

describe("buildTextResultsPayload", () => {
  test("an active activity hides every answer and asks a member to answer", () => {
    const payload = buildTextResultsPayload(source());

    expect(payload.mode).toBe("waiting");
    expect(payload.needsVote).toBe(true);
    expect(payload.rows).toEqual([]);
    expect(payload.dropped).toBeNull();
    expect(payload.run).toBeNull();
    expect(payload.activity.totalAnswers).toBe(3);
  });

  test("a member who answered is not asked again", () => {
    const payload = buildTextResultsPayload(
      source({ viewer: { isMember: true, hasAnswered: true } }),
    );

    expect(payload.needsVote).toBe(false);
  });

  test("a locked activity shows the manager every answer, unranked", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "locked" },
        viewer: { isMember: false, hasAnswered: false },
        run: {
          status: "running",
          error: null,
          model: "openai/test",
          startedAt: at(4),
          finishedAt: null,
          summary: null,
        },
      }),
    );

    expect(payload.mode).toBe("ranking");
    expect(payload.rows.map((row) => row.answerId)).toEqual(["a", "b", "c"]);
    expect(payload.rows.every((row) => row.rank === null)).toBe(true);
    expect(payload.run?.status).toBe("running");
    expect(payload.dropped).toBeNull();
  });

  test("a locked activity shows attendees the waiting state", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "locked" },
        run: {
          status: "running",
          error: null,
          model: "openai/test",
          startedAt: at(4),
          finishedAt: null,
          summary: null,
        },
      }),
    );

    expect(payload.mode).toBe("ranking");
    expect(payload.rows).toEqual([]);
    expect(payload.run).toBeNull();
    expect(payload.dropped).toBeNull();
  });

  test("a projector never sees answers before the activity is closed", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "locked" },
        viewer: { isMember: false, hasAnswered: false },
        projector: true,
      }),
    );

    expect(payload.rows).toEqual([]);
    expect(payload.dropped).toBeNull();
    expect(payload.run).toBeNull();
  });

  test("a closed activity publishes the ranked order, hiding dropped answers from the room", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "closed", closedAt: at(5) },
        run: rankedRun,
        rankings: [
          { answerId: "a", rank: 1, rationale: "Small and concrete.", dropReason: null },
          { answerId: "b", rank: 2, rationale: null, dropReason: null },
          { answerId: "c", rank: null, rationale: null, dropReason: "Off-topic" },
        ],
      }),
    );

    expect(payload.mode).toBe("ranked");
    expect(payload.rows).toEqual([
      {
        answerId: "a",
        rank: 1,
        body: "Ship the small thing.",
        rationale: "Small and concrete.",
        email: null,
      },
      {
        answerId: "b",
        rank: 2,
        body: "Talk to users first.",
        rationale: null,
        email: null,
      },
    ]);
    expect(payload.dropped).toBeNull();
    expect(payload.droppedCount).toBe(1);
    expect(payload.summary).toBe("The first two are the most actionable.");
  });

  test("a manager sees dropped answers with reasons", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "closed", closedAt: at(5) },
        viewer: { isMember: false, hasAnswered: false },
        run: rankedRun,
        rankings: [
          { answerId: "a", rank: 1, rationale: null, dropReason: null },
          { answerId: "b", rank: 2, rationale: null, dropReason: null },
          { answerId: "c", rank: null, rationale: null, dropReason: "Off-topic" },
        ],
      }),
    );

    expect(payload.dropped).toEqual([
      { answerId: "c", body: "Rewrite the roadmap.", reason: "Off-topic" },
    ]);
  });

  test("identifiable results expose emails to people, never to the projector", () => {
    const base = source({
      activity: {
        ...source().activity,
        status: "closed",
        resultsIdentifiable: true,
        closedAt: at(5),
      },
      run: rankedRun,
      rankings: [
        { answerId: "a", rank: 1, rationale: null, dropReason: null },
        { answerId: "b", rank: 2, rationale: null, dropReason: null },
        { answerId: "c", rank: null, rationale: null, dropReason: "Off-topic" },
      ],
    });

    const attendee = buildTextResultsPayload(base);
    const projector = buildTextResultsPayload({ ...base, projector: true });

    expect(attendee.rows[0]?.email).toBe("a@example.com");
    expect(projector.rows[0]?.email).toBeNull();
  });

  test("closing without a ranking publishes every answer in submission order", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: { ...source().activity, status: "closed", closedAt: at(5) },
      }),
    );

    expect(payload.mode).toBe("unranked");
    expect(payload.rows.map((row) => row.answerId)).toEqual(["a", "b", "c"]);
    expect(payload.rows.every((row) => row.rank === null)).toBe(true);
    expect(payload.summary).toBeNull();
    expect(payload.droppedCount).toBe(0);
  });

  test("a GDPR tombstone keeps its slot without an email", () => {
    const payload = buildTextResultsPayload(
      source({
        activity: {
          ...source().activity,
          status: "closed",
          resultsIdentifiable: true,
          closedAt: at(5),
        },
        answers: [
          {
            id: "a",
            body: "[answer removed]",
            email: null,
            createdAt: at(1),
          },
        ],
      }),
    );

    expect(payload.rows).toEqual([
      {
        answerId: "a",
        rank: null,
        body: "[answer removed]",
        rationale: null,
        email: null,
      },
    ]);
  });
});

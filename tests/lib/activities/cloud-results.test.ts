import { describe, expect, test } from "vitest";

import {
  buildCloudResultsPayload,
  type CloudResultsSource,
} from "@/lib/activities/cloud-results";
import type { CloudIdeaEntry } from "@/lib/activities/cloud-activity";

const at = (day: number) => new Date(`2026-01-0${day}T10:00:00Z`);

function entry(id: string, body: string, day: number): CloudIdeaEntry {
  return { id, body, createdAt: at(day) };
}

function source(
  overrides: Partial<CloudResultsSource> = {},
): CloudResultsSource {
  return {
    activity: {
      id: "activity-1",
      talkId: "talk-1",
      prompt: "What should we improve next?",
      status: "active",
      closedAt: null,
    },
    entries: [
      entry("a", "Better onboarding", 1),
      entry("b", "better onboarding", 2),
      entry("c", "faster responses", 3),
    ],
    viewer: { isAttendee: true, hasAnswered: false },
    ...overrides,
  };
}

describe("buildCloudResultsPayload", () => {
  test("an active activity hides the cloud from attendees who have not answered", () => {
    const payload = buildCloudResultsPayload(source());

    expect(payload.mode).toBe("waiting");
    expect(payload.needsVote).toBe(true);
    expect(payload.items).toEqual([]);
    expect(payload.activity.totalIdeas).toBe(3);
    expect(payload.activity.uniqueIdeas).toBe(2);
  });

  test("an attendee who answered still waits for the close", () => {
    const payload = buildCloudResultsPayload(
      source({ viewer: { isAttendee: true, hasAnswered: true } }),
    );

    expect(payload.mode).toBe("waiting");
    expect(payload.needsVote).toBe(false);
    expect(payload.items).toEqual([]);
  });

  test("a manager sees the live cloud with counts", () => {
    const payload = buildCloudResultsPayload(
      source({ viewer: { isAttendee: false, hasAnswered: false } }),
    );

    expect(payload.mode).toBe("live");
    expect(payload.needsVote).toBe(false);
    expect(payload.items).toEqual([
      { key: "better onboarding", label: "Better onboarding", count: 2 },
      { key: "faster responses", label: "faster responses", count: 1 },
    ]);
  });

  test("a closed activity shows the final cloud to attendees", () => {
    const payload = buildCloudResultsPayload(
      source({
        activity: {
          ...source().activity,
          status: "closed",
          closedAt: at(4),
        },
      }),
    );

    expect(payload.mode).toBe("final");
    expect(payload.needsVote).toBe(false);
    expect(payload.items).toHaveLength(2);
    expect(payload.activity.closedAt).toBe(at(4).toISOString());
  });

  test("caps the displayed cloud and reports the hidden count", () => {
    const entries = Array.from({ length: 125 }, (_, index) =>
      entry(`idea-${index}`, `idea ${index}`, 1),
    );
    const payload = buildCloudResultsPayload(
      source({
        entries,
        viewer: { isAttendee: false, hasAnswered: false },
      }),
    );

    expect(payload.items).toHaveLength(120);
    expect(payload.activity.uniqueIdeas).toBe(125);
    expect(payload.hiddenIdeas).toBe(5);
  });
});

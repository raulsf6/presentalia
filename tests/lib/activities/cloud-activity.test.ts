import { describe, expect, test } from "vitest";

import {
  buildCloudItems,
  cloudIdeaKey,
  CLOUD_IDEA_MAX_LENGTH,
  displayCloudIdea,
  validateCloudActivityInput,
  validateCloudIdea,
  type CloudIdeaEntry,
} from "@/lib/activities/cloud-activity";

const at = (day: number) => new Date(`2026-01-0${day}T10:00:00Z`);

function entry(id: string, body: string, day: number): CloudIdeaEntry {
  return { id, body, createdAt: at(day) };
}

describe("validateCloudActivityInput", () => {
  test("trims the question", () => {
    expect(validateCloudActivityInput({ prompt: "  What next?  " })).toEqual({
      ok: true,
      prompt: "What next?",
    });
  });

  test("requires a question", () => {
    expect(validateCloudActivityInput({ prompt: "   " }).ok).toBe(false);
    expect(validateCloudActivityInput({ prompt: "x".repeat(501) }).ok).toBe(
      false,
    );
  });
});

describe("validateCloudIdea", () => {
  test("normalizes whitespace and edge punctuation", () => {
    expect(validateCloudIdea('  "Better   onboarding!"  ')).toEqual({
      ok: true,
      body: "Better onboarding",
    });
  });

  test("rejects empty or punctuation-only ideas", () => {
    expect(validateCloudIdea("   ").ok).toBe(false);
    expect(validateCloudIdea("!!!").ok).toBe(false);
  });

  test("enforces the character and word limits", () => {
    expect(validateCloudIdea("a".repeat(CLOUD_IDEA_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
    expect(validateCloudIdea("one two three four five").ok).toBe(true);
    expect(validateCloudIdea("one two three four five six").ok).toBe(false);
  });
});

describe("cloud idea normalization", () => {
  test("keeps meaningful symbols inside a phrase", () => {
    expect(displayCloudIdea("  C++  ")).toBe("C++");
    expect(displayCloudIdea("AI/ML")).toBe("AI/ML");
    expect(displayCloudIdea("C#")).toBe("C#");
    expect(displayCloudIdea("#AI")).toBe("#AI");
  });

  test("the grouping key ignores case, spacing, and edge punctuation", () => {
    expect(cloudIdeaKey(" Better   Onboarding! ")).toBe("better onboarding");
    expect(cloudIdeaKey("better onboarding")).toBe("better onboarding");
  });
});

describe("buildCloudItems", () => {
  test("counts identical ideas and keeps the first label", () => {
    const items = buildCloudItems([
      entry("a", "better onboarding", 1),
      entry("b", "Better Onboarding!", 2),
      entry("c", "faster responses", 3),
      entry("d", "voice", 4),
    ]);

    expect(items).toEqual([
      { key: "better onboarding", label: "better onboarding", count: 2 },
      { key: "faster responses", label: "faster responses", count: 1 },
      { key: "voice", label: "voice", count: 1 },
    ]);
  });

  test("orders by count, then first arrival", () => {
    const items = buildCloudItems([
      entry("a", "one", 1),
      entry("b", "two", 2),
      entry("c", "two", 3),
      entry("d", "three", 4),
      entry("e", "one", 5),
    ]);

    expect(items.map((item) => [item.label, item.count])).toEqual([
      ["one", 2],
      ["two", 2],
      ["three", 1],
    ]);
  });

  test("drops blank ideas from the cloud", () => {
    expect(
      buildCloudItems([entry("a", "   ", 1), entry("b", "!!!", 2)]),
    ).toEqual([]);
  });
});

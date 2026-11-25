import { describe, expect, test } from "vitest";

import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import { createTranslator, formatDate } from "@/lib/i18n/translate";

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("translator", () => {
  test("returns the selected dictionary", () => {
    expect(createTranslator("en")("nav.talks")).toBe("Talks");
    expect(createTranslator("es")("nav.talks")).toBe("Charlas");
  });

  test("interpolates named parameters", () => {
    expect(createTranslator("en")("talk.joinedAs", { name: "Sam" })).toBe(
      "Joined as Sam",
    );
    expect(createTranslator("es")("talk.joinedAs", { name: "Sam" })).toBe(
      "Te has unido como Sam",
    );
  });

  test("leaves unknown placeholders untouched", () => {
    expect(createTranslator("en")("talk.joinedAs")).toBe("Joined as {name}");
  });

  test("formats dates with Intl", () => {
    const date = new Date("2026-11-14T12:00:00Z");
    expect(
      formatDate("es", date, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    ).toContain("2026");
  });
});

describe("dictionaries", () => {
  test("cover exactly the same keys", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  test("have no empty translations", () => {
    for (const [key, value] of Object.entries({ ...en, ...es })) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  test("keep the same interpolation placeholders", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  test("every singular plural key has an other key", () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith(".one")) {
        const other = `${key.slice(0, -".one".length)}.other`;
        expect(other in en, `${key} needs ${other}`).toBe(true);
        expect(other in es, `${key} needs ${other}`).toBe(true);
      }
    }
  });
});

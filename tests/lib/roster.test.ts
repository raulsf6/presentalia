import { describe, expect, test } from "vitest";

import {
  mergeRoster,
  normalizeEmail,
  parseCsv,
  parseEmailList,
  validateEmail,
} from "@/lib/roster";

describe("validateEmail", () => {
  test("accepts a plain valid address", () => {
    expect(validateEmail("attendee@example.com")).toBe(true);
  });

  test("accepts an address padded with whitespace", () => {
    expect(validateEmail("  attendee@example.com  ")).toBe(true);
  });

  test("rejects an address without a dot in the domain", () => {
    expect(validateEmail("attendee@example")).toBe(false);
  });

  test("rejects an address without an @", () => {
    expect(validateEmail("attendee.example.com")).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  test("rejects an address containing spaces", () => {
    expect(validateEmail("bad address@example.com")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeEmail("  Foo.Bar@Example.COM ")).toBe(
      "foo.bar@example.com",
    );
  });
});

describe("parseEmailList", () => {
  test("parses a single address", () => {
    expect(parseEmailList("attendee@example.com")).toEqual({
      valid: ["attendee@example.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("parses mixed separators (newline, comma, semicolon)", () => {
    const input = "A@B.com, c@d.com; e@f.com\ng@h.com";
    expect(parseEmailList(input)).toEqual({
      valid: ["a@b.com", "c@d.com", "e@f.com", "g@h.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("normalizes case and whitespace in valid addresses", () => {
    expect(parseEmailList("  A@B.com ")).toEqual({
      valid: ["a@b.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("collects invalid tokens with their raw text", () => {
    const result = parseEmailList("a@b.com, not-an-email, c@d.com");
    expect(result.valid).toEqual(["a@b.com", "c@d.com"]);
    expect(result.invalid).toEqual(["not-an-email"]);
    expect(result.duplicates).toEqual([]);
  });

  test("reports duplicates within the input once, normalized", () => {
    const result = parseEmailList("a@b.com, A@B.com, a@b.com");
    expect(result.valid).toEqual(["a@b.com"]);
    expect(result.duplicates).toEqual(["a@b.com"]);
  });

  test("returns empty lists for empty or whitespace-only input", () => {
    expect(parseEmailList("")).toEqual({
      valid: [],
      invalid: [],
      duplicates: [],
    });
    expect(parseEmailList("   \n  ")).toEqual({
      valid: [],
      invalid: [],
      duplicates: [],
    });
  });
});

describe("parseCsv", () => {
  test("uses the Email column when the header names it", () => {
    const csv = [
      "Name,Email,Company",
      "Alice,a@b.com,Acme",
      "Bob,c@d.com,Beta",
    ].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["a@b.com", "c@d.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("matches the header cell case-insensitively, including quoted cells", () => {
    const csv = ['"Name","EMAIL"', '"Alice","A@B.com"'].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["a@b.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("keeps the email column aligned when another CSV field contains a comma", () => {
    const csv = [
      "Name,Email,Company",
      '"Doe, Jane",jane@example.com,Acme',
    ].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["jane@example.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("handles escaped quotes inside quoted CSV fields", () => {
    const csv = ["Name,Email", '"Doe, ""Jane""",jane@example.com'].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["jane@example.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("treats the first column as data when there is no header", () => {
    const csv = ["a@b.com,extra", "c@d.com,extra"].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["a@b.com", "c@d.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("reports invalid rows with the offending cell text", () => {
    const csv = ["Email", "a@b.com", "not-an-email"].join("\n");
    const result = parseCsv(csv);
    expect(result.valid).toEqual(["a@b.com"]);
    expect(result.invalid).toEqual(["not-an-email"]);
  });

  test("skips blank lines and blank cells", () => {
    const csv = ["a@b.com", "", "   ", "c@d.com"].join("\n");
    expect(parseCsv(csv)).toEqual({
      valid: ["a@b.com", "c@d.com"],
      invalid: [],
      duplicates: [],
    });
  });

  test("reports duplicates across rows, normalized", () => {
    const csv = ["Email", "a@b.com", "A@B.com"].join("\n");
    const result = parseCsv(csv);
    expect(result.valid).toEqual(["a@b.com"]);
    expect(result.duplicates).toEqual(["a@b.com"]);
  });
});

describe("mergeRoster", () => {
  test("separates new addresses from already-present ones", () => {
    expect(mergeRoster(["a@b.com"], ["a@b.com", "c@d.com"])).toEqual({
      toAdd: ["c@d.com"],
      alreadyPresent: ["a@b.com"],
    });
  });

  test("returns everything to add when the roster is empty", () => {
    expect(mergeRoster([], ["a@b.com", "c@d.com"])).toEqual({
      toAdd: ["a@b.com", "c@d.com"],
      alreadyPresent: [],
    });
  });

  test("returns nothing to add when everything is present", () => {
    expect(mergeRoster(["a@b.com", "c@d.com"], ["a@b.com"])).toEqual({
      toAdd: [],
      alreadyPresent: ["a@b.com"],
    });
  });
});

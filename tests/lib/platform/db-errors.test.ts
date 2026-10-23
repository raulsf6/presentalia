import { describe, expect, test } from "vitest";

import { isUniqueViolation } from "@/lib/platform/db-errors";

describe("Postgres error classification", () => {
  test("recognizes duplicate-key errors", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("duplicate key"))).toBe(false);
  });

  test("recognizes duplicate-key errors wrapped by an ORM cause", () => {
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });
});

import { describe, expect, test } from "vitest";

import { withLibpqSslCompat } from "@/db";

describe("withLibpqSslCompat", () => {
  test("appends the compatibility flag when there is no query string", () => {
    expect(withLibpqSslCompat("postgresql://host:6543/postgres")).toBe(
      "postgresql://host:6543/postgres?uselibpqcompat=true",
    );
  });

  test("appends with an ampersand when parameters already exist", () => {
    expect(
      withLibpqSslCompat("postgresql://host:6543/postgres?sslmode=require"),
    ).toBe(
      "postgresql://host:6543/postgres?sslmode=require&uselibpqcompat=true",
    );
  });

  test("leaves an explicit setting untouched", () => {
    const url =
      "postgresql://host:6543/postgres?sslmode=require&uselibpqcompat=false";
    expect(withLibpqSslCompat(url)).toBe(url);
  });
});

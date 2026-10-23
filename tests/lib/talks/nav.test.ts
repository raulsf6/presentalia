import { describe, expect, test } from "vitest";

import { activeTalkTab } from "@/lib/talks/nav";

describe("activeTalkTab", () => {
  test("marks Overview only on the exact talk home", () => {
    expect(activeTalkTab("/talks/t1", "t1")).toBe("overview");
  });

  test("does not mark Overview on a section below the talk home", () => {
    expect(activeTalkTab("/talks/t1/activities", "t1")).not.toBe("overview");
    expect(activeTalkTab("/talks/t1/roster", "t1")).not.toBe("overview");
    expect(activeTalkTab("/talks/t1/slides", "t1")).not.toBe("overview");
  });

  test("marks Activities across the whole activities section", () => {
    expect(activeTalkTab("/talks/t1/activities", "t1")).toBe("activities");
    expect(activeTalkTab("/talks/t1/activities/p9", "t1")).toBe("activities");
    expect(activeTalkTab("/talks/t1/activities/p9/results", "t1")).toBe(
      "activities",
    );
  });

  test("marks Roster and Slides on their sections", () => {
    expect(activeTalkTab("/talks/t1/roster", "t1")).toBe("roster");
    expect(activeTalkTab("/talks/t1/slides", "t1")).toBe("slides");
  });

  test("returns null outside this talk's sections", () => {
    expect(activeTalkTab("/talks", "t1")).toBeNull();
    expect(activeTalkTab("/talks/new", "t1")).toBeNull();
    expect(activeTalkTab("/talks/t2", "t1")).toBeNull();
    expect(activeTalkTab("/talks/t2/activities", "t1")).toBeNull();
    expect(activeTalkTab("/admin/users", "t1")).toBeNull();
  });

  test("matches whole path segments, not string prefixes", () => {
    expect(activeTalkTab("/talks/abcd", "abc")).toBeNull();
    expect(activeTalkTab("/talks/abcd/activities", "abc")).toBeNull();
    expect(activeTalkTab("/talks/t1x", "t1")).toBeNull();
    expect(activeTalkTab("/talks/t1x/activities", "t1")).toBeNull();
  });
});

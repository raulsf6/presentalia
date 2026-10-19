import { describe, expect, test } from "vitest";

import { filterUsers } from "@/lib/user-filters";
import type { AppRole } from "@/lib/roles";

const users: { email: string | null; role: AppRole }[] = [
  { email: "ana@example.com", role: "attendee" },
  { email: "bruno@example.com", role: "presenter" },
  { email: "carla@example.com", role: "admin" },
  { email: null, role: "attendee" },
];

describe("filterUsers", () => {
  test("returns every user when no filter is active", () => {
    expect(filterUsers(users, { emailQuery: "", role: "all" })).toEqual(users);
  });

  test("matches email fragments case-insensitively", () => {
    expect(filterUsers(users, { emailQuery: "BRUNO@", role: "all" })).toEqual([
      users[1],
    ]);
  });

  test("keeps only the selected role", () => {
    expect(filterUsers(users, { emailQuery: "", role: "attendee" })).toEqual([
      users[0],
      users[3],
    ]);
  });

  test("combines the email query and the role filter", () => {
    expect(
      filterUsers(users, { emailQuery: "example", role: "presenter" }),
    ).toEqual([users[1]]);
  });

  test("never matches a missing email against a query", () => {
    expect(filterUsers(users, { emailQuery: "ana", role: "all" })).toEqual([
      users[0],
    ]);
  });

  test("ignores a whitespace-only query", () => {
    expect(filterUsers(users, { emailQuery: "   ", role: "admin" })).toEqual([
      users[2],
    ]);
  });

  test("trims the query before matching", () => {
    expect(
      filterUsers(users, { emailQuery: "  bruno  ", role: "all" }),
    ).toEqual([users[1]]);
  });
});

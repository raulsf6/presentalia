import { describe, expect, test } from "vitest";

import {
  readVerifiedIdentity,
  SESSION_USER_EMAIL_HEADER,
  SESSION_USER_ID_HEADER,
  withVerifiedIdentity,
} from "@/lib/auth/session-headers";

describe("withVerifiedIdentity", () => {
  test("strips caller-supplied identity headers", () => {
    const headers = new Headers({
      [SESSION_USER_ID_HEADER]: "attacker",
      [SESSION_USER_EMAIL_HEADER]: "attacker@example.com",
      "x-other": "kept",
    });

    const forwarded = withVerifiedIdentity(headers, null);

    expect(forwarded.get(SESSION_USER_ID_HEADER)).toBeNull();
    expect(forwarded.get(SESSION_USER_EMAIL_HEADER)).toBeNull();
    expect(forwarded.get("x-other")).toBe("kept");
  });

  test("sets the proxy-verified identity and drops any spoofed values", () => {
    const headers = new Headers({
      [SESSION_USER_ID_HEADER]: "attacker",
      [SESSION_USER_EMAIL_HEADER]: "attacker@example.com",
    });

    const forwarded = withVerifiedIdentity(headers, {
      id: "user-1",
      email: "Presenter@Example.com",
    });

    expect(forwarded.get(SESSION_USER_ID_HEADER)).toBe("user-1");
    expect(forwarded.get(SESSION_USER_EMAIL_HEADER)).toBe(
      "Presenter@Example.com",
    );
  });

  test("omits the email header when the verified user has no email", () => {
    const forwarded = withVerifiedIdentity(new Headers(), {
      id: "user-1",
      email: null,
    });

    expect(forwarded.get(SESSION_USER_ID_HEADER)).toBe("user-1");
    expect(forwarded.get(SESSION_USER_EMAIL_HEADER)).toBeNull();
  });
});

describe("readVerifiedIdentity", () => {
  test("requires an id and treats the email as optional", () => {
    expect(
      readVerifiedIdentity(new Headers({ [SESSION_USER_ID_HEADER]: "user-1" })),
    ).toEqual({ id: "user-1", email: null });
  });

  test("ignores an email without an id", () => {
    expect(
      readVerifiedIdentity(
        new Headers({ [SESSION_USER_EMAIL_HEADER]: "user@example.com" }),
      ),
    ).toBeNull();
  });
});

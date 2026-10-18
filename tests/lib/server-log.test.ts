import { describe, expect, test, vi } from "vitest";

import { logServerError, logServerWarning, maskEmail } from "@/lib/server-log";

describe("maskEmail", () => {
  test("keeps the first character and the domain", () => {
    expect(maskEmail("User.Name@Example.com")).toBe("u***@example.com");
  });

  test("fully masks values without a local part", () => {
    expect(maskEmail("not-an-email")).toBe("***");
  });
});

describe("logServerError", () => {
  test("writes one structured line with error fields and metadata", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerError(
        "test.scope",
        { message: "boom", code: "e_boom", status: 500 },
        { email: "u***@example.com" },
      );

      expect(spy).toHaveBeenCalledTimes(1);
      const [scope, payload] = spy.mock.calls[0] ?? [];
      expect(scope).toBe("[test.scope]");
      expect(JSON.parse(String(payload))).toEqual({
        message: "boom",
        code: "e_boom",
        status: 500,
        email: "u***@example.com",
      });
    } finally {
      spy.mockRestore();
    }
  });

  test("includes the wrapped cause chain", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerError("test.scope", {
        message: 'Failed query: select "id" from "app_users"',
        cause: {
          message: 'relation "app_users" does not exist',
          code: "42P01",
        },
      });

      const parsed = JSON.parse(String(spy.mock.calls[0]?.[1]));
      expect(parsed.cause).toEqual({
        message: 'relation "app_users" does not exist',
        code: "42P01",
      });
    } finally {
      spy.mockRestore();
    }
  });

  test("redacts email addresses embedded in error messages and causes", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerError("test.scope", {
        message: "Failed query: select 1\nparams: raulsf.it@gmail.com,1",
        cause: { message: "rejected recipient invitee@example.com" },
      });

      const payload = String(spy.mock.calls[0]?.[1]);
      expect(payload).not.toContain("raulsf.it@gmail.com");
      expect(payload).toContain("r***@gmail.com");
      expect(payload).not.toContain("invitee@example.com");
      expect(payload).toContain("i***@example.com");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("logServerWarning", () => {
  test("writes the warning message with metadata", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      logServerWarning("test.scope", "something happened", {
        email: "u***@example.com",
      });

      const [scope, payload] = spy.mock.calls[0] ?? [];
      expect(scope).toBe("[test.scope]");
      expect(JSON.parse(String(payload))).toEqual({
        message: "something happened",
        email: "u***@example.com",
      });
    } finally {
      spy.mockRestore();
    }
  });

  test("redacts email addresses in warning text as a safety net", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      logServerWarning("test.scope", "failed for raulsf.it@gmail.com");

      const payload = String(spy.mock.calls[0]?.[1]);
      expect(payload).not.toContain("raulsf.it@gmail.com");
      expect(payload).toContain("r***@gmail.com");
    } finally {
      spy.mockRestore();
    }
  });
});

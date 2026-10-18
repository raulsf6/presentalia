import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAllowedLoginEmail: vi.fn(),
  ensureAppUser: vi.fn(),
  sendAppUserInvite: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/login-gate", () => ({
  isAllowedLoginEmail: mocks.isAllowedLoginEmail,
}));

vi.mock("@/lib/provision-user", () => ({
  ensureAppUser: mocks.ensureAppUser,
  sendAppUserInvite: mocks.sendAppUserInvite,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithOtp: mocks.signInWithOtp, signOut: mocks.signOut },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { requestMagicLinkAction, signOutAction } from "@/actions/auth";

function emailForm(email: string): FormData {
  const form = new FormData();
  form.set("email", email);
  return form;
}

describe("requestMagicLinkAction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000 });
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://talks.example.com");
    vi.clearAllMocks();
    mocks.ensureAppUser.mockResolvedValue({
      id: "user-id",
      email: "invited@example.com",
      emailVerifiedAt: new Date(),
      role: "attendee",
    });
    mocks.sendAppUserInvite.mockResolvedValue(true);
    mocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test("uninvited addresses get generic success without Auth or email calls", async () => {
    mocks.isAllowedLoginEmail.mockResolvedValue(false);
    const resultPromise = requestMagicLinkAction(
      { ok: false },
      emailForm("unknown@example.com"),
    );

    await vi.advanceTimersByTimeAsync(1_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toEqual({ ok: true, sent: true });
    expect(mocks.ensureAppUser).not.toHaveBeenCalled();
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  test("verified provisioned users get a sign-in link with a minimum duration", async () => {
    mocks.isAllowedLoginEmail.mockResolvedValue(true);
    const resultPromise = requestMagicLinkAction(
      { ok: false },
      emailForm("invited@example.com"),
    );

    await vi.advanceTimersByTimeAsync(1_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toEqual({ ok: true, sent: true });
    expect(mocks.ensureAppUser).toHaveBeenCalledWith("invited@example.com");
    expect(mocks.sendAppUserInvite).not.toHaveBeenCalled();
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "invited@example.com",
      options: {
        emailRedirectTo: "https://talks.example.com/auth/confirm",
        shouldCreateUser: false,
      },
    });
  });

  test("unverified users receive an invite link instead of a sign-in OTP", async () => {
    mocks.isAllowedLoginEmail.mockResolvedValue(true);
    mocks.ensureAppUser.mockResolvedValue({
      id: "user-id",
      email: "invited@example.com",
      emailVerifiedAt: null,
      role: "attendee",
    });
    const resultPromise = requestMagicLinkAction(
      { ok: false },
      emailForm("invited@example.com"),
    );

    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).resolves.toEqual({ ok: true, sent: true });
    expect(mocks.sendAppUserInvite).toHaveBeenCalledWith("invited@example.com");
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("signOutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.redirect.mockReturnValue(undefined);
  });

  test("ends the Supabase session before returning to the login page", async () => {
    await signOutAction();

    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0],
    );
  });
});

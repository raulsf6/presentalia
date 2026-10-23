"use server";

import { redirect } from "next/navigation";

import { isAllowedLoginEmail } from "@/lib/auth/login-gate";
import { waitForMinimumDuration } from "@/lib/auth/auth-timing";
import { normalizeEmail, validateEmail } from "@/lib/talks/roster";
import { ensureAppUser, sendAppUserInvite } from "@/lib/auth/provision-user";
import { logServerError, logServerWarning, maskEmail } from "@/lib/platform/server-log";
import { getSiteUrl } from "@/lib/platform/site-url";
import { createSupabaseServerClient } from "@/lib/platform/supabase/server";

export type MagicLinkState = {
  ok: boolean;
  sent?: boolean;
  error?: string;
};

/**
 * Same response for every accepted address, invited or not, so the form
 * never reveals whether an address is on any roster (no enumeration). The
 * only observable difference is that uninvited addresses never receive an
 * email.
 */
const GENERIC_SENT: MagicLinkState = { ok: true, sent: true };
const MIN_LOGIN_RESPONSE_MS = 2_000;

async function genericResponse(startedAt: number): Promise<MagicLinkState> {
  await waitForMinimumDuration(startedAt, MIN_LOGIN_RESPONSE_MS);
  return GENERIC_SENT;
}

async function requestOrigin(): Promise<string> {
  return getSiteUrl();
}

/**
 * Requests a magic link for an email address. Only authorized addresses
 * (a provisioned app user or the bootstrap email) get an email;
 * everyone else gets the identical generic success response.
 */
export async function requestMagicLinkAction(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const raw = String(formData.get("email") ?? "");
  if (!validateEmail(raw)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const email = normalizeEmail(raw);
  const startedAt = Date.now();

  try {
    if (!(await isAllowedLoginEmail(email))) {
      const adminEmail = process.env.ADMIN_EMAIL;
      logServerWarning("auth.magic-link", "address not allowlisted", {
        email: maskEmail(email),
        adminEmail: adminEmail ? maskEmail(adminEmail) : null,
      });
      return genericResponse(startedAt);
    }

    // Bootstrap may be allowlisted before an app user exists. Provision it as
    // unconfirmed; the Auth invite link confirms it and the sync trigger mirrors
    // the confirmation timestamp.
    const appUser = await ensureAppUser(email);
    if (!appUser) {
      logServerWarning("auth.magic-link", "provisioning returned no app user", {
        email: maskEmail(email),
      });
      return genericResponse(startedAt);
    }
    if (!appUser.emailVerifiedAt) {
      const sent = await sendAppUserInvite(email);
      if (!sent) {
        logServerWarning("auth.magic-link", "invite send failed", {
          email: maskEmail(email),
        });
      }
      return genericResponse(startedAt);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${await requestOrigin()}/auth/confirm`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      // Invalid/expired input on a valid invited address — treat any
      // failure identically so behavior never differs by address. Every
      // syntactically valid address also receives the same minimum duration.
      logServerError("auth.magic-link", error, { email: maskEmail(email) });
      return genericResponse(startedAt);
    }
    return genericResponse(startedAt);
  } catch (error) {
    logServerError("auth.magic-link", error, { email: maskEmail(email) });
    return genericResponse(startedAt);
  }
}

/** Ends the Supabase session and returns the user to the login page. */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

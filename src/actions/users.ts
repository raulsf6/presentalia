"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { requireAdmin } from "@/lib/require-admin";
import { APP_ROLES, type AppRole } from "@/lib/roles";
import { ensureAppUser, sendAppUserInvite } from "@/lib/provision-user";
import { normalizeEmail, validateEmail } from "@/lib/roster";
import { logServerError } from "@/lib/server-log";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const USER_ID_RE = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export type UserActionResult = {
  ok: boolean;
  error?: string;
  warning?: string;
};

async function setUserRole(userId: string, role: AppRole): Promise<void> {
  await getDb().execute(
    sql`select public.change_app_user_role(${userId}::uuid, ${role}::public.app_role)`,
  );
}

function roleChangeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("at least one admin")
    ? "At least one admin must remain. Promote another user first."
    : "Could not update that user's role.";
}

/** Adds a user with an attendee or presenter role, provisioning Auth if needed. */
export async function addUserAction(
  rawEmail: string,
  role: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!validateEmail(rawEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!APP_ROLES.includes(role as AppRole)) {
    return { ok: false, error: "Choose a valid role." };
  }

  const email = normalizeEmail(rawEmail);
  const appUser = await ensureAppUser(email);
  if (!appUser) {
    return {
      ok: false,
      error: "Could not create or find the account for that email.",
    };
  }

  if (role === "attendee") {
    // Adding an attendee never changes an existing role; use the user list to
    // demote a presenter or admin deliberately.
    if (appUser.role !== "attendee") {
      return {
        ok: false,
        error: "That email already has a presenter or admin role.",
      };
    }
  } else {
    // Presenter and admin requests only promote; an existing higher role is
    // left alone rather than quietly demoted. Adding several users also never
    // needs to demote, so the last-admin guard cannot fire here.
    const shouldPromote =
      (role === "presenter" && appUser.role === "attendee") ||
      (role === "admin" && appUser.role !== "admin");
    if (shouldPromote) {
      try {
        await setUserRole(appUser.id, role as AppRole);
      } catch (error) {
        return { ok: false, error: roleChangeError(error) };
      }
    }
  }

  const inviteSent = appUser.emailVerifiedAt
    ? true
    : await sendAppUserInvite(email);
  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return {
    ok: true,
    warning: inviteSent
      ? undefined
      : "User added, but we couldn't send the verification invitation.",
  };
}

/** Changes an existing user's role; the database protects the final admin. */
export async function changeUserRoleAction(
  userId: string,
  role: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!USER_ID_RE.test(userId)) {
    return { ok: false, error: "That user could not be found." };
  }
  if (!APP_ROLES.includes(role as AppRole)) {
    return { ok: false, error: "Choose a valid role." };
  }

  try {
    await setUserRole(userId, role as AppRole);
  } catch (error) {
    return { ok: false, error: roleChangeError(error) };
  }

  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return { ok: true };
}

/**
 * Deletes an Auth user, cascading through app_users, talk rosters and votes.
 * The service-role Auth admin call removes the identity; database cascades and
 * the final-admin guard run on the same delete.
 */
export async function deleteUserAction(
  userId: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!USER_ID_RE.test(userId)) {
    return { ok: false, error: "That user could not be found." };
  }
  if (userId === guard.user.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  try {
    const service = createSupabaseServiceClient();
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      const message = (error.message ?? "").toLowerCase();
      if (message.includes("at least one admin")) {
        return {
          ok: false,
          error: "At least one admin must remain. Promote another user first.",
        };
      }
      if (message.includes("not found")) {
        return { ok: false, error: "That user could not be found." };
      }
      logServerError("users.delete", error, { userId });
      return { ok: false, error: "Could not delete that user." };
    }
  } catch (error) {
    logServerError("users.delete", error, { userId });
    return { ok: false, error: "Could not delete that user." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return { ok: true };
}

"use server";

import { sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { ensureAppUser, sendAppUserInvite } from "@/lib/auth/provision-user";
import { normalizeEmail, validateEmail } from "@/lib/talks/roster";
import { logServerError } from "@/lib/platform/server-log";
import { createSupabaseServiceClient } from "@/lib/platform/supabase/service";
import type { ErrorKey, WarningKey } from "@/lib/i18n/dictionaries/en";
import type { ActionFailure } from "@/lib/i18n/errors";

const USER_ID_RE = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export type UserActionResult =
  { ok: true; warningKey?: WarningKey } | ActionFailure;

async function setUserRole(userId: string, role: AppRole): Promise<void> {
  await getDb().execute(
    sql`select public.change_app_user_role(${userId}::uuid, ${role}::public.app_role)`,
  );
}

function roleChangeError(error: unknown): ErrorKey {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("at least one admin")
    ? "errors.users.lastAdmin"
    : "errors.users.roleUpdateFailed";
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
    return { ok: false, errorKey: "errors.auth.invalidEmail" };
  }
  if (!APP_ROLES.includes(role as AppRole)) {
    return { ok: false, errorKey: "errors.auth.invalidRole" };
  }

  const email = normalizeEmail(rawEmail);
  const appUser = await ensureAppUser(email);
  if (!appUser) {
    return {
      ok: false,
      errorKey: "errors.users.createFailed",
    };
  }

  if (role === "attendee") {
    // Adding an attendee never changes an existing role; use the user list to
    // demote a presenter or admin deliberately.
    if (appUser.role !== "attendee") {
      return {
        ok: false,
        errorKey: "errors.users.alreadyPrivileged",
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
        return { ok: false, errorKey: roleChangeError(error) };
      }
    }
  }

  const inviteSent = appUser.emailVerifiedAt
    ? true
    : await sendAppUserInvite(email);
  updateTag("users");
  updateTag("talks");
  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return {
    ok: true,
    warningKey: inviteSent ? undefined : "warnings.user.inviteFailed",
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
    return { ok: false, errorKey: "errors.users.notFound" };
  }
  if (!APP_ROLES.includes(role as AppRole)) {
    return { ok: false, errorKey: "errors.auth.invalidRole" };
  }

  try {
    await setUserRole(userId, role as AppRole);
  } catch (error) {
    return { ok: false, errorKey: roleChangeError(error) };
  }

  updateTag("users");
  updateTag("talks");
  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return { ok: true };
}

/**
 * Deletes an Auth user, cascading through app_users, talk rosters and votes.
 * Text answers survive as GDPR tombstones (`ON DELETE SET NULL` plus a removal
 * notice), so a published ranking keeps its shape. The service-role Auth admin
 * call removes the identity; database cascades and the final-admin guard run on
 * the same delete.
 */
export async function deleteUserAction(
  userId: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!USER_ID_RE.test(userId)) {
    return { ok: false, errorKey: "errors.users.notFound" };
  }
  if (userId === guard.user.id) {
    return { ok: false, errorKey: "errors.users.cannotDeleteSelf" };
  }

  try {
    const service = createSupabaseServiceClient();
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      const message = (error.message ?? "").toLowerCase();
      if (message.includes("at least one admin")) {
        return {
          ok: false,
          errorKey: "errors.users.lastAdmin",
        };
      }
      if (message.includes("not found")) {
        return { ok: false, errorKey: "errors.users.notFound" };
      }
      logServerError("users.delete", error, { userId });
      return { ok: false, errorKey: "errors.users.deleteFailed" };
    }
  } catch (error) {
    logServerError("users.delete", error, { userId });
    return { ok: false, errorKey: "errors.users.deleteFailed" };
  }

  updateTag("users");
  updateTag("talks");
  updateTag("roster");
  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return { ok: true };
}

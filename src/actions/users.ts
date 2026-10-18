"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { requireAdmin } from "@/lib/require-admin";
import { APP_ROLES, type AppRole } from "@/lib/roles";
import { ensureAppUser, sendAppUserInvite } from "@/lib/provision-user";
import { normalizeEmail, validateEmail } from "@/lib/roster";

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

/** Adds a presenter email, provisioning its Auth account when necessary. */
export async function addPresenterAction(
  rawEmail: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!validateEmail(rawEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const email = normalizeEmail(rawEmail);
  const appUser = await ensureAppUser(email);
  if (!appUser) {
    return {
      ok: false,
      error: "Could not create or find the account for that email.",
    };
  }
  if (appUser.role === "admin" || appUser.role === "presenter") {
    revalidatePath("/admin/users");
    const inviteSent = appUser.emailVerifiedAt
      ? true
      : await sendAppUserInvite(email);
    return {
      ok: true,
      warning: inviteSent
        ? undefined
        : "Account is ready, but we couldn't send the verification invitation.",
    };
  }

  try {
    await setUserRole(appUser.id, "presenter");
  } catch (error) {
    return { ok: false, error: roleChangeError(error) };
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
      : "Presenter added, but we couldn't send the verification invitation.",
  };
}

/** Provisions an attendee account without assigning it to a talk. */
export async function addAttendeeAction(
  rawEmail: string,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard;
  }

  if (!validateEmail(rawEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const appUser = await ensureAppUser(rawEmail);
  if (!appUser) {
    return { ok: false, error: "Could not create or find that account." };
  }
  if (appUser.role !== "attendee") {
    return {
      ok: false,
      error: "That email already has a presenter or admin role.",
    };
  }

  const inviteSent = appUser.emailVerifiedAt
    ? true
    : await sendAppUserInvite(appUser.email ?? normalizeEmail(rawEmail));
  revalidatePath("/admin/users");
  revalidatePath("/talks");
  return {
    ok: true,
    warning: inviteSent
      ? undefined
      : "Attendee added, but we couldn't send the verification invitation.",
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

  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(userId)) {
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

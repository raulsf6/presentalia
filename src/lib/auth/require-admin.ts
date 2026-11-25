import type { ActionFailure } from "@/lib/i18n/errors";

import { getSessionUser, type SessionUser } from "@/lib/auth/auth";

export type AdminGuard = { ok: true; user: SessionUser } | ActionFailure;

export type PresenterGuard = { ok: true; user: SessionUser } | ActionFailure;

/**
 * Guard for admin-only server actions. Admin data access runs on the owner
 * connection only after this database-backed role check (see src/db/index.ts).
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, errorKey: "errors.auth.signedOut" };
  }
  if (user.role !== "admin") {
    return { ok: false, errorKey: "errors.auth.adminOnly" };
  }
  return { ok: true, user };
}

/** Guard for operations any presenter or admin may perform. */
export async function requirePresenter(): Promise<PresenterGuard> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, errorKey: "errors.auth.signedOut" };
  }
  if (user.role === "attendee") {
    return { ok: false, errorKey: "errors.auth.presenterOnly" };
  }
  return { ok: true, user };
}

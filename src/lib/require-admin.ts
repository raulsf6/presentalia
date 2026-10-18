import { getSessionUser, type SessionUser } from "@/lib/auth";

export type AdminGuard =
  { ok: true; user: SessionUser } | { ok: false; error: string };

export type PresenterGuard =
  { ok: true; user: SessionUser } | { ok: false; error: string };

/**
 * Guard for admin-only server actions. Admin data access runs on the owner
 * connection only after this database-backed role check (see src/db/index.ts).
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You need to sign in." };
  }
  if (user.role !== "admin") {
    return { ok: false, error: "Only the admin can do this." };
  }
  return { ok: true, user };
}

/** Guard for operations any presenter or admin may perform. */
export async function requirePresenter(): Promise<PresenterGuard> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You need to sign in." };
  }
  if (user.role === "attendee") {
    return {
      ok: false,
      error: "Only a presenter or admin can do this.",
    };
  }
  return { ok: true, user };
}

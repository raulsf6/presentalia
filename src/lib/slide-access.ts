import { getSessionUser } from "@/lib/auth";
import {
  getTalkAccessForUser,
  isManager,
  type TalkAccess,
} from "@/lib/membership";

export type SlideRequestAccess =
  | { ok: true; talkId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

export type ManagerAccess =
  | { ok: true; access: TalkAccess }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Authorizes a manager-only request and returns the loaded access, for routes
 * that also need the talk row. A missing session is 401, a non-manager is 403,
 * and a talk the caller cannot see is 404 so the response never reveals that a
 * talk exists.
 */
export async function authorizeManagerAccess(
  talkId: string,
): Promise<ManagerAccess> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in to control this talk." };
  }

  const access = await getTalkAccessForUser(user, talkId);
  if (!access) {
    return { ok: false, status: 404, error: "Talk not found." };
  }
  if (!isManager(access)) {
    return { ok: false, status: 403, error: "You can't control this talk." };
  }

  return { ok: true, access };
}

/** Authorizes a slide polling or control request. */
export async function authorizeSlideRequest(
  talkId: string,
): Promise<SlideRequestAccess> {
  const result = await authorizeManagerAccess(talkId);
  if (!result.ok) {
    return result;
  }
  return { ok: true, talkId };
}

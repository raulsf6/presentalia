/**
 * Internal headers the proxy sets after it has verified the Supabase session.
 * They are request-only: the proxy strips any caller-supplied values on every
 * matched request, so server code can use them without another Auth call.
 */
export const SESSION_USER_ID_HEADER = "x-presentalia-user-id";
export const SESSION_USER_EMAIL_HEADER = "x-presentalia-user-email";

export type VerifiedIdentity = {
  id: string;
  email: string | null;
};

/** Reads the proxy-verified identity. Returns null without a verified user id. */
export function readVerifiedIdentity(
  headers: Headers,
): VerifiedIdentity | null {
  const id = headers.get(SESSION_USER_ID_HEADER)?.trim();
  if (!id) {
    return null;
  }
  const email = headers.get(SESSION_USER_EMAIL_HEADER)?.trim();
  return { id, email: email ? email : null };
}

/**
 * Copies request headers and replaces the identity headers with the given
 * verified identity. The proxy must call this on every matched request,
 * including anonymous ones, so a client cannot forge the headers.
 */
export function withVerifiedIdentity(
  source: Headers,
  identity: VerifiedIdentity | null,
): Headers {
  const headers = new Headers(source);
  headers.delete(SESSION_USER_ID_HEADER);
  headers.delete(SESSION_USER_EMAIL_HEADER);
  if (!identity) {
    return headers;
  }
  headers.set(SESSION_USER_ID_HEADER, identity.id);
  if (identity.email) {
    headers.set(SESSION_USER_EMAIL_HEADER, identity.email);
  }
  return headers;
}

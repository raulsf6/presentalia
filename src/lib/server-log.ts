/**
 * Server-only logging for unexpected backend errors. Logs go to the runtime's
 * stdout/stderr (visible in Vercel's runtime logs) and never reach API
 * responses, so the app's anti-enumeration replies stay identical. Emails are
 * masked; never include secrets in logged metadata.
 */

const ERROR_FIELDS = [
  "name",
  "message",
  "code",
  "details",
  "hint",
  "status",
] as const;

/** Wrapper chains are shallow (Drizzle -> pg); cap recursion defensively. */
const CAUSE_DEPTH_LIMIT = 3;

function errorFields(error: unknown, depth = 0): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const source = error as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const key of ERROR_FIELDS) {
    if (source[key] != null) {
      fields[key] = source[key];
    }
  }
  if (source.cause != null && depth < CAUSE_DEPTH_LIMIT) {
    fields.cause = errorFields(source.cause, depth + 1);
  }
  return Object.keys(fields).length > 0 ? fields : { message: String(error) };
}

/** Keeps the first character of the local part and the whole domain. */
export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) {
    return "***";
  }
  return `${normalized.slice(0, 1)}***${normalized.slice(at)}`;
}

export function logServerError(
  scope: string,
  error: unknown,
  meta: Record<string, unknown> = {},
): void {
  console.error(
    `[${scope}]`,
    JSON.stringify({ ...errorFields(error), ...meta }),
  );
}

export function logServerWarning(
  scope: string,
  message: string,
  meta: Record<string, unknown> = {},
): void {
  console.warn(`[${scope}]`, JSON.stringify({ message, ...meta }));
}

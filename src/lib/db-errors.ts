/** Read a PostgreSQL SQLSTATE from either a direct error or its cause chain. */
function postgresCode(error: unknown): string | null {
  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresCode(error) === "23505";
}

/**
 * ADMIN_EMAIL is used only to bootstrap the first database-backed admin.
 * It is not an ongoing authorization check. Comparison is case-insensitive.
 */
export function isBootstrapAdminEmail(
  email: string | null | undefined,
): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin) return false;
  if (!email) return false;
  return email.trim().toLowerCase() === admin;
}

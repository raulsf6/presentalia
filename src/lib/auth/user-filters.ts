import type { AppRole } from "@/lib/auth/roles";

export type UserRoleFilter = AppRole | "all";

type FilterableUser = {
  email: string | null;
  role: AppRole;
};

/**
 * Filters the admin user list in memory. The list is small (the whole
 * provisioned user set is already loaded for management), so filtering in the
 * browser keeps every keystroke instant instead of round-tripping per query.
 */
export function filterUsers<T extends FilterableUser>(
  users: T[],
  { emailQuery, role }: { emailQuery: string; role: UserRoleFilter },
): T[] {
  const query = emailQuery.trim().toLowerCase();
  return users.filter((user) => {
    if (role !== "all" && user.role !== role) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (user.email ?? "").toLowerCase().includes(query);
  });
}

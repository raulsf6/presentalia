import { notFound, redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { UserManager } from "@/components/UserManager";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "admin") {
    notFound();
  }

  const userRows = await getDb()
    .select({
      id: appUsers.id,
      email: appUsers.email,
      role: appUsers.role,
      emailVerifiedAt: appUsers.emailVerifiedAt,
    })
    .from(appUsers)
    .orderBy(asc(appUsers.email));
  const users = userRows.map((row) => ({
    ...row,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl">Manage users</h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          Search and filter users, assign roles, and remove accounts that no
          longer need access.
        </p>
      </div>
      <div className="card p-6">
        <UserManager users={users} currentUserId={user.id} />
      </div>
    </main>
  );
}

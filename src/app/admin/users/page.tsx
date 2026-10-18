import Link from "next/link";
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Manage users</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Add attendees and presenters, assign roles, and check email status.
          </p>
        </div>
        <Link
          href="/talks"
          className="shrink-0 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← All talks
        </Link>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <UserManager users={users} currentUserId={user.id} />
      </div>
    </main>
  );
}

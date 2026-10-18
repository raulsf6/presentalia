import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/SignOutButton";
import { getSessionUser } from "@/lib/auth";
import { listAccessibleTalks } from "@/lib/membership";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function TalksPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rows = await listAccessibleTalks(user);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl font-extrabold">
            {user.role === "admin" ? "All talks" : "Your talks"}
          </h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {user.role === "admin"
              ? "Create and manage talks, rosters, slides, and polls."
              : user.role === "presenter"
                ? "Talks you created and talks you were invited to."
                : "Talks your email address is registered for."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {user.role === "admin" ? (
            <Link href="/admin/users" className="linky">
              Manage users
            </Link>
          ) : null}
          {user.role !== "attendee" ? (
            <Link href="/talks/new" className="btn btn-small">
              + New talk
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty">
          {user.role === "admin"
            ? "No talks yet. Create your first talk to get started."
            : user.role === "presenter"
              ? "No talks yet. Create your first talk or ask a presenter to add you to one."
              : "You don't have access to any talks yet. Ask an admin or presenter to add you to a talk."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((talk) => (
            <li key={talk.id}>
              <Link
                href={`/talks/${talk.id}`}
                className="card card-hover flex flex-col gap-1 p-4"
              >
                <span className="text-ink font-extrabold">{talk.name}</span>
                {talk.heldAt ? (
                  <span className="text-muted text-xs font-bold">
                    {formatDate(talk.heldAt)}
                  </span>
                ) : null}
                {talk.description ? (
                  <span className="text-ink/75 text-sm font-semibold">
                    {talk.description}
                  </span>
                ) : null}
                <span className="mt-1 flex gap-2 text-xs">
                  {talk.slidesUpdatedAt ? (
                    <span className="chip chip-slide">📄 Slides available</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

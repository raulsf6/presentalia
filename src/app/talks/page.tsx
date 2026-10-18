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
          <h1 className="text-2xl font-semibold text-zinc-900">
            {user.role === "admin" ? "All talks" : "Your talks"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {user.role === "admin"
              ? "Create and manage talks, rosters, slides, and polls."
              : user.role === "presenter"
                ? "Talks you created and talks you were invited to."
                : "Talks your email address is registered for."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {user.role === "admin" ? (
            <Link
              href="/admin/users"
              className="text-sm font-medium text-zinc-700 underline underline-offset-4"
            >
              Manage users
            </Link>
          ) : null}
          {user.role !== "attendee" ? (
            <Link
              href="/talks/new"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              New talk
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
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
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
              >
                <span className="font-medium text-zinc-900">{talk.name}</span>
                {talk.heldAt ? (
                  <span className="text-xs text-zinc-500">
                    {formatDate(talk.heldAt)}
                  </span>
                ) : null}
                {talk.description ? (
                  <span className="text-sm text-zinc-600">
                    {talk.description}
                  </span>
                ) : null}
                <span className="mt-1 flex gap-2 text-xs">
                  {talk.slidesUpdatedAt ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                      Slides available
                    </span>
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

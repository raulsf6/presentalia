import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { UserIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth/auth";
import { loadTalkList } from "@/lib/talks/membership";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TalksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TalksContent />
    </Suspense>
  );
}

async function TalksContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rows = await loadTalkList(user.id, user.role);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl">
            {user.role === "admin" ? "All talks" : "Your talks"}
          </h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {user.role === "admin"
              ? "Create and manage talks, rosters, slides, and activities."
              : user.role === "presenter"
                ? "Talks you created and talks you were invited to."
                : "Talks your email address is registered for."}
          </p>
        </div>
        {user.role !== "attendee" ? (
          <Link href="/talks/new" className="btn btn-small shrink-0">
            + New talk
          </Link>
        ) : null}
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
          {rows.map((talk) => {
            const ownerEmail = talk.ownerEmail;
            return (
              <li key={talk.id}>
                <Link
                  href={`/talks/${talk.id}`}
                  prefetch={true}
                  className="card card-hover flex flex-col gap-1 p-4"
                >
                  <span className="text-ink font-bold">{talk.name}</span>
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
                  {user.role === "admin" && talk.createdBy ? (
                    <span className="text-muted flex items-center gap-1.5 text-xs font-bold">
                      <UserIcon className="size-3.5 shrink-0" />
                      <span className="sr-only">Owner:</span>
                      <span className="truncate font-mono">
                        {ownerEmail ?? "No email address"}
                      </span>
                    </span>
                  ) : null}
                  <span className="mt-1 flex gap-2 text-xs">
                    {talk.slidesUpdatedAt ? (
                      <span className="chip chip-slide">
                        📄 Slides available
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

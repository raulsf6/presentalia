import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateTalkForm } from "@/components/CreateTalkForm";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getSessionUser } from "@/lib/auth";

export default function NewTalkPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewTalkContent />
    </Suspense>
  );
}

async function NewTalkContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "attendee") {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="font-display text-ink mb-8 text-2xl">New talk</h1>
      <div className="card p-6">
        <CreateTalkForm />
      </div>
    </main>
  );
}

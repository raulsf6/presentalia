import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateTalkForm } from "@/components/CreateTalkForm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewTalkPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "attendee") {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">New talk</h1>
        <Link
          href="/talks"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back to talks
        </Link>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <CreateTalkForm />
      </div>
    </main>
  );
}

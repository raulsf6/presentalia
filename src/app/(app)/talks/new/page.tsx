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
      <h1 className="font-display text-ink mb-8 text-2xl">New talk</h1>
      <div className="card p-6">
        <CreateTalkForm />
      </div>
    </main>
  );
}

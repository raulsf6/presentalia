import { redirect } from "next/navigation";

import { MagicLinkForm } from "@/components/MagicLinkForm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user) {
    redirect("/talks");
  }
  const params = await searchParams;
  const linkExpired = params?.error === "auth";
  const accessDenied = params?.error === "denied";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-zinc-900">
            Sign in to Presentalia
          </h1>
          <p className="text-sm text-zinc-600">
            Enter your rostered or presenter email address. We&apos;ll send you
            a one-time sign-in link — no password needed.
          </p>
        </div>
        {linkExpired ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            That sign-in link is no longer valid. Please request a new one.
          </p>
        ) : null}
        {accessDenied ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            This email address does not have access yet. Ask a presenter to add
            it to a talk&apos;s roster or an admin to add it as a presenter.
          </p>
        ) : null}
        <MagicLinkForm />
      </div>
    </main>
  );
}

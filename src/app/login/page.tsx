import { Suspense } from "react";

import { MagicLinkForm } from "@/components/MagicLinkForm";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="card flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1">
          <span className="font-display text-ink text-lg">
            Presentalia<span className="text-coral">.</span>
          </span>
          <h1 className="font-display text-ink text-xl">
            Sign in to Presentalia
          </h1>
          <p className="text-muted text-sm font-semibold">
            Enter your rostered or presenter email address. We&apos;ll send you
            a one-time sign-in link — no password needed.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginMessages searchParams={searchParams} />
        </Suspense>
        <MagicLinkForm />
      </div>
    </main>
  );
}

async function LoginMessages({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const linkExpired = params?.error === "auth";
  const accessDenied = params?.error === "denied";

  return (
    <>
      {linkExpired ? (
        <p role="alert" className="alert alert-err">
          That sign-in link is no longer valid. Please request a new one.
        </p>
      ) : null}
      {accessDenied ? (
        <p role="alert" className="alert alert-err">
          This email address does not have access yet. Ask a presenter to add it
          to a talk&apos;s roster or an admin to add it as a presenter.
        </p>
      ) : null}
    </>
  );
}

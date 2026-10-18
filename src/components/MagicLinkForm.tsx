"use client";

import { useActionState } from "react";

import { requestMagicLinkAction, type MagicLinkState } from "@/actions/auth";
import { LoadingDots } from "@/components/LoadingDots";

const initial: MagicLinkState = { ok: false };

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLinkAction,
    initial,
  );

  if (state.sent) {
    return (
      <div role="status" className="alert alert-ok">
        <p className="font-bold">
          Check your inbox — a sign-in link is on its way.
        </p>
        <p className="mt-1 font-semibold">
          The link signs you in to the talks your email address is registered
          for.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-ink text-sm font-bold">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? (
          <>
            Sending… <LoadingDots />
          </>
        ) : (
          <>Send sign-in link →</>
        )}
      </button>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

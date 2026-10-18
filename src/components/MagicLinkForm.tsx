"use client";

import { useActionState } from "react";

import { requestMagicLinkAction, type MagicLinkState } from "@/actions/auth";

const initial: MagicLinkState = { ok: false };

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLinkAction,
    initial,
  );

  if (state.sent) {
    return (
      <div
        role="status"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      >
        <p className="font-medium">
          Check your inbox — a sign-in link is on its way.
        </p>
        <p className="mt-1 text-emerald-700">
          The link signs you in to the talks your email address is registered
          for.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

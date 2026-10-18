"use client";

import { useActionState } from "react";

import { createTalkAction, type ActionResult } from "@/actions/talks";

const initial: ActionResult = { ok: true };

export function CreateTalkForm() {
  const [state, formAction, pending] = useActionState(
    createTalkAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Talk name <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="AI Agents in Production"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="heldAt" className="text-sm font-medium text-zinc-700">
          Date <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="heldAt"
          name="heldAt"
          type="date"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-700"
        >
          Description <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What this talk is about"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create talk"}
      </button>
    </form>
  );
}

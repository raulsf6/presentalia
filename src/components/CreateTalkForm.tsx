"use client";

import { useActionState } from "react";

import { createTalkAction, type ActionResult } from "@/actions/talks";
import { LoadingDots } from "@/components/LoadingDots";

const initial: ActionResult = { ok: true };

export function CreateTalkForm() {
  const [state, formAction, pending] = useActionState(
    createTalkAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-ink text-sm font-bold">
          Talk name <span className="text-red">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="AI Agents in Production"
          className="input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="heldAt" className="text-ink text-sm font-bold">
          Date{" "}
          <span className="text-muted text-xs font-semibold">(optional)</span>
        </label>
        <input id="heldAt" name="heldAt" type="date" className="input" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-ink text-sm font-bold">
          Description{" "}
          <span className="text-muted text-xs font-semibold">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What this talk is about"
          className="input"
        />
      </div>
      <label className="border-ink bg-cream flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-3">
        <input
          type="checkbox"
          name="isPublic"
          className="accent-coral mt-0.5 size-4"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-ink text-sm font-bold">
            Public talk (anonymous joining)
          </span>
          <span className="text-muted text-xs font-semibold">
            Anyone with the join QR can enter a username and take part. You can
            stop new joins at any time from the talk&apos;s access page.
          </span>
        </span>
      </label>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn w-fit">
        {pending ? (
          <>
            Creating… <LoadingDots />
          </>
        ) : (
          "Create talk"
        )}
      </button>
    </form>
  );
}

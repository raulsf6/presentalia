"use client";

import { useActionState } from "react";

import {
  joinPublicTalkAction,
  type AnonymousAccessResult,
} from "@/actions/anonymous-access";
import { LoadingDots } from "@/components/LoadingDots";

const initial: AnonymousAccessResult = { ok: true };

export function JoinTalkForm({ talkId }: { talkId: string }) {
  const [state, formAction, pending] = useActionState(
    joinPublicTalkAction.bind(null, talkId),
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-ink text-sm font-bold">
          Your name for this talk <span className="text-red">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          autoComplete="nickname"
          autoCapitalize="words"
          placeholder="e.g. Sam"
          className="input"
          aria-describedby="username-hint"
        />
        <p id="username-hint" className="text-muted text-xs font-semibold">
          This is how you appear in results. Names are unique in a talk and
          cannot be changed later.
        </p>
      </div>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn w-fit">
        {pending ? (
          <>
            Joining… <LoadingDots />
          </>
        ) : (
          "Join the talk"
        )}
      </button>
    </form>
  );
}

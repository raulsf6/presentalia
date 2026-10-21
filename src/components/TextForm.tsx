"use client";

import { useActionState } from "react";

import {
  createTextActivityAction,
  type TextActionResult,
} from "@/actions/text";
import { LoadingDots } from "@/components/LoadingDots";

const initial: TextActionResult = { ok: true };

export function TextForm({ talkId }: { talkId: string }) {
  const action = createTextActivityAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-ink text-sm font-bold">
          Prompt
        </label>
        <textarea
          id="prompt"
          name="prompt"
          required
          maxLength={500}
          rows={2}
          placeholder="What is the most actionable next step for your AI agent?"
          className="input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="criteria" className="text-ink text-sm font-bold">
          Ranking criterion
        </label>
        <textarea
          id="criteria"
          name="criteria"
          required
          maxLength={500}
          rows={2}
          placeholder="Most actionable — specific, small, and possible this week."
          className="input"
        />
        <p className="text-muted text-xs font-semibold">
          The AI judges every answer only against this criterion. It is locked
          when you launch.
        </p>
      </div>

      <div className="border-amber bg-ambersoft rounded-lg border-[2.5px] p-3">
        <p className="text-amberdeep text-xs font-semibold">
          Answers are sent to an AI model through the Vercel AI Gateway to be
          ranked. Ask for ideas, not sensitive personal information.
        </p>
      </div>

      <label className="border-ink bg-cream flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-3">
        <input
          type="checkbox"
          name="resultsIdentifiable"
          className="accent-coral mt-0.5 size-4"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-ink text-sm font-bold">
            Show attendee names with answers
          </span>
          <span className="text-muted text-xs font-semibold">
            Off by default. This choice cannot be changed after you launch.
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
          "Create text prompt"
        )}
      </button>
    </form>
  );
}

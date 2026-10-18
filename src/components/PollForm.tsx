"use client";

import { useActionState, useState } from "react";

import { createPollAction, type PollActionResult } from "@/actions/polls";

const initial: PollActionResult = { ok: true };

export function PollForm({ talkId }: { talkId: string }) {
  const [options, setOptions] = useState(["", ""]);
  const action = createPollAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="question" className="text-sm font-medium text-zinc-700">
          Poll question
        </label>
        <textarea
          id="question"
          name="question"
          required
          maxLength={500}
          rows={2}
          placeholder="Which AI agent framework are you most excited to use?"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-zinc-700">
          Answer options{" "}
          <span className="text-xs font-normal text-zinc-500">(2–8)</span>
        </legend>
        {options.map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name="options"
              type="text"
              required
              maxLength={200}
              aria-label={`Answer option ${index + 1}`}
              placeholder={`Option ${index + 1}`}
              className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              value={options[index]}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((option, optionIndex) =>
                    optionIndex === index ? event.target.value : option,
                  ),
                )
              }
            />
            {options.length > 2 ? (
              <button
                type="button"
                aria-label={`Remove option ${index + 1}`}
                onClick={() =>
                  setOptions((current) =>
                    current.filter((_, optionIndex) => optionIndex !== index),
                  )
                }
                className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-red-700"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {options.length < 8 ? (
          <button
            type="button"
            onClick={() => setOptions((current) => [...current, ""])}
            className="mt-1 w-fit text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            + Add an option
          </button>
        ) : null}
      </fieldset>

      <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <input
          type="checkbox"
          name="resultsIdentifiable"
          className="mt-0.5 size-4 accent-zinc-900"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-800">
            Show voter email addresses in results
          </span>
          <span className="text-xs text-zinc-500">
            Off by default. This choice cannot be changed after you launch the
            poll.
          </span>
        </span>
      </label>

      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create poll"}
      </button>
    </form>
  );
}

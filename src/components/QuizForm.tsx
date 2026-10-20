"use client";

import { useActionState, useState } from "react";

import { createQuizAction, type QuizActionResult } from "@/actions/quizzes";
import { LoadingDots } from "@/components/LoadingDots";

const initial: QuizActionResult = { ok: true };

export function QuizForm({ talkId }: { talkId: string }) {
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const action = createQuizAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  function removeOption(index: number) {
    setOptions((current) =>
      current.filter((_, optionIndex) => optionIndex !== index),
    );
    setCorrectIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="question" className="text-ink text-sm font-bold">
          Quiz question
        </label>
        <textarea
          id="question"
          name="question"
          required
          maxLength={500}
          rows={2}
          placeholder="Which framework uses a state graph?"
          className="input"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink mb-1 text-sm font-bold">
          Answer options{" "}
          <span className="text-muted text-xs font-semibold">(2–8)</span>
        </legend>
        <p className="text-muted -mt-1 mb-1 text-xs font-semibold">
          Mark the one correct answer with the radio button.
        </p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              value={index}
              required
              aria-label={`Mark option ${index + 1} as the correct answer`}
              checked={correctIndex === index}
              onChange={() => setCorrectIndex(index)}
              className="accent-green size-4 shrink-0"
            />
            <input
              name="options"
              type="text"
              required
              maxLength={200}
              aria-label={`Answer option ${index + 1}`}
              placeholder={`Option ${index + 1}`}
              className="input min-w-0 flex-1"
              value={option}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((label, optionIndex) =>
                    optionIndex === index ? event.target.value : label,
                  ),
                )
              }
            />
            {options.length > 2 ? (
              <button
                type="button"
                aria-label={`Remove option ${index + 1}`}
                onClick={() => removeOption(index)}
                className="btn btn-ghost btn-small"
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
            className="linky mt-1 w-fit"
          >
            + Add an option
          </button>
        ) : null}
      </fieldset>

      <label className="border-ink bg-cream flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-3">
        <input
          type="checkbox"
          name="resultsIdentifiable"
          className="accent-coral mt-0.5 size-4"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-ink text-sm font-bold">
            Show voter email addresses in results
          </span>
          <span className="text-muted text-xs font-semibold">
            Off by default. This choice cannot be changed after you launch the
            quiz.
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
          "Create quiz"
        )}
      </button>
    </form>
  );
}

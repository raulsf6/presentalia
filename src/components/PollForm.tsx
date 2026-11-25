"use client";

import { useActionState, useState } from "react";

import { createPollAction, type PollActionResult } from "@/actions/polls";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: PollActionResult = { ok: true };

export function PollForm({ talkId }: { talkId: string }) {
  const t = useT();
  const [options, setOptions] = useState(["", ""]);
  const action = createPollAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="question" className="text-ink text-sm font-bold">
          {t("poll.questionLabel")}
        </label>
        <textarea
          id="question"
          name="question"
          required
          maxLength={500}
          rows={2}
          placeholder={t("poll.questionPlaceholder")}
          className="input"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink mb-1 text-sm font-bold">
          {t("poll.optionsLegend")}{" "}
          <span className="text-muted text-xs font-semibold">
            {t("poll.optionsHint")}
          </span>
        </legend>
        {options.map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name="options"
              type="text"
              required
              maxLength={200}
              aria-label={t("poll.optionAria", { number: index + 1 })}
              placeholder={t("poll.optionPlaceholder", { number: index + 1 })}
              className="input min-w-0 flex-1"
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
                aria-label={t("poll.removeOptionAria", { number: index + 1 })}
                onClick={() =>
                  setOptions((current) =>
                    current.filter((_, optionIndex) => optionIndex !== index),
                  )
                }
                className="btn btn-ghost btn-small"
              >
                {t("form.remove")}
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
            {t("poll.addOption")}
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
            {t("poll.identifiableTitle")}
          </span>
          <span className="text-muted text-xs font-semibold">
            {t("poll.identifiableDetail")}
          </span>
        </span>
      </label>

      {!state.ok ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(state.errorKey, state.errorParams)}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn w-fit">
        {pending ? (
          <>
            {t("form.creating")} <LoadingDots />
          </>
        ) : (
          t("poll.create")
        )}
      </button>
    </form>
  );
}

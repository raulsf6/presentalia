"use client";

import { useActionState, useState } from "react";

import { createQuizAction, type QuizActionResult } from "@/actions/quizzes";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: QuizActionResult = { ok: true };

export function QuizForm({ talkId }: { talkId: string }) {
  const t = useT();
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
          {t("quiz.questionLabel")}
        </label>
        <textarea
          id="question"
          name="question"
          required
          maxLength={500}
          rows={2}
          placeholder={t("quiz.questionPlaceholder")}
          className="input"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink mb-1 text-sm font-bold">
          {t("quiz.optionsLegend")}{" "}
          <span className="text-muted text-xs font-semibold">
            {t("quiz.optionsHint")}
          </span>
        </legend>
        <p className="text-muted -mt-1 mb-1 text-xs font-semibold">
          {t("quiz.correctHint")}
        </p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              value={index}
              required
              aria-label={t("quiz.correctAria", { number: index + 1 })}
              checked={correctIndex === index}
              onChange={() => setCorrectIndex(index)}
              className="accent-green size-4 shrink-0"
            />
            <input
              name="options"
              type="text"
              required
              maxLength={200}
              aria-label={t("quiz.optionAria", { number: index + 1 })}
              placeholder={t("quiz.optionPlaceholder", { number: index + 1 })}
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
                aria-label={t("quiz.removeOptionAria", {
                  number: index + 1,
                })}
                onClick={() => removeOption(index)}
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
            {t("quiz.addOption")}
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
            {t("quiz.identifiableTitle")}
          </span>
          <span className="text-muted text-xs font-semibold">
            {t("quiz.identifiableDetail")}
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
          t("quiz.create")
        )}
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitTextAnswerAction } from "@/actions/text";
import { ANSWER_MAX_LENGTH } from "@/lib/activities/text-activity";

export function TextAnswerForm({
  activityId,
  criteria,
}: {
  activityId: string;
  criteria: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const remaining = ANSWER_MAX_LENGTH - body.length;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitTextAnswerAction(activityId, body);
      if (!result.ok) {
        setError(result.error ?? "Your answer was not accepted.");
        return;
      }
      if (!result.talkId) {
        router.refresh();
        return;
      }
      router.push(`/talks/${result.talkId}/activities/${activityId}/results`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="section-label">Ranking criterion</h2>
        <p className="text-ink text-sm font-semibold">{criteria}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="answer" className="text-ink text-sm font-bold">
          Your answer
        </label>
        <textarea
          id="answer"
          name="answer"
          required
          maxLength={ANSWER_MAX_LENGTH}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write one concrete answer…"
          className="input"
        />
        <p
          className={`text-xs font-semibold ${
            remaining < 40 ? "text-red" : "text-muted"
          }`}
          aria-live="polite"
        >
          {remaining} characters left
        </p>
      </div>

      <p className="text-muted text-xs font-medium">
        Your answer is final and cannot be changed.
      </p>

      <button
        type="submit"
        disabled={!body.trim() || pending}
        className="btn w-fit"
      >
        {pending ? "Submitting…" : "Submit my answer"}
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </form>
  );
}

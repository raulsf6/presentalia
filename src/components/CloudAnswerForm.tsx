"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitCloudAnswerAction } from "@/actions/cloud";
import {
  CLOUD_IDEA_MAX_LENGTH,
  CLOUD_IDEA_MAX_WORDS,
} from "@/lib/activities/cloud-activity";

export function CloudAnswerForm({ activityId }: { activityId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitCloudAnswerAction(activityId, body);
      if (!result.ok) {
        setError(result.error ?? "Your idea was not accepted.");
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
        <label htmlFor="idea" className="text-ink text-sm font-bold">
          Your idea
        </label>
        <input
          id="idea"
          name="idea"
          type="text"
          required
          maxLength={CLOUD_IDEA_MAX_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="One short idea, e.g. faster onboarding"
          className="input"
          autoComplete="off"
        />
        <p className="text-muted text-xs font-semibold">
          One word or short phrase · up to {CLOUD_IDEA_MAX_WORDS} words
        </p>
      </div>

      <p className="text-muted text-xs font-medium">
        Your idea is final and anonymous. No names are shown.
      </p>

      <button
        type="submit"
        disabled={!body.trim() || pending}
        className="btn w-fit"
      >
        {pending ? "Sending…" : "Send my idea"}
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </form>
  );
}

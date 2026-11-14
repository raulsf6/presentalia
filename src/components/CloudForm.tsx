"use client";

import { useActionState } from "react";

import {
  createCloudActivityAction,
  type CloudActionResult,
} from "@/actions/cloud";
import { LoadingDots } from "@/components/LoadingDots";
import { CLOUD_PROMPT_MAX_LENGTH } from "@/lib/activities/cloud-activity";

const initial: CloudActionResult = { ok: true };

export function CloudForm({ talkId }: { talkId: string }) {
  const action = createCloudActivityAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-ink text-sm font-bold">
          Question
        </label>
        <textarea
          id="prompt"
          name="prompt"
          required
          maxLength={CLOUD_PROMPT_MAX_LENGTH}
          rows={2}
          placeholder="What is one thing that would make your AI agent more useful next week?"
          className="input"
        />
      </div>

      <div className="border-ink/15 bg-cream2 rounded-lg border-[2.5px] p-3">
        <p className="text-ink text-xs font-semibold">
          Attendees submit one word or short phrase. Identical ideas grow on the
          big screen as more people submit them. No names are shown.
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
            Creating… <LoadingDots />
          </>
        ) : (
          "Create idea cloud"
        )}
      </button>
    </form>
  );
}

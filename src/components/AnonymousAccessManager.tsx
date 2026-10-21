"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  setAnonymousJoinOpenAction,
  setTalkPublicAction,
} from "@/actions/anonymous-access";

type Props = {
  talkId: string;
  isPublic: boolean;
  joinOpen: boolean;
  joinUrl: string;
};

export function AnonymousAccessManager({
  talkId,
  isPublic,
  joinOpen,
  joinUrl,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "That change could not be saved.");
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-ink text-sm font-bold">Public talk</p>
          <p className="text-muted text-xs font-semibold">
            {isPublic
              ? "Anonymous people with the join link can enter a username and take part."
              : "Only invited users can access this talk."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={pending}
          onClick={() => run(() => setTalkPublicAction(talkId, !isPublic))}
        >
          {isPublic ? "Make private" : "Make public"}
        </button>
      </div>

      {isPublic ? (
        <>
          <div className="border-ink/10 flex flex-col gap-3 border-t-2 border-dashed pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-ink text-sm font-bold">Anonymous joining</p>
                <p className="text-muted text-xs font-semibold">
                  {joinOpen
                    ? "New guests can join. People already in the room stay."
                    : "New guests are turned away. People already in the room stay."}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={pending}
                onClick={() =>
                  run(() => setAnonymousJoinOpenAction(talkId, !joinOpen))
                }
              >
                {joinOpen ? "Close joining" : "Open joining"}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="section-label">Join link</span>
              <code className="text-ink/80 bg-cream2 overflow-x-auto rounded-md px-3 py-2 text-xs font-semibold">
                {joinUrl}
              </code>
            </div>
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}

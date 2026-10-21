"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setAnonymousJoinOpenAction } from "@/actions/anonymous-access";

export function AnonymousJoinToggle({
  talkId,
  joinOpen,
}: {
  talkId: string;
  joinOpen: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      const result = await setAnonymousJoinOpenAction(talkId, !joinOpen);
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={pending}
        onClick={toggle}
      >
        {joinOpen ? "Close joining" : "Open joining"}
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}

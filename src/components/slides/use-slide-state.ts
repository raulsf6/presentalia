"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { startLiveRefresh } from "@/lib/live-refresh";
import type { SlidePosition, SlideState } from "@/lib/slide-state";

export type SlideTerminal = "sign-in" | "no-access" | "missing" | null;
export type SlideStatus = "live" | "reconnecting";

const WINDOW_VISIBILITY = {
  isVisible: () => document.visibilityState === "visible",
  subscribe: (listener: () => void) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
};

/**
 * Polls the talk's slide position while the screen is visible. Responses with an
 * older revision than the newest applied one are discarded, so a slow poll
 * cannot undo a tap that already reached the server. Terminal statuses stop the
 * loop and let the screen explain what happened.
 */
export function useSlideState({
  talkId,
  initial,
  intervalMs,
  enabled = true,
}: {
  talkId: string;
  initial: SlideState;
  intervalMs: number;
  enabled?: boolean;
}): {
  state: SlideState;
  status: SlideStatus;
  terminal: SlideTerminal;
  applyPosition: (position: SlidePosition) => void;
  refresh: () => void;
} {
  const [state, setState] = useState<SlideState>(initial);
  const [status, setStatus] = useState<SlideStatus>("live");
  const [terminal, setTerminal] = useState<SlideTerminal>(null);
  const revision = useRef(initial.revision);
  const poll = useRef<() => void>(() => {});

  const applyPosition = useCallback((next: SlidePosition) => {
    if (next.revision < revision.current) {
      return;
    }
    revision.current = next.revision;
    setState((previous) => ({
      ...previous,
      slide: next.slide,
      count: next.count,
      revision: next.revision,
      activity: next.activity,
      live: next.live,
    }));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let stopped = false;
    let stopRefresh = () => {};

    function finish(reason: Exclude<SlideTerminal, null>) {
      if (stopped) {
        return;
      }
      stopped = true;
      setTerminal(reason);
      stopRefresh();
    }

    async function pollOnce() {
      if (stopped) {
        return;
      }
      try {
        const response = await fetch(`/api/talks/${talkId}/slides/state`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          finish("sign-in");
          return;
        }
        if (response.status === 403) {
          finish("no-access");
          return;
        }
        if (response.status === 404) {
          finish("missing");
          return;
        }
        if (!response.ok) {
          throw new Error(`Slide state failed (${response.status}).`);
        }

        const next = (await response.json()) as SlideState;
        if (next.revision >= revision.current) {
          revision.current = next.revision;
          setState(next);
        }
        setStatus("live");
      } catch {
        if (!stopped) {
          setStatus("reconnecting");
        }
      }
    }

    poll.current = () => void pollOnce();
    stopRefresh = startLiveRefresh({
      refresh: () => void pollOnce(),
      intervalMs,
      visibility: WINDOW_VISIBILITY,
    });

    return () => {
      stopped = true;
      stopRefresh();
    };
  }, [talkId, intervalMs, enabled]);

  return {
    state,
    status,
    terminal,
    applyPosition,
    refresh: useCallback(() => poll.current(), []),
  };
}

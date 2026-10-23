"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SlideDirection, SlideState } from "@/lib/deck/slide-state";
import { ActivityStep } from "./activity-step";
import { requestSlideMove, reportSlideCount } from "./slide-api";
import { SlideCanvas } from "./slide-canvas";
import { SlideScreenMessage } from "./slide-screen-message";
import { usePdfDocument } from "./use-pdf-document";
import { useSlideState } from "./use-slide-state";
import { useWakeLock } from "./use-wake-lock";

const POLL_MS = 300;
const CHROME_HIDE_MS = 3_000;

/**
 * The projected deck: one page at a time, full screen, no app chrome. It polls
 * the talk's position, reports the deck's page count, and accepts the laptop's
 * own arrow keys.
 */
export function PresentationDeck({
  talkId,
  talkName,
  slidesUpdatedAt,
  initial,
}: {
  talkId: string;
  talkName: string;
  slidesUpdatedAt: string | null;
  initial: SlideState;
}) {
  const hasSlides = slidesUpdatedAt !== null;
  const { state, status, terminal, applyPosition, refresh } = useSlideState({
    talkId,
    initial,
    intervalMs: POLL_MS,
    enabled: hasSlides,
  });
  const deckUpdatedAt = state.slidesUpdatedAt;
  const { pdf, error } = usePdfDocument(talkId, deckUpdatedAt);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusLabel = error
    ? "Slides unavailable"
    : status === "reconnecting"
      ? "Reconnecting"
      : null;

  useWakeLock(hasSlides && terminal === null);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      setChromeVisible(false);
    }, CHROME_HIDE_MS);
  }, []);

  useEffect(() => {
    hideTimer.current = setTimeout(() => {
      setChromeVisible(false);
    }, CHROME_HIDE_MS);
    return () => {
      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const go = useCallback(
    async (direction: SlideDirection) => {
      const result = await requestSlideMove(talkId, direction);
      if (result.ok) {
        applyPosition(result.state);
      }
    },
    [talkId, applyPosition],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // The browser may refuse outside a user gesture; the deck still works.
    }
  }, []);

  useEffect(() => {
    function sync() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = event.key;
      if (key === "f" || key === "F") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      let direction: SlideDirection | null = null;
      if (key === "ArrowRight" || key === " " || key === "PageDown") {
        direction = "next";
      } else if (key === "ArrowLeft" || key === "PageUp") {
        direction = "previous";
      }
      if (!direction) {
        return;
      }
      event.preventDefault();
      showChrome();
      void go(direction);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, showChrome, toggleFullscreen]);

  // Keep the stored page count in step with the document this screen loaded.
  useEffect(() => {
    if (!pdf) {
      return;
    }
    const count = pdf.numPages;
    if (state.count === count) {
      return;
    }

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    async function send() {
      const ok = await reportSlideCount(talkId, count);
      if (!ok && !cancelled) {
        retry = setTimeout(send, 3_000);
      }
    }
    void send();

    return () => {
      cancelled = true;
      if (retry !== null) {
        clearTimeout(retry);
      }
    };
  }, [pdf, state.count, talkId]);

  if (terminal === "sign-in") {
    return (
      <SlideScreenMessage
        tone="dark"
        title="Sign in again"
        detail="Your session ended, so the deck stopped following the talk."
      >
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </SlideScreenMessage>
    );
  }
  if (terminal === "no-access") {
    return (
      <SlideScreenMessage
        tone="dark"
        title="You no longer have access"
        detail="This talk changed hands or your role changed while it was open."
      >
        <Link href="/talks" className="btn btn-ghost">
          Back to talks
        </Link>
      </SlideScreenMessage>
    );
  }
  if (terminal === "missing") {
    return (
      <SlideScreenMessage
        tone="dark"
        title="This talk no longer exists"
        detail="It may have been deleted while the deck was open."
      >
        <Link href="/talks" className="btn btn-ghost">
          Back to talks
        </Link>
      </SlideScreenMessage>
    );
  }
  if (!hasSlides) {
    return (
      <SlideScreenMessage
        tone="dark"
        title="No slides uploaded yet"
        detail="Upload the talk's PDF in the Slides tab, then open Present again."
      >
        <Link href={`/talks/${talkId}/slides`} className="btn">
          Open Slides
        </Link>
      </SlideScreenMessage>
    );
  }

  const activity = state.activity;
  const displaySlide = pdf ? Math.min(state.slide, pdf.numPages) : state.slide;
  const counter =
    state.count === null
      ? `${displaySlide}`
      : `${displaySlide} / ${state.count}`;

  if (activity) {
    return (
      <ActivityStep
        key={`${activity.id}-${activity.status}`}
        talkId={talkId}
        activity={activity}
        counter={counter}
        fullscreen={fullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
        onNext={() => void go("next")}
        onStateChanged={refresh}
      />
    );
  }

  return (
    <main
      className={`bg-ink fixed inset-0 overflow-hidden ${
        chromeVisible ? "" : "cursor-none"
      }`}
      onPointerMove={showChrome}
      onPointerDown={showChrome}
    >
      <SlideCanvas
        pdf={pdf}
        page={displaySlide}
        mode="contain"
        className="absolute inset-0"
      />

      {!pdf ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-cream/60 text-sm font-bold tracking-[0.12em] uppercase">
            {error ? "Couldn't load the slides — retrying" : "Loading slides…"}
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-end gap-2 p-5">
        {statusLabel ? (
          <span
            role="status"
            className="border-amber/60 bg-amber/10 text-amber rounded-md border px-2 py-1 text-[0.65rem] font-bold tracking-[0.08em] uppercase"
          >
            {statusLabel}
          </span>
        ) : null}
        <div
          className={`flex w-full items-end justify-between gap-4 transition-opacity duration-300 ${
            chromeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-cream/40 max-w-[50%] truncate text-xs font-bold tracking-[0.12em] uppercase">
            {talkName}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-cream/55 font-mono text-sm tabular-nums">
              {counter}
            </span>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="border-cream/25 text-cream/70 hover:border-cream/60 hover:text-cream pointer-events-auto rounded-md border px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.08em] uppercase transition"
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

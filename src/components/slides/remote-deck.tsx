"use client";

import Link from "next/link";
import { useState } from "react";

import type { SlideDirection, SlideState } from "@/lib/slide-state";
import { requestSlideMove } from "./slide-api";
import { useWakeLock } from "./use-wake-lock";

/**
 * The phone clicker: two halves, one job each. A tap advances its own counter
 * and fires the command; it never polls and never reads the result, so it does
 * not download the deck or follow changes made on the laptop.
 */
export function RemoteDeck({
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
  const [slide, setSlide] = useState(initial.slide);
  const [count] = useState(initial.count);

  useWakeLock(hasSlides);

  const atStart = slide <= 1;
  const atEnd = count !== null && slide >= count;

  function go(direction: SlideDirection) {
    if (!hasSlides) {
      return;
    }
    const target = direction === "next" ? slide + 1 : Math.max(1, slide - 1);
    if (direction === "next" && count !== null && target > count) {
      return;
    }
    if (direction === "previous" && target < 1) {
      return;
    }

    setSlide(target);
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
    void requestSlideMove(talkId, direction);
  }

  return (
    <main className="bg-cream fixed inset-0 flex flex-col select-none">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <p className="text-ink truncate text-sm font-bold tracking-[0.02em]">
          {talkName}
        </p>
        <span className="text-muted font-mono text-sm font-bold tabular-nums">
          {count === null ? slide : `${slide} / ${count}`}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <button
          type="button"
          onClick={() => go("previous")}
          disabled={atStart || !hasSlides}
          aria-label="Previous slide"
          className="border-ink shadow-hard-md enabled:hover:shadow-hard-lg flex min-h-24 flex-1 touch-manipulation flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] bg-white text-base font-bold tracking-[0.08em] uppercase transition disabled:opacity-40 disabled:shadow-none"
        >
          <span aria-hidden className="text-4xl leading-none">
            ←
          </span>
          Back
        </button>
        <button
          type="button"
          onClick={() => go("next")}
          disabled={atEnd || !hasSlides}
          aria-label="Next slide"
          className="border-ink bg-coral shadow-hard-md enabled:hover:shadow-hard-lg flex min-h-24 flex-1 touch-manipulation flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] text-base font-bold tracking-[0.08em] uppercase transition disabled:opacity-40 disabled:shadow-none"
        >
          <span aria-hidden className="text-4xl leading-none">
            →
          </span>
          Next
        </button>
      </div>

      <footer className="flex items-center justify-between gap-3 px-4 pb-4">
        <p className="text-muted text-xs font-semibold">
          {hasSlides ? "" : "No slides uploaded yet"}
        </p>
        <Link href={`/talks/${talkId}`} className="linky">
          Back to talk
        </Link>
      </footer>
    </main>
  );
}

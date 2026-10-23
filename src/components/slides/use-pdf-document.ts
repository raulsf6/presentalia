"use client";

import { useEffect, useState } from "react";

import { loadSlideDocument, type SlideDocument } from "@/lib/deck/pdf";

const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 8_000;

type LoadedDeck = { key: string; document: SlideDocument };

/**
 * Loads the talk's PDF for the current deck and reloads it when the file is
 * replaced. Failed loads retry with backoff so a dropped connection during a
 * talk heals without a reload. A deck loaded for an older upload is never
 * returned, so a replaced file never paints stale pages.
 */
export function usePdfDocument(
  talkId: string,
  slidesUpdatedAt: string | null,
): { pdf: SlideDocument["pdf"] | null; error: boolean } {
  const key = slidesUpdatedAt === null ? null : `${talkId}:${slidesUpdatedAt}`;
  const [loaded, setLoaded] = useState<LoadedDeck | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let current: SlideDocument | null = null;

    async function load() {
      try {
        const document = await loadSlideDocument(talkId);
        if (cancelled) {
          void document.destroy();
          return;
        }
        current = document;
        setLoaded({ key: key as string, document });
        setErrorKey(null);
      } catch {
        if (cancelled) {
          return;
        }
        setErrorKey(key);
        attempt += 1;
        retry = setTimeout(
          load,
          Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS),
        );
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (retry !== undefined) {
        clearTimeout(retry);
      }
      void current?.destroy();
    };
  }, [key, talkId]);

  return {
    pdf: loaded !== null && loaded.key === key ? loaded.document.pdf : null,
    error: key !== null && errorKey === key,
  };
}

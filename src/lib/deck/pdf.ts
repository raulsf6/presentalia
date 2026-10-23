"use client";

import * as pdfjs from "pdfjs-dist";

// The bundler emits the worker as a hashed asset next to the client chunks, so
// the path is identical in dev and on Vercel and always matches this version of
// pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type { PDFDocumentProxy } from "pdfjs-dist";

export type SlideDocument = {
  pdf: pdfjs.PDFDocumentProxy;
  /** Releases the worker and the cached page data. */
  destroy: () => Promise<void>;
};

/**
 * Fetches the talk's PDF through the app's authorized download route and hands
 * the bytes to pdf.js. The route redirects to a short-lived storage URL, so the
 * document is fetched once per deck and then lives in memory.
 */
export async function loadSlideDocument(
  talkId: string,
): Promise<SlideDocument> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`/talks/${talkId}/slides/download`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Slides request failed (${response.status}).`);
    }
    const data = await response.arrayBuffer();
    const task = pdfjs.getDocument({ data });
    const pdf = await Promise.race([
      task.promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => {
            void task.destroy();
            reject(new Error("Slides took too long to load."));
          },
          { once: true },
        );
      }),
    ]);
    return { pdf, destroy: () => task.destroy() };
  } finally {
    clearTimeout(deadline);
  }
}

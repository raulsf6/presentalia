"use client";

import type { PDFPageProxy } from "pdfjs-dist";

/**
 * Renders one page onto a canvas, as large as fits inside the given box, and
 * sets the CSS size so the bitmap is not stretched. The backing store is scaled
 * by the device pixel ratio so a projected page stays sharp on a 4K display.
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number | null,
): Promise<void> {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const fit =
    maxHeight === null
      ? maxWidth / base.width
      : Math.min(maxWidth / base.width, maxHeight / base.height);
  const viewport = page.getViewport({ scale: fit * dpr });

  const cssWidth = Math.max(1, Math.round(base.width * fit));
  const cssHeight = Math.max(1, Math.round(base.height * fit));

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  await page.render({ canvas, viewport }).promise;
}

"use client";

import { useEffect, useRef, useState } from "react";

import type { PDFDocumentProxy } from "@/lib/deck/pdf";
import { renderPageToCanvas } from "./render-page";

/**
 * Paints the current page into a canvas that is only swapped in once the page
 * has finished rendering, so the previous slide stays visible instead of a
 * blank frame. "contain" fits the page inside a full-screen box; "width"
 * matches the container's width and keeps the page's own aspect ratio.
 */
export function SlideCanvas({
  pdf,
  page,
  mode,
  className = "",
}: {
  pdf: PDFDocumentProxy | null;
  page: number;
  mode: "contain" | "width";
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const visible = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = holder.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) {
        return;
      }
      setWidth(Math.floor(box.width));
      if (mode === "contain") {
        setHeight(Math.floor(box.height));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (!pdf || width === 0 || (mode === "contain" && height === 0)) {
      return;
    }

    let cancelled = false;
    const target = visible.current;
    if (!target) {
      return;
    }
    const pageNumber = Math.min(Math.max(1, page), pdf.numPages);

    (async () => {
      const rendered = await pdf.getPage(pageNumber);
      if (cancelled) {
        return;
      }
      const buffer = document.createElement("canvas");
      await renderPageToCanvas(
        rendered,
        buffer,
        width,
        mode === "contain" ? height : null,
      );
      if (cancelled) {
        return;
      }
      target.width = buffer.width;
      target.height = buffer.height;
      target.style.width = buffer.style.width;
      target.style.height = buffer.style.height;
      target.getContext("2d")?.drawImage(buffer, 0, 0);
    })().catch((error) => {
      console.error("slide canvas render failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, page, width, height, mode]);

  return (
    <div
      ref={holder}
      className={`flex items-center justify-center overflow-hidden ${className}`}
    >
      <canvas ref={visible} className="block" />
    </div>
  );
}

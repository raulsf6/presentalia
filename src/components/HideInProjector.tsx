"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides app chrome when the results page is projected for the room. The
 * results page keeps its own "Attendee view" toggle as the way back.
 */
export function HideInProjector({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  if (searchParams.get("display") === "projector") {
    return null;
  }
  return <>{children}</>;
}

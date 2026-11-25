"use client";

import { useT } from "@/components/I18nProvider";

export function AnsweredCounter({
  answered,
  attendees,
  large = false,
}: {
  answered: number;
  attendees: number;
  large?: boolean;
}) {
  const t = useT();
  return (
    <span
      aria-live="polite"
      className={`${large ? "text-lg" : "text-sm"} text-muted font-bold`}
    >
      {t(
        answered === 1
          ? "results.answeredCount.one"
          : "results.answeredCount.other",
        { answered, attendees },
      )}
    </span>
  );
}

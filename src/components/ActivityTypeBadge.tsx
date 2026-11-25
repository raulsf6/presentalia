"use client";

import { useT } from "@/components/I18nProvider";
import { ChartIcon, CloudIcon, QuizIcon, TextIcon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n/dictionaries/en";

const TYPES = {
  poll: {
    labelKey: "activity.type.poll",
    box: "bg-coral text-ink",
    Icon: ChartIcon,
  },
  quiz: {
    labelKey: "activity.type.quiz",
    box: "bg-green text-white",
    Icon: QuizIcon,
  },
  text: {
    labelKey: "activity.type.text",
    box: "bg-amber text-ink",
    Icon: TextIcon,
  },
  cloud: {
    labelKey: "activity.type.cloud",
    box: "bg-tan text-ink",
    Icon: CloudIcon,
  },
} as const satisfies Record<
  string,
  { labelKey: MessageKey; box: string; Icon: typeof ChartIcon }
>;

/**
 * The activity type as an icon tile, in the same colours as the activity
 * chooser. Used wherever the type would otherwise be a text tag.
 */
export function ActivityTypeBadge({
  type,
  size = "sm",
}: {
  type: string;
  size?: "sm" | "md" | "lg";
}) {
  const t = useT();
  const { labelKey, box, Icon } =
    TYPES[type as keyof typeof TYPES] ?? TYPES.poll;
  const label = t(labelKey);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`border-ink inline-flex shrink-0 items-center justify-center rounded ${box} ${
        size === "lg"
          ? "size-24 rounded-2xl border-[3px]"
          : size === "md"
            ? "size-7 border-[2.5px]"
            : "size-5 border-[2px]"
      }`}
    >
      <Icon
        className={
          size === "lg" ? "size-14" : size === "md" ? "size-4" : "size-3"
        }
      />
    </span>
  );
}

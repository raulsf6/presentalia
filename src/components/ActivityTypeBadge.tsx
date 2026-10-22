import { ChartIcon, QuizIcon, TextIcon } from "@/components/icons";

const TYPES = {
  poll: { label: "Poll", box: "bg-coral text-ink", Icon: ChartIcon },
  quiz: { label: "Quiz", box: "bg-green text-white", Icon: QuizIcon },
  text: { label: "Text prompt", box: "bg-amber text-ink", Icon: TextIcon },
} as const;

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
  const { label, box, Icon } = TYPES[type as keyof typeof TYPES] ?? TYPES.poll;
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

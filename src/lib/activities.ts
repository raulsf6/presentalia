export type ActivityStatus = "draft" | "active" | "closed";

export type ActivityType = "poll" | "quiz";

export type ChoiceResultsRow = {
  optionId: string;
  label: string;
  votes: number;
  percent: number;
};

export function canLaunch(status: ActivityStatus): boolean {
  return status === "draft";
}

export function canClose(status: ActivityStatus): boolean {
  return status === "active";
}

export function canVote(status: ActivityStatus): boolean {
  return status === "active";
}

export function computeResults(
  options: { id: string; label: string }[],
  counts: Record<string, number>,
): { rows: ChoiceResultsRow[]; total: number } {
  const total = options.reduce(
    (sum, option) => sum + (counts[option.id] ?? 0),
    0,
  );
  const rows = options.map((option) => {
    const votes = counts[option.id] ?? 0;
    const percent = total === 0 ? 0 : Math.round((votes / total) * 100);
    return { optionId: option.id, label: option.label, votes, percent };
  });
  return { rows, total };
}

export type ActivityStatus = "draft" | "active" | "locked" | "closed";

export type ActivityType = "poll" | "quiz" | "text";

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

/** Text answers are accepted only while the activity is active. */
export function canAcceptAnswers(status: ActivityStatus): boolean {
  return status === "active";
}

/** A text activity can be ranked from active, or retried from locked. */
export function canRank(status: ActivityStatus): boolean {
  return status === "active" || status === "locked";
}

/** Publishing every answer is also the escape hatch from a failed ranking. */
export function canPublishUnranked(status: ActivityStatus): boolean {
  return status === "active" || status === "locked";
}

/** `locked` is still live: it blocks another activity from launching. */
export function isLive(status: ActivityStatus): boolean {
  return status === "active" || status === "locked";
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

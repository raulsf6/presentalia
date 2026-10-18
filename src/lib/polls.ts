export type ActivityStatus = "draft" | "active" | "closed";

export type ActivityType = "poll";

export type PollResultsRow = {
  optionId: string;
  label: string;
  votes: number;
  percent: number;
};

export type PollResultsPayload = {
  poll: {
    id: string;
    talkId: string;
    question: string;
    status: ActivityStatus;
    resultsIdentifiable: boolean;
    closedAt: string | null;
  };
  rows: PollResultsRow[];
  total: number;
  voters: { optionId: string; email: string }[] | null;
};

const QUESTION_MAX_LENGTH = 500;
const QUESTION_MIN_LENGTH = 1;
const OPTION_LABEL_MAX_LENGTH = 200;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

export type ValidPollInput = {
  ok: true;
  question: string;
  options: string[];
  resultsIdentifiable: boolean;
};

export type InvalidPollInput = { ok: false; error: string };

export function validatePollInput(input: {
  question: string;
  options: string[];
  resultsIdentifiable?: boolean;
}): ValidPollInput | InvalidPollInput {
  const question = input.question.trim();
  if (
    question.length < QUESTION_MIN_LENGTH ||
    question.length > QUESTION_MAX_LENGTH
  ) {
    return { ok: false, error: "A poll needs a question." };
  }
  const options = input.options.map((option) => option.trim());
  if (options.length < MIN_OPTIONS) {
    return { ok: false, error: "A poll needs at least 2 answer options." };
  }
  if (options.length > MAX_OPTIONS) {
    return { ok: false, error: "A poll can have at most 8 answer options." };
  }
  if (
    options.some(
      (option) =>
        option.length === 0 || option.length > OPTION_LABEL_MAX_LENGTH,
    )
  ) {
    return { ok: false, error: "Answer options cannot be empty." };
  }
  return {
    ok: true,
    question,
    options,
    resultsIdentifiable: input.resultsIdentifiable ?? false,
  };
}

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
): { rows: PollResultsRow[]; total: number } {
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

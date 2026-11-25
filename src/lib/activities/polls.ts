import type { ActivityStatus, ActivityType } from "@/lib/activities/activities";
import type { ErrorKey } from "@/lib/i18n/dictionaries/en";

export type { ActivityStatus, ActivityType };
export {
  canClose,
  canLaunch,
  canVote,
  computeResults,
} from "@/lib/activities/activities";

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

export type InvalidPollInput = { ok: false; errorKey: ErrorKey };

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
    return { ok: false, errorKey: "errors.poll.questionRequired" };
  }
  const options = input.options.map((option) => option.trim());
  if (options.length < MIN_OPTIONS) {
    return { ok: false, errorKey: "errors.poll.minOptions" };
  }
  if (options.length > MAX_OPTIONS) {
    return { ok: false, errorKey: "errors.poll.maxOptions" };
  }
  if (
    options.some(
      (option) =>
        option.length === 0 || option.length > OPTION_LABEL_MAX_LENGTH,
    )
  ) {
    return { ok: false, errorKey: "errors.poll.emptyOption" };
  }
  return {
    ok: true,
    question,
    options,
    resultsIdentifiable: input.resultsIdentifiable ?? false,
  };
}

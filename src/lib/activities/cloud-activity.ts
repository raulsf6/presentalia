import type { ErrorKey, MessageParams } from "@/lib/i18n/dictionaries/en";

export const CLOUD_PROMPT_MAX_LENGTH = 500;
export const CLOUD_IDEA_MAX_LENGTH = 60;
export const CLOUD_IDEA_MAX_WORDS = 5;

/** The projector stays readable in very large rooms. */
export const CLOUD_DISPLAY_LIMIT = 120;

export type ValidCloudActivityInput = {
  ok: true;
  prompt: string;
};

export type InvalidCloudActivityInput = { ok: false; errorKey: ErrorKey };

export function validateCloudActivityInput(input: {
  prompt: string;
}): ValidCloudActivityInput | InvalidCloudActivityInput {
  const prompt = input.prompt.trim();
  if (prompt.length < 1 || prompt.length > CLOUD_PROMPT_MAX_LENGTH) {
    return { ok: false, errorKey: "errors.cloud.promptRequired" };
  }
  return { ok: true, prompt };
}

/** The displayed form of an idea: trimmed, single-spaced, edge punctuation gone. */
export function displayCloudIdea(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/^[.,!?;:"'“”‘’()[\]{}…—–]+|[.,!?;:"'“”‘’()[\]{}…—–]+$/gu, "")
    .trim();
}

/** Grouping key: case-insensitive but otherwise the displayed phrase. */
export function cloudIdeaKey(raw: string): string {
  return displayCloudIdea(raw).toLowerCase();
}

export type ValidCloudIdea = { ok: true; body: string };
export type InvalidCloudIdea = {
  ok: false;
  errorKey: ErrorKey;
  errorParams?: MessageParams;
};

export function validateCloudIdea(
  raw: string,
): ValidCloudIdea | InvalidCloudIdea {
  const body = displayCloudIdea(raw);
  if (body.length === 0) {
    return { ok: false, errorKey: "errors.cloud.ideaRequired" };
  }
  if (body.length > CLOUD_IDEA_MAX_LENGTH) {
    return {
      ok: false,
      errorKey: "errors.cloud.ideaTooLong",
      errorParams: { max: CLOUD_IDEA_MAX_LENGTH },
    };
  }
  const words = body.split(" ");
  if (words.length > CLOUD_IDEA_MAX_WORDS) {
    return {
      ok: false,
      errorKey: "errors.cloud.ideaTooManyWords",
      errorParams: { max: CLOUD_IDEA_MAX_WORDS },
    };
  }
  return { ok: true, body };
}

export type CloudIdeaEntry = {
  id: string;
  body: string;
  createdAt: Date;
};

export type CloudItem = {
  key: string;
  label: string;
  count: number;
};

/**
 * Groups identical ideas and orders them for display. The label comes from the
 * first submission; ties keep submission order so live updates do not reshuffle
 * unrelated words.
 */
export function buildCloudItems(entries: CloudIdeaEntry[]): CloudItem[] {
  const groups = new Map<
    string,
    { label: string; count: number; firstIndex: number }
  >();

  entries.forEach((entry, index) => {
    const label = displayCloudIdea(entry.body);
    if (!label) {
      return;
    }
    const key = label.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    groups.set(key, { label, count: 1, firstIndex: index });
  });

  return [...groups.entries()]
    .sort(
      ([leftKey, left], [rightKey, right]) =>
        right.count - left.count ||
        left.firstIndex - right.firstIndex ||
        leftKey.localeCompare(rightKey),
    )
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: group.count,
    }));
}

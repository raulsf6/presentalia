const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedEmails = {
  valid: string[];
  invalid: string[];
  duplicates: string[];
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim());
}

function dedupeTokens(tokens: string[]): ParsedEmails {
  const valid = new Set<string>();
  const duplicates = new Set<string>();
  const invalid: string[] = [];
  for (const token of tokens) {
    if (!validateEmail(token)) {
      invalid.push(token);
      continue;
    }
    const email = normalizeEmail(token);
    if (valid.has(email)) {
      duplicates.add(email);
      continue;
    }
    valid.add(email);
  }
  return { valid: [...valid], invalid, duplicates: [...duplicates] };
}

/**
 * Parses free-form attendee input: one address per line, or separated by
 * commas/semicolons. Invalid tokens keep their raw (trimmed) text so the UI
 * can show exactly what was rejected; duplicates within the input are
 * reported once, normalized.
 */
export function parseEmailList(text: string): ParsedEmails {
  const tokens = text
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  return dedupeTokens(tokens);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0) || rows.length === 0) {
    rows.push(row);
  }
  if (rows[0]?.[0]?.startsWith("\uFEFF")) {
    rows[0][0] = rows[0][0].slice(1);
  }
  return rows;
}

/**
 * Parses pasted CSV content. If the first row has a cell equal to "email"
 * (case-insensitive, quotes allowed) that column is used and the row is
 * treated as a header; otherwise the first column is used and every row is
 * data. Blank lines and blank cells are skipped; invalid cells keep their
 * raw text.
 */
export function parseCsv(text: string): ParsedEmails {
  const rows = parseCsvRows(text);
  let emailIndex = 0;
  let startRow = 0;
  if (rows.length > 0) {
    const headerIndex = rows[0].findIndex(
      (cell) => cell.toLowerCase() === "email",
    );
    if (headerIndex !== -1) {
      emailIndex = headerIndex;
      startRow = 1;
    }
  }
  const tokens: string[] = [];
  for (const row of rows.slice(startRow)) {
    const cell = row[emailIndex] ?? "";
    if (cell.length > 0) {
      tokens.push(cell);
    }
  }
  return dedupeTokens(tokens);
}

export function mergeRoster(
  existing: string[],
  incoming: string[],
): { toAdd: string[]; alreadyPresent: string[] } {
  const existingSet = new Set(existing.map((email) => normalizeEmail(email)));
  const toAdd: string[] = [];
  const alreadyPresent: string[] = [];
  for (const email of incoming) {
    const normalized = normalizeEmail(email);
    if (existingSet.has(normalized)) {
      alreadyPresent.push(normalized);
    } else {
      toAdd.push(normalized);
    }
  }
  return { toAdd, alreadyPresent };
}

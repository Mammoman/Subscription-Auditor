import Papa from "papaparse";

export interface ParsedRow {
  date: Date;
  merchantRaw: string;
  amount: number;
}

export interface SkippedRow {
  line: number;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: SkippedRow[];
}

/** Pick the first matching header key from a row, case-insensitively. */
function pick(
  row: Record<string, string>,
  candidates: string[]
): string | undefined {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === cand);
    if (match) return row[match];
  }
  return undefined;
}

/**
 * Parse a bank-export CSV (headers: date, description, amount).
 * Tolerant of common header aliases. Rows with an unparseable date or a
 * non-positive/non-numeric amount are collected in `skipped` with a reason;
 * negative amounts (refunds/credits) are treated as non-charges and skipped.
 */
export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];

  parsed.data.forEach((raw, index) => {
    const line = index + 2; // +1 for header, +1 for 1-based

    const dateStr = pick(raw, ["date", "transaction date", "posted date"]);
    const merchant = pick(raw, ["description", "merchant", "name", "payee"]);
    const amountStr = pick(raw, ["amount", "debit", "value"]);

    if (!dateStr || !merchant || amountStr === undefined) {
      skipped.push({ line, reason: "missing date, description, or amount" });
      return;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      skipped.push({ line, reason: `invalid date "${dateStr}"` });
      return;
    }

    const amount = parseFloat(String(amountStr).replace(/[$,\s]/g, ""));
    if (!isFinite(amount)) {
      skipped.push({ line, reason: `invalid amount "${amountStr}"` });
      return;
    }
    if (amount <= 0) {
      skipped.push({ line, reason: "non-charge (credit/refund or zero)" });
      return;
    }

    rows.push({ date, merchantRaw: merchant.trim(), amount });
  });

  return { rows, skipped };
}

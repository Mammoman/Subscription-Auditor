import Papa from "papaparse";

export type Direction = "debit" | "credit";

export interface ParsedRow {
  date: Date;
  merchantRaw: string;
  amount: number; // positive magnitude
  direction: Direction; // debit = money out, credit = money in
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
 * Parse a monetary amount, stripping currency symbols (₦, $, £, €), thousands
 * separators, and whitespace. Returns null when there is no parseable number.
 */
function parseAmount(raw: string): number | null {
  const cleaned = String(raw)
    .replace(/[₦$£€,\s]/g, "")
    .replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

interface Valid {
  line: number;
  date: Date;
  merchantRaw: string;
  amount: number; // signed as it appeared in the file
}

/**
 * Parse a bank-export CSV (headers: date, description, amount; aliases tolerated).
 *
 * Handles both sign conventions automatically: some banks export purchases as
 * positive numbers, others as negative (debits). We detect the dominant sign
 * across the file and treat that side as charges, normalizing every charge to a
 * positive magnitude. Rows on the opposite side (refunds/credits/deposits),
 * zero amounts, and unparseable rows are collected in `skipped` with a reason.
 */
export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const valid: Valid[] = [];
  const skipped: SkippedRow[] = [];

  parsed.data.forEach((raw, index) => {
    const line = index + 2; // +1 header, +1 for 1-based

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

    const amount = parseAmount(amountStr);
    if (amount === null) {
      skipped.push({ line, reason: `invalid amount "${amountStr}"` });
      return;
    }

    valid.push({ line, date, merchantRaw: merchant.trim(), amount });
  });

  // Detect which sign represents charges. If negatives dominate, the export
  // uses negative debits; otherwise charges are the positive amounts.
  const negatives = valid.filter((v) => v.amount < 0).length;
  const positives = valid.filter((v) => v.amount > 0).length;
  const chargeSign: 1 | -1 = negatives > positives ? -1 : 1;

  const rows: ParsedRow[] = [];
  for (const v of valid) {
    if (v.amount === 0) {
      skipped.push({ line: v.line, reason: "zero amount" });
      continue;
    }
    // Debit = the dominant "charge" sign (money out); the opposite is a credit
    // (money in) — kept, not skipped, so both can be shown and toggled.
    const direction: Direction =
      Math.sign(v.amount) === chargeSign ? "debit" : "credit";
    rows.push({
      date: v.date,
      merchantRaw: v.merchantRaw,
      amount: Math.abs(v.amount),
      direction,
    });
  }

  skipped.sort((a, b) => a.line - b.line);
  return { rows, skipped };
}

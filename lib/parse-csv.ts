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
 * Handles three sign conventions automatically:
 *  1. Single signed `amount` column, positives = charges (most common).
 *  2. Single signed `amount` column, negatives = charges (some UK/EU banks).
 *  3. Separate `debit` and `credit` columns — common in Nigerian bank exports
 *     (GTBank, Access Bank, UBA). In this case direction is read directly from
 *     whichever column has a non-zero value; the sign heuristic is skipped.
 *
 * Rows on the credit side (refunds/deposits), zero amounts, and unparseable
 * rows are collected in `skipped` with a reason.
 */
export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  // ── two-column path ───────────────────────────────────────────────────────
  // Detect whether the CSV has separate Debit and Credit columns. We check the
  // header row, since either column may be empty on any given data row.
  const headers = parsed.meta.fields ?? [];
  const debitHeader = headers.find((h) =>
    ["debit", "withdrawal", "dr"].includes(h.trim().toLowerCase())
  );
  const creditHeader = headers.find((h) =>
    ["credit", "deposit", "cr"].includes(h.trim().toLowerCase())
  );
  const hasTwoColumns = Boolean(debitHeader && creditHeader);

  if (hasTwoColumns) {
    const rows: ParsedRow[] = [];
    const skipped: SkippedRow[] = [];

    parsed.data.forEach((raw, index) => {
      const line = index + 2;

      const dateStr = pick(raw, ["date", "transaction date", "posted date", "value date"]);
      const merchant = pick(raw, ["description", "merchant", "name", "payee", "narration", "details", "particulars"]);

      if (!dateStr || !merchant) {
        skipped.push({ line, reason: "missing date or description" });
        return;
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        skipped.push({ line, reason: `invalid date "${dateStr}"` });
        return;
      }

      const debitRaw = debitHeader ? raw[debitHeader] : "";
      const creditRaw = creditHeader ? raw[creditHeader] : "";
      const debitAmt = parseAmount(debitRaw ?? "");
      const creditAmt = parseAmount(creditRaw ?? "");

      // A row must have exactly one non-null, non-zero amount.
      const hasDebit = debitAmt !== null && debitAmt > 0;
      const hasCredit = creditAmt !== null && creditAmt > 0;

      if (!hasDebit && !hasCredit) {
        skipped.push({ line, reason: "no debit or credit amount found" });
        return;
      }

      const direction: Direction = hasDebit ? "debit" : "credit";
      const amount = hasDebit ? debitAmt! : creditAmt!;

      rows.push({ date, merchantRaw: merchant.trim(), amount, direction });
    });

    skipped.sort((a, b) => a.line - b.line);
    return { rows, skipped };
  }

  // ── single-column path ────────────────────────────────────────────────────
  const valid: Valid[] = [];
  const skipped: SkippedRow[] = [];

  parsed.data.forEach((raw, index) => {
    const line = index + 2; // +1 header, +1 for 1-based

    const dateStr = pick(raw, ["date", "transaction date", "posted date", "value date"]);
    const merchant = pick(raw, ["description", "merchant", "name", "payee", "narration", "details", "particulars"]);
    const amountStr = pick(raw, ["amount", "value"]);

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

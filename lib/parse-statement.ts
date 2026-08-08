import { ParsedRow, SkippedRow, ParseResult } from "./parse-csv";

/**
 * Best-effort parser for text extracted from a PDF bank statement.
 *
 * Bank statements have no standard layout, so this is heuristic: for each line
 * we look for a leading date and one or more money amounts. When a line has two
 * or more amounts we treat the last as the running balance and the previous as
 * the transaction amount. Lines marked as credits (CR) are kept with
 * direction="credit"; all other amounts are treated as debits (money out).
 * Amounts are normalized to positive magnitudes, matching the CSV importer's
 * output.
 *
 * Limitations (surfaced to the user): amounts must show 2 decimals; ambiguous
 * DD/MM vs MM/DD dates are read day-first (international/Nigerian convention);
 * lines without a recognizable date are ignored.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

interface DateHit {
  match: string;
  date: Date;
}

function toYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  return isNaN(d.getTime()) ? null : d;
}

/** Find the first recognizable date on a line, returning its text + Date. */
export function findDate(line: string): DateHit | null {
  // ISO: 2025-01-05
  let m = line.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const d = makeDate(+m[1], +m[2], +m[3]);
    if (d) return { match: m[0], date: d };
  }

  // Slash/dash numeric, day-first: 05/01/2025, 5-1-25
  m = line.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    let day = +m[1];
    let month = +m[2];
    // If the first number can't be a day but the second can, it's MM/DD.
    if (day > 12 && month <= 12) {
      // already day-first and valid
    } else if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    const d = makeDate(toYear(+m[3]), month, day);
    if (d) return { match: m[0], date: d };
  }

  // 05 Jan 2025  /  5 January 2025
  m = line.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{2,4})\b/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) {
      const d = makeDate(toYear(+m[3]), mo, +m[1]);
      if (d) return { match: m[0], date: d };
    }
  }

  // Jan 5, 2025  /  January 5 2025
  m = line.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) {
      const d = makeDate(+m[3], mo, +m[2]);
      if (d) return { match: m[0], date: d };
    }
  }

  return null;
}

// Money tokens: optional sign/paren/symbol, grouped digits, REQUIRED 2 decimals,
// optional trailing CR/DR marker.
const AMOUNT_RE =
  /[-(]?\s*[₦$£€]?\s*\d{1,3}(?:,\d{3})*\.\d{2}\)?(?:\s*(?:CR|DR)\b)?/gi;

interface MoneyHit {
  match: string;
  value: number; // positive magnitude
  isCredit: boolean;
}

function parseMoney(token: string): MoneyHit {
  const isCredit =
    /\bCR\b/i.test(token) || (/^\s*\(/.test(token) && /\)\s*$/.test(token));
  const num = parseFloat(token.replace(/[^0-9.]/g, ""));
  return { match: token, value: num, isCredit };
}

/** Extract transaction rows from raw statement text. */
export function parseStatementText(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const dateHit = findDate(line);
    if (!dateHit) return; // not a transaction line (header, address, etc.)

    const amounts = [...line.matchAll(AMOUNT_RE)].map((mm) => mm[0]);
    if (amounts.length === 0) {
      skipped.push({ line: index + 1, reason: "date found but no amount" });
      return;
    }

    // With 2+ amounts, the last is the running balance; the previous is the txn.
    const txnToken = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
    const money = parseMoney(txnToken);

    if (!isFinite(money.value) || money.value <= 0) {
      skipped.push({ line: index + 1, reason: "unparseable amount" });
      return;
    }

    // Description = the line with the date and every amount stripped out.
    let desc = line.replace(dateHit.match, " ");
    for (const a of amounts) desc = desc.replace(a, " ");
    desc = desc.replace(/\b(CR|DR)\b/gi, " ").replace(/\s+/g, " ").trim();

    // Credits (CR / parenthesized) are money in; everything else is money out.
    rows.push({
      date: dateHit.date,
      merchantRaw: desc || "Statement transaction",
      amount: money.value,
      direction: money.isCredit ? "credit" : "debit",
    });
  });

  return { rows, skipped };
}

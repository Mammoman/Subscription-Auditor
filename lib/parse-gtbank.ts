import { ParsedRow, SkippedRow, ParseResult } from "./parse-csv";

/**
 * Parser for GTBank ("GTCrea8" / Guaranty Trust) statements. The Debits and
 * Credits columns collapse in extracted text, leaving one amount + a running
 * balance, so direction is derived from whether the balance went up (credit) or
 * down (debit). The counterparty lives in the free-text Remarks.
 */

export function looksLikeGtbank(text: string): boolean {
  return (
    /GTCrea8|GUARANTY TRUST|Originating Branch/i.test(text) &&
    /Debits\s+Credits\s+Balance/i.test(text)
  );
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseGtDate(s: string): Date | null {
  const m = s.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const mo = MONTHS[m[2].toLowerCase()];
  if (mo === undefined) return null;
  return new Date(Date.UTC(+m[3], mo, +m[1]));
}

/** Best-effort clean merchant / counterparty from GTBank remarks. */
function cleanRemark(remark: string): string {
  // Strip the leading originating-branch code + name (e.g. "635 AKIN ADESOLA ").
  const r = remark
    .replace(/\s+/g, " ")
    .replace(/^\d{1,4}\s+[A-Z][A-Za-z]*\s+[A-Z][A-Za-z]*\s+/, "")
    .trim();
  let m = r.match(/NIP TRANSFER TO\s+[A-Z0-9]+\s*-\s*([A-Z][A-Za-z '.\/]+)/i);
  if (m) return "Transfer to " + m[1].trim();
  m = r.match(/TRF TO\s+[A-Z0-9]+\s+([A-Z][A-Za-z ]+?)-/i);
  if (m) return "Transfer to " + m[1].trim();
  m = r.match(/TRANSFER FROM\s+([A-Za-z][A-Za-z '.]+?)\s*-/i);
  if (m) return "Transfer from " + m[1].trim();
  if (/POS PUR|POS PURCHASE|via POS/i.test(r)) return "POS purchase";
  if (/STAMP DUT/i.test(r)) return "Stamp duty";
  if (/NELFUND|UPKEEP|NEFT/i.test(r)) return "NELFUND upkeep";
  if (/AIRTIME|DATA/i.test(r)) return "Airtime / Data";
  // Fallback: first few words of the remark.
  return r.split(" ").slice(0, 5).join(" ") || "GTBank transaction";
}

export function parseGtbank(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];

  const openingMatch = text.match(/Opening Balance\s+([\d,]+\.\d{2})/i);
  let prevBalance = openingMatch
    ? parseFloat(openingMatch[1].replace(/,/g, ""))
    : 0;

  // Start after the first column header; drop repeated headers at page breaks.
  let body = text;
  const headerRe = /Trans\.\s*Date Value Date Reference Debits Credits Balance Originating Branch Remarks/gi;
  const firstHeader = body.search(headerRe);
  if (firstHeader >= 0) body = body.slice(firstHeader);
  body = body.replace(headerRe, " ");

  // Records start at the trans-date + value-date pair (avoids splitting on the
  // value date and creating an empty half-record).
  const marks = [...body.matchAll(/\d{2}-[A-Za-z]{3}-\d{4}\s+\d{2}-[A-Za-z]{3}-\d{4}/g)];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index ?? 0;
    const end = i + 1 < marks.length ? marks[i + 1].index ?? body.length : body.length;
    const record = body.slice(start, end).replace(/\s+/g, " ").trim();

    const date = parseGtDate(record);
    if (!date) continue;

    // First decimal pair in the record = amount, running balance.
    const pair = record.match(/([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
    if (!pair) {
      skipped.push({ line: i + 1, reason: "no amount/balance" });
      continue;
    }
    const amount = parseFloat(pair[1].replace(/,/g, ""));
    const balance = parseFloat(pair[2].replace(/,/g, ""));
    if (!isFinite(amount) || amount <= 0) {
      skipped.push({ line: i + 1, reason: "unparseable amount" });
      continue;
    }

    // Direction from balance movement.
    const direction: "debit" | "credit" = balance >= prevBalance ? "credit" : "debit";
    prevBalance = balance;

    // Remarks = everything after the amount/balance pair.
    const afterIdx = (pair.index ?? 0) + pair[0].length;
    const remark = record.slice(afterIdx);

    rows.push({
      date,
      merchantRaw: cleanRemark(remark),
      amount,
      direction,
    });
  }

  return { rows, skipped };
}

import { ParsedRow, SkippedRow, ParseResult } from "./parse-csv";

/**
 * Parser for OPay wallet statements. Records begin with a transaction datetime
 * (`DD Mon YYYY HH:MM:SS`) and carry separate Debit/Credit columns (one shown
 * as `--`), so direction comes from which column is filled — not a CR/DR marker.
 * Descriptions can wrap across lines and are pipe-delimited.
 */

const RECORD_START = /(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+\d{2}:\d{2}:\d{2}/g;
// The money block: "(-- amount | amount --) balance"; one side is always "--".
const MONEY = /(?:--\s+([\d,]+\.\d{2})|([\d,]+\.\d{2})\s+--)\s+([\d,]+\.\d{2})/;

/**
 * OPay internal wallet churn — these are bookkeeping moves between the user's
 * own OPay wallet and OWealth savings, not real spending. Filtering them out
 * prevents inflated totals. Matched against the raw record text (before
 * description cleaning) because some descriptions get truncated.
 */
const INTERNAL_CHURN =
  /\b(auto[- ]?save|owealth|wallet top[- ]?up|wallet funding|cashback|bonus|referral reward|interest (credit|earned))\b/i;

export function looksLikeOpay(text: string): boolean {
  return (
    /OWealth|Wallet Account|OPay/i.test(text) &&
    /Debit\(₦\)|Credit\(₦\)|Balance After/i.test(text)
  );
}

/** Turn a noisy OPay description into a clean merchant / counterparty label. */
function cleanDescription(desc: string): string {
  const d = desc.replace(/\s+/g, " ").trim();
  // Transfers: keep "Transfer to/from NAME" so the engine can read the name.
  if (/transfer\s+(to|from)/i.test(d)) {
    return d.split("|")[0].trim();
  }
  // Pipe-delimited (Airtime | num | MTN, OPay Card Payment | Spotify, Betting |
  // num | SPORTYBET): the merchant is the last name-like segment.
  if (d.includes("|")) {
    const segs = d.split("|").map((s) => s.trim()).filter(Boolean);
    const names = segs.filter((s) => /[A-Za-z]{2,}/.test(s) && !/^\d[\d*]*$/.test(s));
    return names[names.length - 1] || segs[0];
  }
  return d;
}

export function parseOpay(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];

  const marks = [...text.matchAll(RECORD_START)];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index ?? 0;
    const end = i + 1 < marks.length ? marks[i + 1].index ?? text.length : text.length;
    const record = text.slice(start, end).replace(/\s+/g, " ").trim();

    const date = new Date(marks[i][1]);
    if (isNaN(date.getTime())) continue;

    // Skip OPay internal wallet shuffles before parsing amounts.
    if (INTERNAL_CHURN.test(record)) {
      skipped.push({ line: i + 1, reason: "internal OPay wallet churn (auto-save/OWealth)" });
      continue;
    }

    const money = record.match(MONEY);
    if (!money) {
      skipped.push({ line: i + 1, reason: "no debit/credit amounts" });
      continue;
    }

    const creditAmt = money[1];
    const debitAmt = money[2];
    const direction: "debit" | "credit" = debitAmt ? "debit" : "credit";
    const amount = parseFloat((debitAmt ?? creditAmt).replace(/,/g, ""));
    if (!isFinite(amount) || amount <= 0) {
      skipped.push({ line: i + 1, reason: "unparseable amount" });
      continue;
    }

    // Description sits between the value date and the money block.
    const moneyIdx = record.indexOf(money[0]);
    let desc = record.slice(0, moneyIdx);
    desc = desc.replace(
      /^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+\d{2}\s+[A-Za-z]{3}\s+\d{4}\s*/,
      ""
    );

    rows.push({
      date,
      merchantRaw: cleanDescription(desc) || "OPay transaction",
      amount,
      direction,
    });
  }

  return { rows, skipped };
}

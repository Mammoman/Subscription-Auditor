import { Txn } from "./types";

export interface TransferRecipient {
  recipient: string; // display name
  count: number;
  totalSent: number;
  avgSent: number;
  firstSent: Date;
  lastSent: Date;
}

// Words that mark a line as a transfer (not a merchant charge). Kept specific
// to avoid catching normal purchases: bank-transfer verbs + Nigerian rails.
const TRANSFER_HINT =
  /\b(transfer|trf|xfer|p2p|nip|neft|imps|remittance|sent|send money)\b/i;
const SENT_TO = /\b(?:transfer|trf|xfer|sent|payment|paid)\s+to\b/i;

// Tokens that are never a person's name (banks, rails, noise).
const NOT_A_NAME =
  /\b(nip|trf|xfer|neft|imps|gtb|gtbank|uba|access|zenith|firstbank|fbn|opay|kuda|palmpay|moniepoint|wema|fcmb|sterling|union|polaris|stanbic|mobile|bank|transfer|ref|vnuban|nuban|web|ussd|app|to|from|payment)\b/i;

export function isTransfer(merchantRaw: string): boolean {
  return TRANSFER_HINT.test(merchantRaw) || SENT_TO.test(merchantRaw);
}

function titleCaseName(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 40);
}

/** Best-effort recipient extraction from a transfer description. */
export function extractRecipient(merchantRaw: string): string {
  // Slash-delimited rails, e.g. "NIP/GTB/JOHN DOE/REF123" — pick the segment
  // that best resembles a person's name.
  if (merchantRaw.includes("/")) {
    const nameSeg = merchantRaw
      .split("/")
      .map((x) => x.trim())
      .filter(
        (x) =>
          /^[A-Za-z][A-Za-z .'-]{2,}$/.test(x) &&
          x.trim().split(/\s+/).every((w) => !NOT_A_NAME.test(w))
      )
      .sort((a, b) => b.length - a.length)[0];
    if (nameSeg) return titleCaseName(nameSeg);
  }

  // "... to JOHN DOE ..." patterns.
  const m = merchantRaw.match(
    /\b(?:to)\s+([A-Za-z][A-Za-z .'-]{2,}?)(?:\s+\d|\s+ref\b|$)/i
  );
  if (m) return titleCaseName(m[1]);

  // Fallback: strip rails/keywords/refs and keep the remaining name words.
  const cleaned = merchantRaw
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOT_A_NAME.test(w))
    .join(" ")
    .trim();
  return cleaned ? titleCaseName(cleaned) : "Unknown recipient";
}

/** A stable grouping key so "JOHN DOE" and "John  Doe" merge. */
export function recipientKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Aggregate every transfer transaction by recipient: how many times you sent
 * them money and how much in total. Sorted by total sent, descending.
 */
export function buildTransfers(txns: Txn[]): TransferRecipient[] {
  const groups = new Map<string, { name: string; txns: Txn[] }>();

  for (const t of txns) {
    if (!isTransfer(t.merchantRaw)) continue;
    const name = extractRecipient(t.merchantRaw);
    const key = recipientKey(name);
    const g = groups.get(key);
    if (g) g.txns.push(t);
    else groups.set(key, { name, txns: [t] });
  }

  const recipients: TransferRecipient[] = [];
  for (const { name, txns: group } of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const totalSent = sorted.reduce((sum, t) => sum + t.amount, 0);
    recipients.push({
      recipient: name,
      count: sorted.length,
      totalSent,
      avgSent: totalSent / sorted.length,
      firstSent: sorted[0].date,
      lastSent: sorted[sorted.length - 1].date,
    });
  }

  return recipients.sort((a, b) => b.totalSent - a.totalSent);
}

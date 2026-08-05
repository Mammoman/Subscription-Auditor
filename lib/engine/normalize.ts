/**
 * Collapse a raw bank-statement merchant string down to a canonical key.
 * Bank descriptions are noisy: card processor prefixes (SQ *, TST*, PayPal),
 * phone numbers, store/reference numbers, URLs, and trailing state codes all
 * decorate the same underlying merchant. We strip that noise and keep a stable
 * head token so every variant of "Netflix" maps to "netflix".
 */
export function normalizeMerchant(raw: string): string {
  let s = raw.toLowerCase();

  // Processor prefixes, e.g. "sq *", "tst*", "paypal *", "pp*"
  s = s.replace(/\b(sq|tst|pp|sp|paypal|pos|dd|ext|chkcard)\b\s*\*+/g, " ");
  s = s.replace(/\*+/g, " ");

  // Phone numbers like 866-579-7172 or 8005551212
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, " ");

  // URLs / TLDs
  s = s.replace(/\b(https?:\/\/)?(www\.)?/g, " ");
  s = s.replace(/\.(com|net|org|io|co|app|tv)\b/g, " ");

  // Store / reference numbers: "#4471", "store 221", bare digit runs,
  // and alphanumeric refs like "p1a2b3".
  s = s.replace(/#\s*\w+/g, " ");
  s = s.replace(/\bstore\s*\d+/g, " ");
  s = s.replace(/\b[a-z]?\d{2,}[a-z0-9]*\b/g, " ");
  s = s.replace(/\b\d+\b/g, " ");

  // Punctuation -> space
  s = s.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  // Drop a trailing 2-letter state code (e.g. "netflix ca").
  const tokens = s.split(" ").filter(Boolean);
  if (tokens.length > 1 && /^[a-z]{2}$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  // Canonical key = the leading brand token.
  return tokens[0] ?? s;
}

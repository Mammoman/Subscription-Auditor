/**
 * Mono (mono.co) provider adapter — connect real Nigerian bank accounts.
 *
 * This is dormant until MONO_SECRET_KEY is configured. It turns Mono
 * transactions into the same `{ date, merchantRaw, amount, category }` rows the
 * CSV importer produces, so the detection engine runs unchanged.
 *
 * NOTE: verify endpoint/field names against the current Mono docs before going
 * live — Mono has both v1 and v2 APIs. Amounts come back in KOBO (1/100 naira).
 */

const MONO_BASE = "https://api.withmono.com/v2";

export interface MonoImportRow {
  date: Date;
  merchantRaw: string;
  amount: number; // naira, positive charge magnitude
  category?: string;
}

interface MonoTxn {
  id: string;
  amount: number; // kobo
  date: string;
  narration: string;
  type: "debit" | "credit";
  category?: string;
  currency?: string;
}

function secretKey(): string {
  const key = process.env.MONO_SECRET_KEY;
  if (!key) throw new Error("MONO_SECRET_KEY is not configured");
  return key;
}

/** True when the Mono integration is configured (server side). */
export function isMonoConfigured(): boolean {
  return Boolean(process.env.MONO_SECRET_KEY);
}

/** Exchange the Connect widget's short-lived `code` for a reusable account id. */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(`${MONO_BASE}/accounts/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mono-sec-key": secretKey(),
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    throw new Error(`Mono auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.id as string; // account id
}

/**
 * Fetch transactions for an account and map them into importer rows.
 * Keeps only debits (charges), converts kobo → naira.
 */
export async function fetchMonoTransactions(
  accountId: string
): Promise<MonoImportRow[]> {
  const res = await fetch(
    `${MONO_BASE}/accounts/${accountId}/transactions?paginate=false`,
    { headers: { "mono-sec-key": secretKey() } }
  );
  if (!res.ok) {
    throw new Error(`Mono transactions failed: ${res.status} ${await res.text()}`);
  }
  const { data }: { data: MonoTxn[] } = await res.json();

  return data
    .filter((t) => t.type === "debit")
    .map((t) => ({
      date: new Date(t.date),
      merchantRaw: t.narration,
      amount: t.amount / 100,
      category: t.category,
    }));
}

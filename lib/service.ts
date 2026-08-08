import { prisma } from "./db";
import { buildSubscriptions } from "./engine/analyze";
import {
  buildTransfers,
  buildAccounts,
  isTransfer,
  extractRecipient,
  TransferRecipient,
  AccountSummary,
} from "./engine/transfers";
import { normalizeMerchant } from "./engine/normalize";
import { Subscription, Txn } from "./engine/types";
import type { Direction } from "./parse-csv";

export interface ImportRow {
  date: Date;
  merchantRaw: string;
  amount: number;
  category?: string;
  direction?: Direction; // defaults to debit (money out)
}

export interface ImportResult {
  imported: number;
  duplicates: number;
}

/** Dedup key: same day + merchant + amount + direction => the same entry. */
function dedupeKey(
  date: Date,
  merchantNormalized: string,
  amount: number,
  direction: string
): string {
  return `${date.toISOString().slice(0, 10)}|${merchantNormalized}|${amount}|${direction}`;
}

/**
 * Insert transactions, skipping any that duplicate an existing active row or an
 * earlier row in the same batch. This makes re-importing a statement (or an
 * overlapping one) idempotent instead of double-counting.
 */
export async function importTransactions(
  rows: ImportRow[]
): Promise<ImportResult> {
  const existing = await prisma.transaction.findMany({
    where: { status: "active" },
    select: { date: true, merchantNormalized: true, amount: true, direction: true },
  });
  const seen = new Set(
    existing.map((e) =>
      dedupeKey(e.date, e.merchantNormalized, e.amount, e.direction)
    )
  );

  const toInsert: {
    date: Date;
    merchantRaw: string;
    merchantNormalized: string;
    amount: number;
    category?: string;
    direction: string;
  }[] = [];
  let duplicates = 0;

  for (const r of rows) {
    const merchantNormalized = normalizeMerchant(r.merchantRaw);
    const direction = r.direction ?? "debit";
    const key = dedupeKey(r.date, merchantNormalized, r.amount, direction);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    toInsert.push({
      date: r.date,
      merchantRaw: r.merchantRaw,
      merchantNormalized,
      amount: r.amount,
      category: r.category,
      direction,
    });
  }

  if (toInsert.length > 0) {
    await prisma.transaction.createMany({ data: toInsert });
  }
  return { imported: toInsert.length, duplicates };
}

export interface SummaryUpcoming {
  merchant: string;
  date: string;
  amount: number;
  cadence: string;
}

export interface Summary {
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
  transactionCount: number;
  zombieCount: number;
  zombieMonthlyWaste: number;
  zombieAnnualWaste: number;
  priceHikeCount: number;
  transferCount: number;
  transferRecipientCount: number;
  totalTransferred: number;
  timeline: { month: string; total: number }[];
  byCategory: { category: string; total: number }[];
  upcoming: SummaryUpcoming[];
}

type ActiveRow = Txn & { direction: Direction };

/**
 * OPay (and similar fintech wallets) generate internal bookkeeping entries for
 * auto-save, OWealth deposits/withdrawals, cashback, and bonuses. These are not
 * real spending — they inflate totals and create phantom "subscriptions". We
 * filter them out at the service layer so all downstream logic (subscriptions,
 * transfers, summaries) sees only real transactions.
 */
const INTERNAL_CHURN =
  /\b(auto[- ]?save|owealth|wallet top[- ]?up|wallet funding|cashback|bonus|referral reward|interest (credit|earned))\b/i;

function isInternalChurn(merchantRaw: string): boolean {
  return INTERNAL_CHURN.test(merchantRaw);
}

/** Load non-cancelled transactions from the DB, keeping their direction. */
async function loadActiveRows(): Promise<ActiveRow[]> {
  const rows = await prisma.transaction.findMany({
    where: { status: "active" },
  });
  return rows
    .map((r) => ({
      id: r.id,
      date: r.date,
      merchantRaw: r.merchantRaw,
      amount: r.amount,
      category: r.category ?? undefined,
      direction: (r.direction === "credit" ? "credit" : "debit") as Direction,
    }))
    .filter((r) => !isInternalChurn(r.merchantRaw));
}

/** Only outgoing (debit) transactions feed subscription & transfer detection. */
function debitsOnly(rows: ActiveRow[]): Txn[] {
  return rows.filter((r) => r.direction === "debit");
}

export interface TransactionRow {
  id: string;
  date: string; // ISO
  merchant: string;
  amount: number;
  category: string | null;
  isTransfer: boolean;
  direction: Direction;
  account: string | null; // counterparty name for transfer rows
}

/** Every imported transaction, newest first — the raw itemized ledger. */
export async function getTransactions(): Promise<TransactionRow[]> {
  const rows = await loadActiveRows();
  return rows
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((t) => {
      const transfer = isTransfer(t.merchantRaw);
      return {
        id: t.id,
        date: t.date.toISOString(),
        merchant: t.merchantRaw,
        amount: round2(t.amount),
        category: t.category ?? null,
        isTransfer: transfer,
        direction: t.direction,
        account: transfer ? extractRecipient(t.merchantRaw) : null,
      };
    });
}

/** People/accounts you've moved money with — sent and received, both ways. */
export async function getAccounts(): Promise<AccountSummary[]> {
  const rows = await loadActiveRows();
  return buildAccounts(rows.filter((r) => isTransfer(r.merchantRaw)));
}

/** Split transactions into person-to-person transfers and merchant charges. */
function classify(txns: Txn[]): { charges: Txn[]; transfers: Txn[] } {
  const charges: Txn[] = [];
  const transfers: Txn[] = [];
  for (const t of txns) {
    (isTransfer(t.merchantRaw) ? transfers : charges).push(t);
  }
  return { charges, transfers };
}

export async function getSubscriptions(
  now: Date = new Date()
): Promise<Subscription[]> {
  const { charges } = classify(debitsOnly(await loadActiveRows()));
  return buildSubscriptions(charges, now);
}

export async function getTransfers(): Promise<TransferRecipient[]> {
  const { transfers } = classify(debitsOnly(await loadActiveRows()));
  return buildTransfers(transfers);
}

export async function getSummary(now: Date = new Date()): Promise<Summary> {
  const rows = await loadActiveRows();
  const debits = debitsOnly(rows);
  const { charges, transfers } = classify(debits);
  const subs = buildSubscriptions(charges, now);
  const recipients = buildTransfers(transfers);

  const activeSubs = subs;
  const zombies = subs.filter((s) => s.isZombie);

  const monthlyTotal = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);
  const zombieMonthlyWaste = zombies.reduce((sum, s) => sum + s.monthlyCost, 0);
  const priceHikeCount = activeSubs.reduce(
    (sum, s) => sum + s.priceHikes.length,
    0
  );
  const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);

  // Spend timeline: money out (debits) by calendar month.
  const timelineMap = new Map<string, number>();
  for (const t of debits) {
    const key = `${t.date.getFullYear()}-${String(
      t.date.getMonth() + 1
    ).padStart(2, "0")}`;
    timelineMap.set(key, (timelineMap.get(key) ?? 0) + t.amount);
  }
  const timeline = [...timelineMap.entries()]
    .map(([month, total]) => ({ month, total: round2(total) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Category breakdown from subscriptions' monthly cost.
  const catMap = new Map<string, number>();
  for (const s of activeSubs) {
    catMap.set(s.category, (catMap.get(s.category) ?? 0) + s.monthlyCost);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  // Upcoming renewals within 45 days.
  const horizon = new Date(now.getTime() + 45 * 86_400_000);
  const upcoming: SummaryUpcoming[] = activeSubs
    .filter((s) => s.nextRenewal >= now && s.nextRenewal <= horizon)
    .sort((a, b) => a.nextRenewal.getTime() - b.nextRenewal.getTime())
    .map((s) => ({
      merchant: s.merchant,
      date: s.nextRenewal.toISOString(),
      amount: round2(s.avgAmount),
      cadence: s.cadence,
    }));

  return {
    monthlyTotal: round2(monthlyTotal),
    annualTotal: round2(monthlyTotal * 12),
    activeCount: activeSubs.length,
    transactionCount: rows.length,
    zombieCount: zombies.length,
    zombieMonthlyWaste: round2(zombieMonthlyWaste),
    zombieAnnualWaste: round2(zombieMonthlyWaste * 12),
    priceHikeCount,
    transferCount: transfers.length,
    transferRecipientCount: recipients.length,
    totalTransferred: round2(totalTransferred),
    timeline,
    byCategory,
    upcoming,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

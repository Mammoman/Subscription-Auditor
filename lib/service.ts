import { prisma } from "./db";
import { buildSubscriptions } from "./engine/analyze";
import { buildTransfers, isTransfer, TransferRecipient } from "./engine/transfers";
import { normalizeMerchant } from "./engine/normalize";
import { Subscription, Txn } from "./engine/types";

export interface ImportRow {
  date: Date;
  merchantRaw: string;
  amount: number;
  category?: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
}

/** Dedup key: same day + normalized merchant + amount => the same charge. */
function dedupeKey(date: Date, merchantNormalized: string, amount: number): string {
  return `${date.toISOString().slice(0, 10)}|${merchantNormalized}|${amount}`;
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
    select: { date: true, merchantNormalized: true, amount: true },
  });
  const seen = new Set(
    existing.map((e) => dedupeKey(e.date, e.merchantNormalized, e.amount))
  );

  const toInsert: {
    date: Date;
    merchantRaw: string;
    merchantNormalized: string;
    amount: number;
    category?: string;
  }[] = [];
  let duplicates = 0;

  for (const r of rows) {
    const merchantNormalized = normalizeMerchant(r.merchantRaw);
    const key = dedupeKey(r.date, merchantNormalized, r.amount);
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

/** Load non-cancelled transactions from the DB as engine Txns. */
async function loadActiveTxns(): Promise<Txn[]> {
  const rows = await prisma.transaction.findMany({
    where: { status: "active" },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    merchantRaw: r.merchantRaw,
    amount: r.amount,
    category: r.category ?? undefined,
  }));
}

export interface TransactionRow {
  id: string;
  date: string; // ISO
  merchant: string;
  amount: number;
  category: string | null;
  isTransfer: boolean;
}

/** Every imported transaction, newest first — the raw itemized ledger. */
export async function getTransactions(): Promise<TransactionRow[]> {
  const txns = await loadActiveTxns();
  return txns
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      merchant: t.merchantRaw,
      amount: round2(t.amount),
      category: t.category ?? null,
      isTransfer: isTransfer(t.merchantRaw),
    }));
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
  const { charges } = classify(await loadActiveTxns());
  return buildSubscriptions(charges, now);
}

export async function getTransfers(): Promise<TransferRecipient[]> {
  const { transfers } = classify(await loadActiveTxns());
  return buildTransfers(transfers);
}

export async function getSummary(now: Date = new Date()): Promise<Summary> {
  const txns = await loadActiveTxns();
  const { charges, transfers } = classify(txns);
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

  // Spend timeline: sum of ALL transactions by calendar month.
  const timelineMap = new Map<string, number>();
  for (const t of txns) {
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
    transactionCount: txns.length,
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

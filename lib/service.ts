import { prisma } from "./db";
import { buildSubscriptions } from "./engine/analyze";
import { Subscription, Txn } from "./engine/types";

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

export async function getSubscriptions(
  now: Date = new Date()
): Promise<Subscription[]> {
  const txns = await loadActiveTxns();
  return buildSubscriptions(txns, now);
}

export async function getSummary(now: Date = new Date()): Promise<Summary> {
  const txns = await loadActiveTxns();
  const subs = buildSubscriptions(txns, now);

  const activeSubs = subs;
  const zombies = subs.filter((s) => s.isZombie);

  const monthlyTotal = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);
  const zombieMonthlyWaste = zombies.reduce((sum, s) => sum + s.monthlyCost, 0);
  const priceHikeCount = activeSubs.reduce(
    (sum, s) => sum + s.priceHikes.length,
    0
  );

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
    timeline,
    byCategory,
    upcoming,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

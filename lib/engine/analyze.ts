import {
  Txn,
  Cadence,
  PriceHike,
  PricePoint,
  Subscription,
  PERIOD_DAYS,
  MS_PER_DAY,
} from "./types";
import { groupByMerchant, detectCadence } from "./cadence";

/** Percentage jump required before we call it a real price hike (ignore rounding). */
const HIKE_THRESHOLD_PCT = 3;

/** Find upward price changes across a merchant's charges over time. */
export function detectPriceHikes(group: Txn[]): PriceHike[] {
  if (group.length < 2) return [];
  const sorted = [...group].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const hikes: PriceHike[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].amount;
    const curr = sorted[i].amount;
    if (prev <= 0) continue;
    const pct = ((curr - prev) / prev) * 100;
    if (pct >= HIKE_THRESHOLD_PCT) {
      hikes.push({
        fromAmount: prev,
        toAmount: curr,
        pctChange: pct,
        date: sorted[i].date,
      });
    }
  }
  return hikes;
}

/**
 * Score how likely a subscription is a forgotten "zombie" (0..100).
 * Signals: dormancy (how many billing periods since the last charge relative
 * to what we'd expect) and cost weight (pricier forgotten subs matter more).
 */
export function scoreZombie(input: {
  lastSeen: Date;
  now: Date;
  cadence: Cadence;
  monthlyCost: number;
}): { score: number; isZombie: boolean } {
  const period = PERIOD_DAYS[input.cadence];
  const daysSince = (input.now.getTime() - input.lastSeen.getTime()) / MS_PER_DAY;
  const periodsSince = daysSince / period;

  // Dormancy dominates; a sub that missed >1 expected charge is suspicious.
  const dormancy = Math.min(1, Math.max(0, (periodsSince - 1) / 3)); // 0 at 1 period, 1 at 4
  const costWeight = Math.min(1, input.monthlyCost / 40); // pricier = more waste

  const score = Math.round(dormancy * 80 + costWeight * 20);
  const isZombie = periodsSince > 2 || score >= 60;

  return { score, isZombie };
}

function titleCase(key: string): string {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Top-level engine entry point. Groups transactions by merchant, keeps only the
 * groups that form a recurring cadence, and derives a Subscription for each with
 * cost normalization, next-renewal projection, price hikes, and zombie scoring.
 */
export function buildSubscriptions(
  txns: Txn[],
  now: Date = new Date()
): Subscription[] {
  const groups = groupByMerchant(txns);
  const subs: Subscription[] = [];

  for (const [merchant, group] of groups) {
    const cadenceResult = detectCadence(group);
    if (!cadenceResult) continue;

    const { cadence, confidence } = cadenceResult;
    const period = PERIOD_DAYS[cadence];
    const sorted = [...group].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const amounts = sorted.map((t) => t.amount);
    const avgAmount =
      amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const firstSeen = sorted[0].date;
    const lastSeen = sorted[sorted.length - 1].date;
    const nextRenewal = new Date(lastSeen.getTime() + period * MS_PER_DAY);

    const periodsPerMonth = 30 / period;
    const monthlyCost = avgAmount * periodsPerMonth;
    const annualCost = monthlyCost * 12;

    const priceHikes = detectPriceHikes(sorted);
    const { score, isZombie } = scoreZombie({
      lastSeen,
      now,
      cadence,
      monthlyCost,
    });

    const history: PricePoint[] = sorted.map((t) => ({
      date: t.date,
      amount: t.amount,
    }));

    subs.push({
      merchant: titleCase(merchant),
      cadence,
      confidence,
      avgAmount,
      currency: "USD",
      category: sorted[sorted.length - 1].category ?? "Other",
      firstSeen,
      lastSeen,
      nextRenewal,
      monthlyCost,
      annualCost,
      zombieScore: score,
      isZombie,
      priceHikes,
      history,
      txnCount: sorted.length,
    });
  }

  // Sort: zombies first (most waste), then by monthly cost.
  return subs.sort((a, b) => {
    if (a.isZombie !== b.isZombie) return a.isZombie ? -1 : 1;
    return b.monthlyCost - a.monthlyCost;
  });
}

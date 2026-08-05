import { Txn, Cadence, PERIOD_DAYS, MS_PER_DAY } from "./types";
import { normalizeMerchant } from "./normalize";

const PERIODS = Object.entries(PERIOD_DAYS) as [Cadence, number][];
const TOLERANCE = 0.25; // ±25% of the period counts as "on schedule"

/** Group transactions by their normalized merchant key. */
export function groupByMerchant(txns: Txn[]): Map<string, Txn[]> {
  const groups = new Map<string, Txn[]>();
  for (const t of txns) {
    const key = normalizeMerchant(t.merchantRaw);
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }
  return groups;
}

/**
 * Determine whether a merchant's charges follow a regular cadence.
 * Returns the best-fitting cadence with a 0..1 confidence, or null when the
 * charges are too few or too irregular to be a subscription.
 */
export function detectCadence(
  group: Txn[]
): { cadence: Cadence; confidence: number } | null {
  if (group.length < 3) return null;

  const times = group
    .map((t) => t.date.getTime())
    .sort((a, b) => a - b);
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / MS_PER_DAY);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  let best: { cadence: Cadence; confidence: number } | null = null;

  for (const [cadence, period] of PERIODS) {
    const onSchedule = gaps.filter(
      (g) => Math.abs(g - period) / period <= TOLERANCE
    ).length;
    const fraction = onSchedule / gaps.length;
    if (fraction < 0.6) continue;

    const closeness = 1 - Math.min(1, Math.abs(avgGap - period) / period);
    const confidence = fraction * 0.7 + closeness * 0.3;

    if (!best || confidence > best.confidence) {
      best = { cadence, confidence };
    }
  }

  return best;
}

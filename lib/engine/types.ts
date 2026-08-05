export type Cadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

/** A single normalized transaction fed into the engine. */
export interface Txn {
  id: string;
  date: Date;
  merchantRaw: string;
  amount: number; // positive = a charge
  category?: string;
}

/** A detected price increase between two consecutive charges. */
export interface PriceHike {
  fromAmount: number;
  toAmount: number;
  pctChange: number; // e.g. 30 means +30%
  date: Date; // date of the higher charge
}

/** A single amount observed at a point in time (for sparklines). */
export interface PricePoint {
  date: Date;
  amount: number;
}

/** A derived recurring subscription. */
export interface Subscription {
  merchant: string;
  cadence: Cadence;
  confidence: number; // 0..1
  avgAmount: number;
  currency: string; // "USD" for v1
  category: string;
  firstSeen: Date;
  lastSeen: Date;
  nextRenewal: Date;
  monthlyCost: number;
  annualCost: number;
  zombieScore: number; // 0..100
  isZombie: boolean;
  priceHikes: PriceHike[];
  history: PricePoint[];
  txnCount: number;
}

/** Number of days in each cadence period. */
export const PERIOD_DAYS: Record<Cadence, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

export const MS_PER_DAY = 86_400_000;

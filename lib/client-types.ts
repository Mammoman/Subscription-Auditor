import { Summary } from "./service";

export type { Summary };

export interface PriceHikeDTO {
  fromAmount: number;
  toAmount: number;
  pctChange: number;
  date: string;
}

export interface PricePointDTO {
  date: string;
  amount: number;
}

/** A transfer recipient as serialized over the API (Dates become ISO strings). */
export interface TransferRecipientDTO {
  recipient: string;
  count: number;
  totalSent: number;
  avgSent: number;
  firstSent: string;
  lastSent: string;
}

/** Subscription as serialized over the API (Dates become ISO strings). */
export interface SubscriptionDTO {
  merchant: string;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";
  confidence: number;
  avgAmount: number;
  currency: string;
  category: string;
  firstSeen: string;
  lastSeen: string;
  nextRenewal: string;
  monthlyCost: number;
  annualCost: number;
  zombieScore: number;
  isZombie: boolean;
  priceHikes: PriceHikeDTO[];
  history: PricePointDTO[];
  txnCount: number;
}

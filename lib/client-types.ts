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

/** A single transaction row as serialized over the API. */
export interface TransactionDTO {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string | null;
  isTransfer: boolean;
  direction: "debit" | "credit";
  account: string | null;
}

/** An account/person you've moved money with (both directions). */
export interface AccountSummaryDTO {
  account: string;
  sentCount: number;
  sentTotal: number;
  receivedCount: number;
  receivedTotal: number;
  net: number;
  lastActivity: string;
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

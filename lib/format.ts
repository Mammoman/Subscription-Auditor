export type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

/** Supported display currencies. Locale drives the correct symbol + grouping. */
export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", label: "Euro", locale: "en-IE" },
  GBP: { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },
  NGN: { code: "NGN", symbol: "₦", label: "Nigerian Naira", locale: "en-NG" },
};

/**
 * Stored transaction amounts are treated as this base currency; the selector
 * converts from here to the chosen display currency.
 */
export const BASE_CURRENCY: CurrencyCode = "USD";

export type Rates = Record<CurrencyCode, number>;

/**
 * Offline fallback exchange rates (units of the currency per 1 USD). These are
 * approximate and get replaced by live rates at runtime when available.
 */
export const FALLBACK_RATES: Rates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550,
};

/** Convert an amount between currencies using USD-based rates. */
export function convertAmount(
  amount: number,
  rates: Rates,
  to: CurrencyCode,
  from: CurrencyCode = BASE_CURRENCY
): number {
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  return (amount / fromRate) * toRate;
}

export function formatCurrency(
  n: number,
  currency: CurrencyCode = "USD",
  opts: { cents?: boolean } = {}
): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.USD;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(n);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(ym: string): string {
  // ym is "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Human relative time, e.g. "in 4 days", "2 months ago". */
export function relativeTime(d: Date | string, now: Date = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffDays = Math.round(
    (date.getTime() - now.getTime()) / 86_400_000
  );
  const abs = Math.abs(diffDays);
  const fmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 1) return "today";
  if (abs < 30) return fmt.format(diffDays, "day");
  if (abs < 365) return fmt.format(Math.round(diffDays / 30), "month");
  return fmt.format(Math.round(diffDays / 365), "year");
}

export function cadenceLabel(cadence: string): string {
  return (
    {
      weekly: "Weekly",
      biweekly: "Biweekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annual: "Annual",
    }[cadence] ?? cadence
  );
}

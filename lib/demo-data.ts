import { PERIOD_DAYS, MS_PER_DAY, Cadence } from "./engine/types";

export interface DemoTxn {
  date: Date;
  merchantRaw: string;
  amount: number;
  category: string;
}

interface RecurringSpec {
  merchantRaw: string;
  category: string;
  cadence: Cadence;
  amount: number;
  /** How many months before `now` the sub started. */
  startMonthsAgo: number;
  /** How many months before `now` the last charge landed (for zombies). */
  endMonthsAgo?: number;
  /** Optional price hike partway through: { afterCharge, newAmount }. */
  hike?: { afterCharge: number; newAmount: number };
}

const RECURRING: RecurringSpec[] = [
  // Active streaming with a price hike
  { merchantRaw: "NETFLIX.COM 866-579-7172 CA", category: "Streaming", cadence: "monthly", amount: 15.49, startMonthsAgo: 13, hike: { afterCharge: 7, newAmount: 17.99 } },
  // Active streaming with a price hike (second hike case)
  { merchantRaw: "DISNEY PLUS", category: "Streaming", cadence: "monthly", amount: 7.99, startMonthsAgo: 12, hike: { afterCharge: 6, newAmount: 10.99 } },
  // Active music
  { merchantRaw: "SPOTIFY P1A2B3", category: "Music", cadence: "monthly", amount: 10.99, startMonthsAgo: 13 },
  // Active annual
  { merchantRaw: "AMAZON PRIME*RT4K AMZN.COM WA", category: "Shopping", cadence: "annual", amount: 139.0, startMonthsAgo: 26 },
  // Active weekly meal kit
  { merchantRaw: "SQ *HELLOFRESH", category: "Food", cadence: "weekly", amount: 62.5, startMonthsAgo: 3 },
  // Active quarterly service
  { merchantRaw: "DROPBOX*QUARTERLY", category: "Software", cadence: "quarterly", amount: 29.99, startMonthsAgo: 12 },
  // Active software
  { merchantRaw: "ADOBE *CREATIVE CLOUD 408-536-6000 CA", category: "Software", cadence: "monthly", amount: 54.99, startMonthsAgo: 10 },
  // Active software (cheap)
  { merchantRaw: "ICLOUD+ APPLE.COM/BILL", category: "Software", cadence: "monthly", amount: 2.99, startMonthsAgo: 13 },
  // Active news
  { merchantRaw: "NYTIMES*NYTIMES.COM NY", category: "Other", cadence: "monthly", amount: 17.0, startMonthsAgo: 9 },

  // ZOMBIE 1: unused gym, stopped 4 months ago
  { merchantRaw: "PLANET FITNESS #882 844-880-7180 NH", category: "Fitness", cadence: "monthly", amount: 24.99, startMonthsAgo: 12, endMonthsAgo: 4 },
  // ZOMBIE 2: trial-turned-paid SaaS, stopped 5 months ago
  { merchantRaw: "NOTION LABS INC", category: "Software", cadence: "monthly", amount: 12.0, startMonthsAgo: 11, endMonthsAgo: 5 },
  // ZOMBIE 3: magazine, stopped 6 months ago
  { merchantRaw: "AUDIBLE*AB12CD 888-283-5051 NJ", category: "Other", cadence: "monthly", amount: 14.95, startMonthsAgo: 14, endMonthsAgo: 6 },
  // ZOMBIE 4 (bonus): a forgotten VPN, stopped 3 months ago
  { merchantRaw: "NORDVPN NORDVPN.COM", category: "Software", cadence: "monthly", amount: 11.99, startMonthsAgo: 10, endMonthsAgo: 3 },
];

// One-off purchases that must NOT be detected as subscriptions.
const ONE_OFFS: { merchantRaw: string; category: string; amount: number; monthsAgo: number; day: number }[] = [
  { merchantRaw: "WHOLE FOODS MKT #123", category: "Food", amount: 84.23, monthsAgo: 1, day: 3 },
  { merchantRaw: "SHELL OIL 57442310", category: "Utilities", amount: 51.1, monthsAgo: 1, day: 9 },
  { merchantRaw: "UBER *TRIP HELP.UBER.COM", category: "Other", amount: 23.4, monthsAgo: 2, day: 14 },
  { merchantRaw: "BEST BUY #221", category: "Shopping", amount: 349.99, monthsAgo: 3, day: 21 },
  { merchantRaw: "DELTA AIR 0062317654321", category: "Other", amount: 412.2, monthsAgo: 4, day: 2 },
  { merchantRaw: "CHIPOTLE 2245", category: "Food", amount: 18.75, monthsAgo: 1, day: 19 },
  { merchantRaw: "TARGET T-1899", category: "Shopping", amount: 96.4, monthsAgo: 2, day: 27 },
  { merchantRaw: "HOME DEPOT #6512", category: "Shopping", amount: 142.6, monthsAgo: 5, day: 6 },
  { merchantRaw: "STARBUCKS 800-782-7282", category: "Food", amount: 7.85, monthsAgo: 1, day: 11 },
  { merchantRaw: "CVS/PHARMACY #04012", category: "Other", amount: 32.19, monthsAgo: 3, day: 16 },
];

// Person-to-person transfers (recipients you've sent money to repeatedly).
const TRANSFERS: {
  merchantRaw: string;
  amount: number;
  monthsAgo: number;
  day: number;
}[] = [
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 150, monthsAgo: 11, day: 4 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 200, monthsAgo: 9, day: 12 },
  { merchantRaw: "NIP/GTB/JOHN DOE/REF4471", amount: 120, monthsAgo: 7, day: 8 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 300, monthsAgo: 5, day: 19 },
  { merchantRaw: "TRF/JOHN DOE/LAG", amount: 90, monthsAgo: 3, day: 22 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 175, monthsAgo: 1, day: 6 },
  { merchantRaw: "NIP/UBA/AMAKA OKAFOR/REF9920", amount: 60, monthsAgo: 10, day: 2 },
  { merchantRaw: "TRF/AMAKA OKAFOR/ABJ", amount: 80, monthsAgo: 6, day: 14 },
  { merchantRaw: "TRANSFER TO AMAKA OKAFOR", amount: 45, monthsAgo: 2, day: 27 },
  { merchantRaw: "TRANSFER TO MUSA BELLO", amount: 500, monthsAgo: 8, day: 9 },
  { merchantRaw: "NIP/ACCESS/MUSA BELLO/REF1180", amount: 250, monthsAgo: 4, day: 16 },
  { merchantRaw: "TRANSFER TO CHIDI EZE", amount: 40, monthsAgo: 3, day: 11 },
];

function subMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Generate a realistic demo dataset relative to `now`. Guarantees (verified by
 * lib/demo-data.test.ts): >= 8 subscriptions, >= 3 zombies, >= 2 price hikes,
 * plus one-off noise that must not be mistaken for subscriptions.
 */
export function generateDemoTransactions(now: Date = new Date()): DemoTxn[] {
  const txns: DemoTxn[] = [];

  for (const spec of RECURRING) {
    const period = PERIOD_DAYS[spec.cadence];
    const start = subMonths(now, spec.startMonthsAgo);
    const end = spec.endMonthsAgo ? subMonths(now, spec.endMonthsAgo) : now;

    let charge = 0;
    for (
      let t = start.getTime();
      t <= end.getTime();
      t += period * MS_PER_DAY
    ) {
      let amount = spec.amount;
      if (spec.hike && charge >= spec.hike.afterCharge) {
        amount = spec.hike.newAmount;
      }
      txns.push({
        date: new Date(t),
        merchantRaw: spec.merchantRaw,
        amount,
        category: spec.category,
      });
      charge++;
    }
  }

  for (const o of ONE_OFFS) {
    const d = subMonths(now, o.monthsAgo);
    d.setDate(o.day);
    txns.push({
      date: d,
      merchantRaw: o.merchantRaw,
      amount: o.amount,
      category: o.category,
    });
  }

  for (const tr of TRANSFERS) {
    const d = subMonths(now, tr.monthsAgo);
    d.setDate(tr.day);
    txns.push({
      date: d,
      merchantRaw: tr.merchantRaw,
      amount: tr.amount,
      category: "Transfer",
    });
  }

  return txns.sort((a, b) => a.date.getTime() - b.date.getTime());
}

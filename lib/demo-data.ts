import { PERIOD_DAYS, MS_PER_DAY, Cadence } from "./engine/types";

export interface DemoTxn {
  date: Date;
  merchantRaw: string;
  amount: number;
  category: string;
  direction?: "debit" | "credit";
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

// Amounts are in Naira (the app's base currency).
const RECURRING: RecurringSpec[] = [
  // Active streaming with a price hike
  { merchantRaw: "NETFLIX.COM 866-579-7172 CA", category: "Streaming", cadence: "monthly", amount: 4400, startMonthsAgo: 13, hike: { afterCharge: 7, newAmount: 5000 } },
  // Active streaming with a price hike (second hike case)
  { merchantRaw: "SHOWMAX SUBSCRIPTION", category: "Streaming", cadence: "monthly", amount: 3200, startMonthsAgo: 12, hike: { afterCharge: 6, newAmount: 4400 } },
  // Active music
  { merchantRaw: "SPOTIFY P1A2B3", category: "Music", cadence: "monthly", amount: 1300, startMonthsAgo: 13 },
  // Active annual
  { merchantRaw: "AMAZON PRIME*RT4K AMZN.COM WA", category: "Shopping", cadence: "annual", amount: 66000, startMonthsAgo: 26 },
  // Active weekly meal service (Eden Life is a Nigerian subscription service)
  { merchantRaw: "SQ *EDEN LIFE MEALS", category: "Food", cadence: "weekly", amount: 25000, startMonthsAgo: 3 },
  // Active quarterly service
  { merchantRaw: "DROPBOX*QUARTERLY", category: "Software", cadence: "quarterly", amount: 19500, startMonthsAgo: 12 },
  // Active software
  { merchantRaw: "ADOBE *CREATIVE CLOUD 408-536-6000 CA", category: "Software", cadence: "monthly", amount: 33000, startMonthsAgo: 10 },
  // Active software (cheap)
  { merchantRaw: "ICLOUD+ APPLE.COM/BILL", category: "Software", cadence: "monthly", amount: 1300, startMonthsAgo: 13 },
  // Active TV
  { merchantRaw: "DSTV COMPACT PLUS", category: "Streaming", cadence: "monthly", amount: 25000, startMonthsAgo: 9 },

  // ZOMBIE 1: unused gym (i-Fitness is a Nigerian chain), stopped 4 months ago
  { merchantRaw: "I-FITNESS LEKKI LAG", category: "Fitness", cadence: "monthly", amount: 20000, startMonthsAgo: 12, endMonthsAgo: 4 },
  // ZOMBIE 2: trial-turned-paid SaaS, stopped 5 months ago
  { merchantRaw: "NOTION LABS INC", category: "Software", cadence: "monthly", amount: 11000, startMonthsAgo: 11, endMonthsAgo: 5 },
  // ZOMBIE 3: audiobook sub, stopped 6 months ago
  { merchantRaw: "AUDIBLE*AB12CD 888-283-5051", category: "Other", cadence: "monthly", amount: 6000, startMonthsAgo: 14, endMonthsAgo: 6 },
  // ZOMBIE 4: a forgotten VPN, stopped 3 months ago
  { merchantRaw: "NORDVPN NORDVPN.COM", category: "Software", cadence: "monthly", amount: 4500, startMonthsAgo: 10, endMonthsAgo: 3 },
];

// One-off purchases that must NOT be detected as subscriptions.
const ONE_OFFS: { merchantRaw: string; category: string; amount: number; monthsAgo: number; day: number }[] = [
  { merchantRaw: "SHOPRITE LEKKI LAG", category: "Food", amount: 42300, monthsAgo: 1, day: 3 },
  { merchantRaw: "TOTAL FILLING STN VI", category: "Utilities", amount: 25000, monthsAgo: 1, day: 9 },
  { merchantRaw: "BOLT RIDE LAGOS", category: "Other", amount: 4800, monthsAgo: 2, day: 14 },
  { merchantRaw: "SLOT SYSTEMS IKEJA", category: "Shopping", amount: 385000, monthsAgo: 3, day: 21 },
  { merchantRaw: "AIR PEACE 0062317654321", category: "Other", amount: 210000, monthsAgo: 4, day: 2 },
  { merchantRaw: "CHICKEN REPUBLIC VI", category: "Food", amount: 6500, monthsAgo: 1, day: 19 },
  { merchantRaw: "JUMIA NG ORDER", category: "Shopping", amount: 58000, monthsAgo: 2, day: 27 },
  { merchantRaw: "SPAR SUPERMARKET LEKKI", category: "Shopping", amount: 33400, monthsAgo: 5, day: 6 },
  { merchantRaw: "CAFE NEO VICTORIA IS", category: "Food", amount: 3200, monthsAgo: 1, day: 11 },
  { merchantRaw: "MEDPLUS PHARMACY", category: "Other", amount: 12900, monthsAgo: 3, day: 16 },
];

// Person-to-person transfers (recipients you've sent money to repeatedly).
const TRANSFERS: {
  merchantRaw: string;
  amount: number;
  monthsAgo: number;
  day: number;
}[] = [
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 50000, monthsAgo: 11, day: 4 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 75000, monthsAgo: 9, day: 12 },
  { merchantRaw: "NIP/GTB/JOHN DOE/REF4471", amount: 40000, monthsAgo: 7, day: 8 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 120000, monthsAgo: 5, day: 19 },
  { merchantRaw: "TRF/JOHN DOE/LAG", amount: 25000, monthsAgo: 3, day: 22 },
  { merchantRaw: "TRANSFER TO JOHN DOE", amount: 60000, monthsAgo: 1, day: 6 },
  { merchantRaw: "NIP/UBA/AMAKA OKAFOR/REF9920", amount: 20000, monthsAgo: 10, day: 2 },
  { merchantRaw: "TRF/AMAKA OKAFOR/ABJ", amount: 35000, monthsAgo: 6, day: 14 },
  { merchantRaw: "TRANSFER TO AMAKA OKAFOR", amount: 15000, monthsAgo: 2, day: 27 },
  { merchantRaw: "TRANSFER TO MUSA BELLO", amount: 200000, monthsAgo: 8, day: 9 },
  { merchantRaw: "NIP/ACCESS/MUSA BELLO/REF1180", amount: 90000, monthsAgo: 4, day: 16 },
  { merchantRaw: "TRANSFER TO CHIDI EZE", amount: 15000, monthsAgo: 3, day: 11 },
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

  // Incoming transfers (money received from people) — the other direction.
  const INCOMING: { merchantRaw: string; amount: number; monthsAgo: number; day: number }[] = [
    { merchantRaw: "TRANSFER FROM JOHN DOE", amount: 200, monthsAgo: 8, day: 10 },
    { merchantRaw: "NIP/GTB/JOHN DOE/REF7781", amount: 120, monthsAgo: 4, day: 17 },
    { merchantRaw: "TRANSFER FROM AMAKA OKAFOR", amount: 75, monthsAgo: 6, day: 5 },
    { merchantRaw: "TRANSFER FROM MUSA BELLO", amount: 300, monthsAgo: 2, day: 23 },
  ];
  for (const inc of INCOMING) {
    const d = subMonths(now, inc.monthsAgo);
    d.setDate(inc.day);
    txns.push({
      date: d,
      merchantRaw: inc.merchantRaw,
      amount: inc.amount,
      category: "Transfer",
      direction: "credit",
    });
  }

  // Monthly salary credits (money in) so the credit/debit toggle has data.
  for (let m = 13; m >= 0; m--) {
    const d = subMonths(now, m);
    d.setDate(25);
    if (d <= now) {
      txns.push({
        date: d,
        merchantRaw: "SALARY PAYMENT ACME LTD",
        amount: 850000,
        category: "Income",
        direction: "credit",
      });
    }
  }

  return txns.sort((a, b) => a.date.getTime() - b.date.getTime());
}

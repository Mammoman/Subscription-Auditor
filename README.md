# Subscription Auditor 👻

Detect recurring charges, surface forgotten ("zombie") subscriptions, and catch
sneaky price hikes — from a CSV of your bank transactions. Everyone has zombie
subscriptions; this finds them and shows what cancelling would save.

The detection engine is real. Data comes from CSV import plus a rich built-in
demo dataset. There is **no** live bank or email account connection (a
deliberate security boundary for v1).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite · Recharts ·
Framer Motion · Vitest.

## Getting started

```bash
npm install
npm run db:push   # creates the local SQLite database (dev.db)
npm run dev       # http://localhost:3000
```

Then click **Load demo data** to see the dashboard come alive.

## Using your own data

Upload a bank-export CSV with these columns (header aliases are tolerated):

```
date,description,amount
2025-01-05,NETFLIX.COM CA,15.49
2025-02-05,SPOTIFY P1,10.99
```

- `date` — any parseable date.
- `description` — the raw merchant string; the engine normalizes noisy variants
  (processor prefixes, phone numbers, store numbers) to one merchant.
- `amount` — positive = a charge. Negative values (refunds/credits) and
  unparseable rows are skipped and reported.

## How detection works

`lib/engine/` is a pure, framework-free, unit-tested module:

| Function | Responsibility |
|---|---|
| `normalizeMerchant` | collapse noisy bank strings to a canonical merchant key |
| `groupByMerchant` | bucket transactions by merchant |
| `detectCadence` | find a regular cadence (weekly…annual) within ±25% tolerance |
| `detectPriceHikes` | find upward price changes between consecutive charges |
| `scoreZombie` | score dormancy × cost into a 0–100 "forgotten?" signal |
| `buildSubscriptions` | orchestrate the above into `Subscription` objects |

## Tests

```bash
npm test
```

Covers merchant normalization, cadence detection, price-hike detection, zombie
scoring, the CSV parser, and an end-to-end acceptance test asserting the demo
dataset actually produces zombies and price hikes.

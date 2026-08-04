# Subscription Auditor — Design Spec

**Date:** 2026-08-04
**Status:** Approved

## Summary

A full-stack web app that ingests financial transaction data, detects recurring
charges, and surfaces forgotten ("zombie") subscriptions and price hikes through
a visually striking dashboard. The detection engine is real; data comes from CSV
import plus a rich seeded demo dataset. No live bank/email account connections in
v1 (explicit security boundary + scope decision).

## Goals

- Detect recurring charges from raw transactions (cadence analysis).
- Surface zombie / forgotten subscriptions with a "forgotten" score.
- Detect price hikes on recurring charges over time.
- Present it all in a stunning, animated, responsive dashboard.

## Non-Goals (YAGNI)

- Live bank/email OAuth (Plaid, Gmail API).
- Multi-user auth / accounts.
- Actually cancelling real services.
- Email/push notifications.

## Tech Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**.
- **Prisma** + **SQLite** (single-file DB, zero external services).
- **Framer Motion** for animation, **Recharts** for charts.
- **Vitest** for unit tests.

## Architecture

```
CSV upload / demo seed
        │
        ▼
   Ingest layer  ──► Transaction records (Prisma/SQLite)
        │
        ▼
 Detection engine (pure TS, unit-tested)
   normalizeMerchant → groupTransactions → detectCadence
   → detectPriceHikes → scoreZombie
        │
        ▼
   Subscription model (derived, cached)
        │
        ▼
   Dashboard (React client) reads via API routes
```

### Layers

1. **Ingest** — `/api/import` accepts CSV (columns: date, description, amount).
   A parser normalizes each row into a `Transaction`. A "Load demo data"
   action seeds ~120 realistic transactions across ~15 merchants (Netflix,
   Spotify, gym, SaaS tools, etc.) including at least: 2 price-hike cases, 3
   zombie cases, mixed cadences (weekly/monthly/annual), and noise (one-off
   purchases that must NOT be flagged as subscriptions).

2. **Detection engine** — pure module `lib/engine/`, no framework deps:
   - `normalizeMerchant(raw)` — strips card-processor noise, trailing store
     numbers, casing; maps to a canonical merchant key.
   - `groupTransactions(txns)` — groups by normalized merchant.
   - `detectCadence(group)` — computes intervals between sorted charges,
     clusters to nearest known period (7/14/30/90/365 days) within tolerance;
     returns cadence + confidence, or "not recurring".
   - `detectPriceHikes(group)` — finds consecutive charges where amount rose;
     returns list of {from, to, pctChange, date}.
   - `scoreZombie(sub)` — heuristic score from: dormancy (long gap since a
     "meaningful" signal), cost-vs-frequency, and an inactive flag. Threshold
     → boolean `isZombie` plus a 0–100 score.

3. **Analyze/derive** — combine the above into `Subscription` objects with
   monthlyCost normalized across cadences, nextRenewal projection, and flags.

4. **Present** — dashboard consumes `/api/subscriptions` and `/api/summary`.

## Data Model

```
Transaction {
  id                 string  @id
  date               DateTime
  merchantRaw        string
  merchantNormalized string
  amount             float     // positive = charge
  category           string?
}

Subscription (derived, cached in SubscriptionSnapshot) {
  id            string @id
  merchant      string
  cadence       enum(weekly|biweekly|monthly|quarterly|annual)
  avgAmount     float
  currency      string   // "USD" for v1
  firstSeen     DateTime
  lastSeen      DateTime
  nextRenewal   DateTime
  monthlyCost   float
  status        enum(active|zombie|cancelled)
  zombieScore   int      // 0–100
  priceHikes    Json     // list of hike events
}
```

`cancelled` status is set locally by the user's "Cancel" action (does not touch
any real service) and drives a "projected savings" figure.

## UI

Dark, glassy, gradient aesthetic with motion. Fully responsive.

- **Hero summary bar**: monthly spend, annual spend, active sub count,
  **$ wasted on zombies**, # price hikes — animated count-up.
- **Spend timeline**: stacked area chart over time.
- **Category donut**: spend by category.
- **Upcoming renewals**: horizontal calendar strip of next charges.
- **Subscriptions list**: cards/table with cadence badge, price-hike
  sparkline, zombie glow highlight, and Cancel action → projected savings.
- **Import panel**: drag-drop CSV + "Load demo data" button + clear-data.

## Error Handling

- CSV parse: reject malformed rows with a per-row error report; import valid
  rows, show a summary ("112 imported, 3 skipped").
- Empty state: friendly zero-data dashboard with a prominent "Load demo data".
- Detection with too-few data points (1–2 charges): mark "possible" not
  "confirmed" recurring; never crash on sparse groups.

## Testing

Vitest unit tests on the engine and parser:
- Merchant normalization (noise variants map to same key).
- Cadence detection (monthly/annual/weekly; irregular → not recurring;
  sparse groups).
- Price-hike detection (rising, falling, flat, single charge).
- Zombie scoring (dormant, active, high-cost-low-use).
- CSV parser (valid, malformed, mixed).

## Deliverable

`npm run dev` starts the app; "Load demo data" makes the dashboard come alive
with detected subscriptions, zombies, and price hikes. `npm test` runs the
engine suite green.
```

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

## Deploying to Vercel + Turso

Locally the app uses a SQLite file and needs no configuration. For production on
Vercel (whose filesystem is read-only), it connects to a **Turso** cloud
database (SQLite-compatible) via the libSQL driver adapter. No code changes are
needed to switch — it's driven entirely by two environment variables.

**1. Create the Turso database** (free tier; no credit card):

```bash
# install the Turso CLI first: https://docs.turso.tech/cli
turso auth signup
turso db create subscription-auditor
turso db show subscription-auditor --url         # -> TURSO_DATABASE_URL
turso db tokens create subscription-auditor      # -> TURSO_AUTH_TOKEN
```

**2. Apply the schema** to the Turso database (creates the `Transaction` table):

```bash
turso db shell subscription-auditor < schema.sql
```

**3. Push to GitHub and import into Vercel** (Add New → Project → import this
repo). Vercel auto-detects Next.js.

**4. Set the environment variables** in Vercel → Settings → Environment
Variables (see `.env.example`):

```
TURSO_DATABASE_URL = libsql://subscription-auditor-<you>.turso.io
TURSO_AUTH_TOKEN   = <token from step 1>
```

**5. Deploy.** Once the vars are set, "Load demo data", CSV import, and cancel
all work in production — writing to Turso instead of a local file. Every future
`git push` auto-deploys.

> How it works: `lib/db.ts` uses the Turso libSQL adapter when
> `TURSO_DATABASE_URL` is present, and falls back to the local `dev.db` file
> otherwise — so your IDE workflow is unchanged and needs no env vars.

## Tests

```bash
npm test
```

Covers merchant normalization, cadence detection, price-hike detection, zombie
scoring, the CSV parser, and an end-to-end acceptance test asserting the demo
dataset actually produces zombies and price hikes.

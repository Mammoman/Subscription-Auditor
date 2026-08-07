# Subscription Auditor 👻

Detect recurring charges, surface forgotten ("zombie") subscriptions, and catch
sneaky price hikes — from a CSV of your bank transactions. Everyone has zombie
subscriptions; this finds them and shows what cancelling would save.

The detection engine is real. Data comes from CSV import plus a rich built-in
demo dataset. There is **no** live bank or email account connection (a
deliberate security boundary for v1).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres · Recharts ·
Framer Motion · Vitest.

## Getting started

The app uses a Postgres database (Vercel Postgres in production). For local
development, point it at any Postgres connection string — the easiest is to
reuse the Vercel Postgres database you create for deployment (no local Postgres
install needed).

```bash
npm install
cp .env.example .env       # then paste your Postgres connection string into DATABASE_URL
npm run dev                # http://localhost:3000  (auto-creates the table on first run)
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

**PDF statements** are also supported (best-effort): drop a PDF and the app
extracts text and heuristically finds date + amount lines. Because statement
layouts vary, results aren't guaranteed — a CSV export is the reliable path.
Always check the "imported / skipped" summary after a PDF import.

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

## Deploying to Vercel + Vercel Postgres

The database lives entirely inside the Vercel dashboard — no separate service to
sign up for.

**1. Import the repo into Vercel** — Add New → Project → import this repo.
Vercel auto-detects Next.js. (Deploy it once; it'll error until the database is
attached in the next step — that's expected.)

**2. Create the database** — in the project, go to the **Storage** tab → Create
Database → **Postgres**. Vercel provisions it and **automatically injects the
connection string env var** into the project. No manual copying of secrets.

**3. Create the table** — open the database's **Query / SQL** editor in the
Vercel dashboard and run the contents of `schema.sql`:

```sql
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchantRaw" TEXT NOT NULL,
    "merchantNormalized" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Transaction_merchantNormalized_idx" ON "Transaction"("merchantNormalized");
```

> Alternatively, run it locally: copy the connection string into `.env` as
> `DATABASE_URL`, then `npm run dev` — the `predev` hook runs `prisma db push`
> and creates the table for you (in the same cloud database prod uses).

**4. Redeploy** — Deployments → redeploy the latest. Now "Load demo data", CSV
import, and cancel all work in production, persisting to Postgres. Every future
`git push` auto-deploys.

> Note: if your Vercel Postgres integration names the variable
> `POSTGRES_PRISMA_URL` rather than `DATABASE_URL`, add a `DATABASE_URL`
> environment variable in the project pointing at the same pooled connection
> string (`prisma/schema.prisma` reads `env("DATABASE_URL")`).

## Tests

```bash
npm test
```

Covers merchant normalization, cadence detection, price-hike detection, zombie
scoring, the CSV parser, and an end-to-end acceptance test asserting the demo
dataset actually produces zombies and price hikes.

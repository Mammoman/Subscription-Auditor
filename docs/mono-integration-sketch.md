# Mono Sandbox Integration — Design Sketch

How to connect real Nigerian bank accounts via **Mono** (`mono.co`) without
changing the detection engine. This is a design sketch, not wired into the app
yet. Verify endpoint/field names against the current Mono docs before building —
Mono has both v1 and v2 APIs and details shift.

## The big picture

```
[User clicks "Connect bank"]
        │  Mono Connect widget (frontend, uses PUBLIC key)
        ▼
  user logs into their bank INSIDE Mono's widget  ──►  widget returns a short-lived `code`
        │
        ▼  POST /api/mono/exchange   (backend, uses SECRET key)
  exchange code ──► Mono returns an `accountId`     (store it)
        │
        ▼  POST /api/mono/sync
  GET transactions for accountId  ──►  map to our Txn shape  ──►  save (same table)
        │
        ▼
  EXISTING engine runs unchanged:
  normalizeMerchant → detectCadence → detectPriceHikes → scoreZombie
```

Your credentials boundary: the **secret key never leaves the server**, and your
app never sees the user's bank login — Mono's widget handles that.

## Environment variables

```bash
# .env  (sandbox / test keys from the Mono dashboard)
MONO_SECRET_KEY="test_sk_xxx"          # server-only
NEXT_PUBLIC_MONO_PUBLIC_KEY="test_pk_xxx"  # safe to expose to the browser
```

## 1. The provider adapter — the one piece of real new logic

`lib/providers/mono.ts` — turns Mono transactions into the same rows the CSV
importer already produces, so everything downstream is identical.

```ts
const MONO_BASE = "https://api.withmono.com/v2";

interface MonoTxn {
  id: string;
  amount: number;      // in KOBO (1/100 naira)
  date: string;        // ISO date
  narration: string;   // raw merchant / description
  type: "debit" | "credit";
  category?: string;
  currency?: string;   // "NGN"
}

/** Exchange the widget's `code` for a reusable account id. */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(`${MONO_BASE}/accounts/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mono-sec-key": process.env.MONO_SECRET_KEY!,
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Mono auth failed: ${res.status}`);
  const data = await res.json();
  return data.id; // account id
}

/** Pull transactions and map them into our importer's row shape. */
export async function fetchMonoTransactions(accountId: string) {
  const res = await fetch(
    `${MONO_BASE}/accounts/${accountId}/transactions?paginate=false`,
    { headers: { "mono-sec-key": process.env.MONO_SECRET_KEY! } }
  );
  if (!res.ok) throw new Error(`Mono transactions failed: ${res.status}`);
  const { data }: { data: MonoTxn[] } = await res.json();

  // Keep only debits (charges); convert kobo → naira; normalize merchant.
  return data
    .filter((t) => t.type === "debit")
    .map((t) => ({
      date: new Date(t.date),
      merchantRaw: t.narration,
      amount: t.amount / 100,
      category: t.category,
    }));
}
```

That `.map(...)` output is **exactly** the shape your `parseCsv` rows have
(`{ date, merchantRaw, amount }`), so it feeds straight into the same persistence
and the same engine.

## 2. Backend routes

`app/api/mono/exchange/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/providers/mono";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const accountId = await exchangeCode(code);
  // In a multi-user app you'd save accountId against the logged-in user.
  return NextResponse.json({ accountId });
}
```

`app/api/mono/sync/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMonoTransactions } from "@/lib/providers/mono";
import { normalizeMerchant } from "@/lib/engine/normalize";

export async function POST(req: NextRequest) {
  const { accountId } = await req.json();
  const rows = await fetchMonoTransactions(accountId);

  await prisma.transaction.createMany({
    data: rows.map((r) => ({
      date: r.date,
      merchantRaw: r.merchantRaw,
      merchantNormalized: normalizeMerchant(r.merchantRaw),
      amount: r.amount,
      category: r.category,
    })),
  });

  return NextResponse.json({ imported: rows.length });
}
```

Notice `/api/mono/sync` is nearly identical to the existing `/api/import` — same
`normalizeMerchant` + `createMany`. Only the data *source* differs.

## 3. Frontend connect button

`components/MonoConnectButton.tsx` (loads Mono Connect via `next/script`).

```tsx
"use client";
import Script from "next/script";

export default function MonoConnectButton({ onLinked }: { onLinked: () => void }) {
  function openWidget() {
    // @ts-expect-error injected by the Mono Connect script
    const connect = new window.Connect({
      key: process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY,
      onSuccess: async ({ code }: { code: string }) => {
        const { accountId } = await fetch("/api/mono/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }).then((r) => r.json());

        await fetch("/api/mono/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        onLinked(); // refresh the dashboard
      },
    });
    connect.setup();
    connect.open();
  }

  return (
    <>
      <Script src="https://connect.withmono.com/connect.js" strategy="lazyOnload" />
      <button onClick={openWidget}>Connect your bank</button>
    </>
  );
}
```

In the dashboard this sits right next to "Load demo data" and calls `refresh()`
on success — the charts and cards populate from real transactions.

## Integration notes / gotchas

1. **Amounts are in kobo** — always divide by 100.
2. **Filter to debits** — credits are salary/refunds, not subscriptions (your CSV
   parser already does the equivalent sign detection).
3. **Base currency should be NGN here.** The app currently treats stored amounts
   as USD for the currency converter. For a Nigerian deployment, set
   `BASE_CURRENCY = "NGN"` in `lib/format.ts` so conversions read correctly.
4. **Sandbox testing:** use Mono's **test** keys; the widget shows test banks with
   test login credentials (no real bank needed).
5. **Security:** `MONO_SECRET_KEY` is server-only — never expose it or call
   Mono's data endpoints from the browser. Only the public key goes client-side.
6. **Pagination & incremental sync:** for real accounts, page through
   transactions and store a cursor / last-synced date so repeat syncs only pull
   new charges (and dedupe on Mono's transaction `id`).
7. **Multi-user:** store `accountId` per authenticated user so each person only
   sees their own data.

## Why this is a small change

The valuable part — merchant normalization, cadence detection, zombie scoring —
is untouched. Mono is just a third input adapter alongside the demo seed and the
CSV importer, all three producing the same `{ date, merchantRaw, amount }` rows.
```

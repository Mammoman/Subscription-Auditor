# Subscription Auditor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js app that ingests transactions (CSV + demo seed), detects recurring charges, and surfaces zombie subscriptions and price hikes in a stunning dashboard.

**Architecture:** Pure, unit-tested TypeScript detection engine (`lib/engine`) sits at the core. Next.js App Router API routes handle ingest and expose derived subscription/summary data from Prisma+SQLite. A React client renders an animated, dark, glassy dashboard.

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite · Recharts · Framer Motion · Vitest.

## Global Constraints

- TypeScript strict mode on; no `any` in engine code.
- Currency v1: USD only. Amounts stored as positive floats where positive = a charge.
- Detection engine (`lib/engine/*`) is pure: no Prisma, no Next, no I/O imports.
- Known cadence periods (days): weekly=7, biweekly=14, monthly=30, quarterly=90, annual=365. Interval tolerance: ±25%.
- Node 18+.
- Commit after every task (each task ends green).

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`) and a working test runner (`npm test`).

- [ ] **Step 1:** Init Next.js app deps. Create `package.json`:

```json
{
  "name": "subscription-auditor",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "db:push": "prisma db push",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@prisma/client": "^5.18.0",
    "recharts": "^2.12.7",
    "framer-motion": "^11.3.24",
    "papaparse": "^5.4.1",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/react": "^18.3.3",
    "@types/node": "^20.14.0",
    "@types/papaparse": "^5.3.14",
    "tailwindcss": "^3.4.7",
    "postcss": "^8.4.40",
    "autoprefixer": "^10.4.19",
    "prisma": "^5.18.0",
    "tsx": "^4.16.5",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2:** Create `tsconfig.json` (strict), `next.config.mjs`, Tailwind config (`tailwind.config.ts` with `content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"]`), `postcss.config.mjs`, and `vitest.config.ts`:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["lib/**/*.test.ts"] } });
```

- [ ] **Step 3:** Create minimal `app/layout.tsx`, `app/page.tsx` (renders `<h1>Subscription Auditor</h1>`), `app/globals.css` (Tailwind directives), and `.gitignore` (`node_modules`, `.next`, `*.db`, `dev.db*`).

- [ ] **Step 4:** Run `npm install` then `npm run dev`. Expected: server boots, page shows the heading.

- [ ] **Step 5:** Commit.

```bash
git add -A && git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Detection engine — types + merchant normalization

**Files:**
- Create: `lib/engine/types.ts`, `lib/engine/normalize.ts`, `lib/engine/normalize.test.ts`

**Interfaces:**
- Produces:
  - `type Cadence = "weekly"|"biweekly"|"monthly"|"quarterly"|"annual"`
  - `interface Txn { id: string; date: Date; merchantRaw: string; amount: number; category?: string }`
  - `interface PriceHike { fromAmount: number; toAmount: number; pctChange: number; date: Date }`
  - `interface Subscription { merchant: string; cadence: Cadence; confidence: number; avgAmount: number; firstSeen: Date; lastSeen: Date; nextRenewal: Date; monthlyCost: number; zombieScore: number; isZombie: boolean; priceHikes: PriceHike[]; txnCount: number }`
  - `normalizeMerchant(raw: string): string`

- [ ] **Step 1: Write failing test** `lib/engine/normalize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeMerchant } from "./normalize";

describe("normalizeMerchant", () => {
  it("collapses processor noise + store numbers to one key", () => {
    const variants = [
      "NETFLIX.COM 866-579-7172 CA",
      "Netflix #4471",
      "SQ *NETFLIX",
      "netflix.com",
    ];
    const keys = new Set(variants.map(normalizeMerchant));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("netflix");
  });
  it("keeps distinct merchants distinct", () => {
    expect(normalizeMerchant("SPOTIFY P1A2B3")).not.toBe(normalizeMerchant("HULU"));
  });
});
```

- [ ] **Step 2:** Run `npx vitest run lib/engine/normalize.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3:** Implement `lib/engine/types.ts` (the interfaces above) and `lib/engine/normalize.ts`:

```ts
export function normalizeMerchant(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/\b(sq|tst|pp|sp|paypal|pos|dd)\s*\*+/g, " "); // processor prefixes
  s = s.replace(/\*+/g, " ");
  s = s.replace(/\b\d{3}[- ]?\d{3}[- ]?\d{4}\b/g, " ");        // phone numbers
  s = s.replace(/#?\b[a-z]?\d{2,}\b/g, " ");                    // store/ref numbers
  s = s.replace(/\.(com|net|org|io|co)\b/g, " ");
  s = s.replace(/\b[a-z]{2}\b$/g, " ");                          // trailing state code
  s = s.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return s.split(" ")[0] || s;                                  // canonical head token
}
```

- [ ] **Step 4:** Run the test. Expected: PASS. (If the trailing-token heuristic misfires on a case, tighten the regex until both tests pass.)

- [ ] **Step 5:** Commit `feat: merchant normalization + engine types`.

---

### Task 3: Detection engine — grouping + cadence

**Files:**
- Create: `lib/engine/cadence.ts`, `lib/engine/cadence.test.ts`

**Interfaces:**
- Consumes: `Txn`, `Cadence`, `normalizeMerchant` from Task 2.
- Produces:
  - `groupByMerchant(txns: Txn[]): Map<string, Txn[]>`
  - `detectCadence(group: Txn[]): { cadence: Cadence; confidence: number } | null` (null = not recurring)

- [ ] **Step 1: Write failing test** `lib/engine/cadence.test.ts` covering: 6 monthly charges → `"monthly"` high confidence; 3 annual charges → `"annual"`; irregular one-off dates → `null`; single charge → `null`. Example:

```ts
import { describe, it, expect } from "vitest";
import { detectCadence } from "./cadence";
const mk = (isoDates: string[]) =>
  isoDates.map((d, i) => ({ id: String(i), date: new Date(d), merchantRaw: "X", amount: 9.99 }));

describe("detectCadence", () => {
  it("detects monthly", () => {
    const r = detectCadence(mk(["2025-01-05","2025-02-05","2025-03-05","2025-04-05","2025-05-05"]));
    expect(r?.cadence).toBe("monthly");
    expect(r?.confidence).toBeGreaterThan(0.7);
  });
  it("returns null for one-off purchases", () => {
    expect(detectCadence(mk(["2025-01-05","2025-01-19"]))).toBeTruthy(); // biweekly-ish is allowed
    expect(detectCadence(mk(["2025-01-05"]))).toBeNull();
    expect(detectCadence(mk(["2025-01-05","2025-06-22","2025-07-30"]))).toBeNull();
  });
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.

- [ ] **Step 3:** Implement `lib/engine/cadence.ts`:

```ts
import { Txn, Cadence } from "./types";
import { normalizeMerchant } from "./normalize";

const PERIODS: [Cadence, number][] = [
  ["weekly", 7], ["biweekly", 14], ["monthly", 30], ["quarterly", 90], ["annual", 365],
];
const TOL = 0.25;

export function groupByMerchant(txns: Txn[]): Map<string, Txn[]> {
  const m = new Map<string, Txn[]>();
  for (const t of txns) {
    const k = normalizeMerchant(t.merchantRaw);
    (m.get(k) ?? m.set(k, []).get(k)!).push(t);
  }
  return m;
}

export function detectCadence(group: Txn[]): { cadence: Cadence; confidence: number } | null {
  if (group.length < 3) return null;
  const dates = group.map((t) => t.date.getTime()).sort((a, b) => a - b);
  const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86_400_000);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  let best: { cadence: Cadence; confidence: number } | null = null;
  for (const [cadence, period] of PERIODS) {
    const withinTol = gaps.filter((g) => Math.abs(g - period) / period <= TOL).length;
    const frac = withinTol / gaps.length;
    const closeness = 1 - Math.min(1, Math.abs(avg - period) / period);
    const confidence = frac * 0.7 + closeness * 0.3;
    if (frac >= 0.6 && (!best || confidence > best.confidence)) best = { cadence, confidence };
  }
  return best;
}
```

- [ ] **Step 4:** Run tests. Expected: PASS. Adjust thresholds only to satisfy the stated cases.

- [ ] **Step 5:** Commit `feat: transaction grouping + cadence detection`.

---

### Task 4: Detection engine — price hikes + zombie scoring + subscription build

**Files:**
- Create: `lib/engine/analyze.ts`, `lib/engine/analyze.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–3.
- Produces:
  - `detectPriceHikes(group: Txn[]): PriceHike[]`
  - `scoreZombie(input: { lastSeen: Date; now: Date; cadence: Cadence; monthlyCost: number }): { score: number; isZombie: boolean }`
  - `buildSubscriptions(txns: Txn[], now?: Date): Subscription[]` — the top-level engine entry that groups, detects cadence (drops non-recurring), computes avg amount, next renewal (`lastSeen + period`), `monthlyCost` (avgAmount × periodsPerMonth), hikes, and zombie score.

- [ ] **Step 1: Write failing tests** in `analyze.test.ts`:
  - `detectPriceHikes`: charges 9.99, 9.99, 12.99 → one hike ~30%; flat → []; single → [].
  - `scoreZombie`: lastSeen 5 months ago on monthly cadence → `isZombie true`; lastSeen 10 days ago → `false`.
  - `buildSubscriptions`: given a mixed array (a clean monthly Netflix set + two random one-off purchases) → returns exactly one subscription, merchant `"netflix"`, with a valid `nextRenewal` after `lastSeen`.

```ts
import { describe, it, expect } from "vitest";
import { detectPriceHikes, scoreZombie, buildSubscriptions } from "./analyze";
const T = (d: string, amount: number, merchantRaw = "NETFLIX.COM CA", id = d) =>
  ({ id, date: new Date(d), merchantRaw, amount });

describe("analyze", () => {
  it("finds a price hike", () => {
    const h = detectPriceHikes([T("2025-01-01",9.99),T("2025-02-01",9.99),T("2025-03-01",12.99)]);
    expect(h).toHaveLength(1);
    expect(Math.round(h[0].pctChange)).toBe(30);
  });
  it("flags a dormant monthly sub as zombie", () => {
    const z = scoreZombie({ lastSeen: new Date("2025-01-01"), now: new Date("2025-06-15"), cadence: "monthly", monthlyCost: 15 });
    expect(z.isZombie).toBe(true);
  });
  it("builds one sub and ignores one-offs", () => {
    const subs = buildSubscriptions([
      T("2025-01-05",9.99),T("2025-02-05",9.99),T("2025-03-05",9.99),T("2025-04-05",9.99),
      T("2025-02-14",120,"BEST BUY #221","a"), T("2025-03-02",42,"SHELL OIL 7781","b"),
    ], new Date("2025-04-20"));
    expect(subs).toHaveLength(1);
    expect(subs[0].merchant).toBe("netflix");
    expect(subs[0].nextRenewal.getTime()).toBeGreaterThan(subs[0].lastSeen.getTime());
  });
});
```

- [ ] **Step 2:** Run tests. Expected: FAIL.

- [ ] **Step 3:** Implement `lib/engine/analyze.ts` using `groupByMerchant`/`detectCadence`. Period-per-cadence map reused from a shared const; `monthlyCost = avgAmount * (30 / periodDays)`; `nextRenewal = lastSeen + periodDays`; zombie: `score = clamp(0..100, (daysSinceLastSeen / periodDays) * 40 + costWeight)`, `isZombie = daysSinceLastSeen > periodDays * 2 || score >= 60`. Include the shared `PERIOD_DAYS` record and export it.

- [ ] **Step 4:** Run tests. Expected: PASS.

- [ ] **Step 5:** Commit `feat: price-hike detection, zombie scoring, subscription builder`.

---

### Task 5: Prisma schema + DB client

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`

**Interfaces:**
- Produces: `Transaction` model (fields per spec), `prisma` singleton export from `lib/db.ts`.

- [ ] **Step 1:** Write `prisma/schema.prisma` with SQLite datasource (`url = "file:./dev.db"`) and the `Transaction` model: `id String @id @default(cuid())`, `date DateTime`, `merchantRaw String`, `merchantNormalized String`, `amount Float`, `category String?`, `status String @default("active")` (used for local cancel), `createdAt DateTime @default(now())`.

- [ ] **Step 2:** Create `lib/db.ts` (Prisma client singleton guarded against hot-reload).

- [ ] **Step 3:** Run `npm run db:push`. Expected: `dev.db` created, tables synced.

- [ ] **Step 4:** Commit `feat: prisma schema + sqlite client` (ensure `dev.db*` gitignored).

---

### Task 6: CSV parser + import API

**Files:**
- Create: `lib/parse-csv.ts`, `lib/parse-csv.test.ts`, `app/api/import/route.ts`, `app/api/clear/route.ts`

**Interfaces:**
- Produces:
  - `parseCsv(text: string): { rows: { date: Date; merchantRaw: string; amount: number }[]; skipped: { line: number; reason: string }[] }`
  - `POST /api/import` (body: `{ csv: string }`) → persists parsed rows, returns `{ imported, skipped }`.
  - `POST /api/clear` → deletes all transactions.

- [ ] **Step 1: Write failing test** `parse-csv.test.ts`: header `date,description,amount`; a valid row parses; a row with bad date or non-numeric amount lands in `skipped` with its line number; negative amounts (refunds/credits) are skipped. Include one full CSV string with 3 valid + 2 bad lines and assert `rows.length===3, skipped.length===2`.

- [ ] **Step 2:** Run it. Expected: FAIL.

- [ ] **Step 3:** Implement `parseCsv` using `papaparse` (header mode); coerce `date` via `new Date`, validate `!isNaN`; parse amount, require finite `> 0`; collect skips with reasons.

- [ ] **Step 4:** Run test. Expected: PASS.

- [ ] **Step 5:** Implement the two routes: import maps rows → `{ ...row, merchantNormalized: normalizeMerchant(merchantRaw) }` and `prisma.transaction.createMany`; clear deletes all. Manual check with `curl` POSTing a small CSV. Expected: `{ imported: 3, skipped: 2 }`.

- [ ] **Step 6:** Commit `feat: CSV parser + import/clear API`.

---

### Task 7: Demo seed data + seed API

**Files:**
- Create: `lib/demo-data.ts`, `app/api/seed/route.ts`

**Interfaces:**
- Consumes: `normalizeMerchant`, `prisma`.
- Produces: `generateDemoTransactions(now: Date): { date: Date; merchantRaw: string; amount: number; category: string }[]`; `POST /api/seed` clears then inserts demo data.

- [ ] **Step 1:** Implement `generateDemoTransactions` producing ~120 rows across ~15 merchants over ~14 months relative to `now`. MUST include, verifiably: (a) ≥2 merchants with a mid-history price hike (e.g. Netflix 15.49→17.99, Disney+ 7.99→10.99); (b) ≥3 zombie cases (subscriptions whose last charge is 3–6 months before `now`, e.g. an unused gym, a trial-turned-paid SaaS, a magazine); (c) mixed cadences (Spotify monthly, Amazon Prime annual, a weekly meal-kit, a quarterly service); (d) ~15 one-off purchases (groceries, gas, restaurants) that must NOT become subscriptions; assign a `category` per merchant (Streaming, Music, Software, Fitness, Shopping, Food, Utilities, Other).

- [ ] **Step 2:** Add a lightweight test `lib/demo-data.test.ts` asserting: running `buildSubscriptions(generateDemoTransactions(now))` yields ≥8 subscriptions, ≥3 with `isZombie`, and ≥2 with non-empty `priceHikes`. This is the engine's real-world acceptance test.

- [ ] **Step 3:** Run it. Iterate on the dataset until the assertions pass (this guarantees the demo actually demonstrates every feature).

- [ ] **Step 4:** Implement `POST /api/seed` (clear + insert with normalized merchant).

- [ ] **Step 5:** Commit `feat: demo dataset + seed API (engine acceptance test)`.

---

### Task 8: Subscriptions + summary API

**Files:**
- Create: `app/api/subscriptions/route.ts`, `app/api/summary/route.ts`

**Interfaces:**
- Consumes: `buildSubscriptions`, `prisma`.
- Produces:
  - `GET /api/subscriptions` → `{ subscriptions: Subscription[] }` (built from all active transactions; excludes those whose merchant the user cancelled).
  - `GET /api/summary` → `{ monthlyTotal, annualTotal, activeCount, zombieCount, zombieMonthlyWaste, priceHikeCount, timeline: {month,total}[], byCategory: {category,total}[], upcoming: {merchant,date,amount}[] }`.
  - `POST /api/subscriptions/cancel` (body `{ merchant }`) → marks that merchant's transactions `status:"cancelled"`; cancelled merchants are excluded from active build and drive projected savings.

- [ ] **Step 1:** Implement subscriptions route: load transactions, map to `Txn`, `buildSubscriptions`, JSON-serialize dates.

- [ ] **Step 2:** Implement summary route deriving all aggregate fields from the built subscriptions + transactions (timeline = sum by calendar month; byCategory from transaction categories; upcoming = subs sorted by `nextRenewal` within 45 days).

- [ ] **Step 3:** Implement cancel route.

- [ ] **Step 4:** Manual check: seed, then `curl /api/summary` returns non-zero `zombieMonthlyWaste` and `priceHikeCount`.

- [ ] **Step 5:** Commit `feat: subscriptions + summary + cancel API`.

---

### Task 9: Dashboard shell + data hooks + design tokens

**Files:**
- Create: `app/page.tsx` (replace), `components/DashboardClient.tsx`, `lib/format.ts`, extend `app/globals.css`
- Modify: `tailwind.config.ts` (theme extend: brand gradient colors, glass shadow)

**Interfaces:**
- Consumes: the three GET APIs.
- Produces: `DashboardClient` client component that fetches summary + subscriptions and renders child sections; `formatCurrency`, `formatDate`, `relativeTime` helpers in `lib/format.ts`.

- [ ] **Step 1:** Set the visual system in `globals.css` + Tailwind: near-black background (`#0a0a0f`), radial/linear brand gradient (violet→cyan), glassmorphism utility (`.glass { background: rgba(255,255,255,.04); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.08) }`), Inter/system font stack, subtle noise/grid overlay.

- [ ] **Step 2:** Build `DashboardClient` (`"use client"`): fetch `/api/summary` and `/api/subscriptions` on mount; loading skeletons; empty state (no data) with a large "Load demo data" CTA and a CSV dropzone. Wire seed/import/clear buttons to their APIs and refetch.

- [ ] **Step 3:** Render placeholder section slots (Hero, Charts, Renewals, List) so layout/responsiveness is verifiable before filling them.

- [ ] **Step 4:** Run `npm run dev`, load demo data, confirm data flows in (log counts). Expected: subscriptions + summary populate.

- [ ] **Step 5:** Commit `feat: dashboard shell, data hooks, design tokens`.

---

### Task 10: Hero summary bar (animated counters)

**Files:**
- Create: `components/HeroSummary.tsx`, `components/CountUp.tsx`

- [ ] **Step 1:** Build `CountUp` with Framer Motion `animate`/`useMotionValue` to tween a number from 0 to target on mount.
- [ ] **Step 2:** Build `HeroSummary` — 5 glass stat cards: Monthly spend, Annual spend, Active subs, **Zombie waste $/mo** (accent/danger color + pulse), Price hikes. Staggered entrance animation.
- [ ] **Step 3:** Wire into `DashboardClient` with real summary data. Verify responsive wrap (5→2→1 columns).
- [ ] **Step 4:** Commit `feat: animated hero summary bar`.

---

### Task 11: Charts — spend timeline + category donut

**Files:**
- Create: `components/SpendTimeline.tsx`, `components/CategoryDonut.tsx`

- [ ] **Step 1:** `SpendTimeline` — Recharts `AreaChart` of `summary.timeline` with gradient fill, custom dark tooltip, no gridline clutter.
- [ ] **Step 2:** `CategoryDonut` — Recharts `PieChart` (donut) of `summary.byCategory`, brand palette, center label showing total.
- [ ] **Step 3:** Place side-by-side (stack on mobile) in the dashboard. Verify with demo data.
- [ ] **Step 4:** Commit `feat: spend timeline + category donut charts`.

---

### Task 12: Upcoming renewals strip

**Files:**
- Create: `components/UpcomingRenewals.tsx`

- [ ] **Step 1:** Horizontal scroll strip of `summary.upcoming`: each card shows merchant, days-until badge (color-graded by urgency), amount, date. Empty state if none in 45 days.
- [ ] **Step 2:** Add subtle hover lift + entrance animation. Verify responsive horizontal scroll.
- [ ] **Step 3:** Commit `feat: upcoming renewals strip`.

---

### Task 13: Subscriptions list (badges, sparkline, zombie glow, cancel)

**Files:**
- Create: `components/SubscriptionList.tsx`, `components/SubscriptionCard.tsx`, `components/PriceSparkline.tsx`

- [ ] **Step 1:** `PriceSparkline` — tiny inline SVG/Recharts line of a subscription's charge amounts over time; red segment marking a hike.
- [ ] **Step 2:** `SubscriptionCard` — merchant, cadence badge, avg amount, next renewal (relative), monthly cost; **zombie cards get a colored glow + "Forgotten?" tag with the zombie score**; price-hike cards show a "▲ +X%" tag and the sparkline.
- [ ] **Step 3:** `SubscriptionList` — sortable/filterable (All / Zombies / Price hikes) grid of cards; a **Cancel** button per card → POST `/api/subscriptions/cancel`, optimistic removal, and a toast showing projected annual savings (`monthlyCost * 12`).
- [ ] **Step 4:** Wire into dashboard; verify filters, cancel flow, and savings math with demo data.
- [ ] **Step 5:** Commit `feat: subscription list with cancel + savings`.

---

### Task 14: Polish, empty/error states, README, final verification

**Files:**
- Create: `README.md`
- Modify: any component needing loading skeletons / error toasts

- [ ] **Step 1:** Add graceful loading skeletons and an error toast for failed fetches/imports (show the `skipped` summary after CSV import).
- [ ] **Step 2:** Pass over motion/spacing/contrast for the "stunning" bar; verify at mobile/tablet/desktop widths.
- [ ] **Step 3:** Write `README.md`: what it is, `npm install`, `npm run db:push`, `npm run dev`, "Load demo data", CSV format, `npm test`.
- [ ] **Step 4:** Run full `npm test` (all engine + parser + demo-acceptance tests green) and a clean `npm run build`.
- [ ] **Step 5:** Commit `feat: polish, states, README + final verification`.

---

## Self-Review Notes

- **Spec coverage:** ingest (T6/T7), engine normalize/group/cadence/hike/zombie (T2–T4), data model (T5), subscriptions+summary+cancel APIs (T8), all UI sections — hero, timeline, donut, renewals, list, import panel, empty states (T9–T14), testing (engine T2–T4, parser T6, demo-acceptance T7). All spec sections mapped.
- **Placeholders:** engine/parser tasks carry real code; UI tasks specify exact components, props, and libraries — no "TBD".
- **Type consistency:** `Txn`, `Subscription`, `Cadence`, `PriceHike`, `PERIOD_DAYS`, `normalizeMerchant`, `groupByMerchant`, `detectCadence`, `detectPriceHikes`, `scoreZombie`, `buildSubscriptions`, `parseCsv`, `generateDemoTransactions` are defined once and reused with consistent signatures.
```

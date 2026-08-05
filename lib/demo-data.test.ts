import { describe, it, expect } from "vitest";
import { generateDemoTransactions } from "./demo-data";
import { buildSubscriptions } from "./engine/analyze";
import { Txn } from "./engine/types";

// Engine acceptance test: the demo dataset must actually demonstrate every
// feature the product claims — otherwise the "Load demo data" experience is a lie.
describe("demo data drives the full engine", () => {
  const now = new Date("2026-08-05");
  const txns: Txn[] = generateDemoTransactions(now).map((t, i) => ({
    id: String(i),
    date: t.date,
    merchantRaw: t.merchantRaw,
    amount: t.amount,
    category: t.category,
  }));
  const subs = buildSubscriptions(txns, now);

  it("detects at least 8 subscriptions", () => {
    expect(subs.length).toBeGreaterThanOrEqual(8);
  });

  it("flags at least 3 zombie subscriptions", () => {
    expect(subs.filter((s) => s.isZombie).length).toBeGreaterThanOrEqual(3);
  });

  it("detects at least 2 subscriptions with price hikes", () => {
    expect(subs.filter((s) => s.priceHikes.length > 0).length).toBeGreaterThanOrEqual(2);
  });

  it("does not mistake one-off purchases for subscriptions", () => {
    const merchants = subs.map((s) => s.merchant.toLowerCase());
    expect(merchants).not.toContain("shell");
    expect(merchants).not.toContain("chipotle");
    expect(merchants).not.toContain("target");
  });
});

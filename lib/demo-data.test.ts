import { describe, it, expect } from "vitest";
import { generateDemoTransactions } from "./demo-data";
import { buildSubscriptions } from "./engine/analyze";
import { buildTransfers, isTransfer } from "./engine/transfers";
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

  // Mirror the service: transfers are classified out of subscription detection.
  const charges = txns.filter((t) => !isTransfer(t.merchantRaw));
  const transfers = txns.filter((t) => isTransfer(t.merchantRaw));
  const subs = buildSubscriptions(charges, now);
  const recipients = buildTransfers(transfers);

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

  it("aggregates transfers by recipient", () => {
    expect(recipients.length).toBeGreaterThanOrEqual(3);
    const john = recipients.find((r) => r.recipient === "John Doe");
    expect(john).toBeTruthy();
    expect(john!.count).toBeGreaterThanOrEqual(5); // sent to John many times
    expect(john!.totalSent).toBeGreaterThan(0);
    // transfers must never leak into subscriptions
    expect(subs.map((s) => s.merchant.toLowerCase())).not.toContain("john doe");
  });
});

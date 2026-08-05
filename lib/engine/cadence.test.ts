import { describe, it, expect } from "vitest";
import { detectCadence, groupByMerchant } from "./cadence";
import { Txn } from "./types";

const mk = (isoDates: string[]): Txn[] =>
  isoDates.map((d, i) => ({
    id: String(i),
    date: new Date(d),
    merchantRaw: "X",
    amount: 9.99,
  }));

describe("detectCadence", () => {
  it("detects a monthly cadence with high confidence", () => {
    const r = detectCadence(
      mk(["2025-01-05", "2025-02-05", "2025-03-05", "2025-04-05", "2025-05-05"])
    );
    expect(r?.cadence).toBe("monthly");
    expect(r?.confidence).toBeGreaterThan(0.7);
  });

  it("detects an annual cadence", () => {
    const r = detectCadence(mk(["2023-03-01", "2024-03-02", "2025-03-01"]));
    expect(r?.cadence).toBe("annual");
  });

  it("detects a weekly cadence", () => {
    const r = detectCadence(
      mk(["2025-01-06", "2025-01-13", "2025-01-20", "2025-01-27"])
    );
    expect(r?.cadence).toBe("weekly");
  });

  it("returns null for a single charge", () => {
    expect(detectCadence(mk(["2025-01-05"]))).toBeNull();
  });

  it("returns null for irregular one-off purchases", () => {
    expect(
      detectCadence(mk(["2025-01-05", "2025-06-22", "2025-07-30"]))
    ).toBeNull();
  });
});

describe("groupByMerchant", () => {
  it("buckets noisy variants of the same merchant together", () => {
    const txns: Txn[] = [
      { id: "a", date: new Date("2025-01-01"), merchantRaw: "NETFLIX.COM CA", amount: 15 },
      { id: "b", date: new Date("2025-02-01"), merchantRaw: "SQ *NETFLIX", amount: 15 },
      { id: "c", date: new Date("2025-01-15"), merchantRaw: "SPOTIFY P1", amount: 11 },
    ];
    const groups = groupByMerchant(txns);
    expect(groups.get("netflix")).toHaveLength(2);
    expect(groups.get("spotify")).toHaveLength(1);
  });
});

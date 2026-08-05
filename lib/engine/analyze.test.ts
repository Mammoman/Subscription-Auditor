import { describe, it, expect } from "vitest";
import { detectPriceHikes, scoreZombie, buildSubscriptions } from "./analyze";
import { Txn } from "./types";

const T = (
  d: string,
  amount: number,
  merchantRaw = "NETFLIX.COM CA",
  id = d + merchantRaw
): Txn => ({ id, date: new Date(d), merchantRaw, amount });

describe("detectPriceHikes", () => {
  it("finds a single upward change", () => {
    const h = detectPriceHikes([
      T("2025-01-01", 9.99),
      T("2025-02-01", 9.99),
      T("2025-03-01", 12.99),
    ]);
    expect(h).toHaveLength(1);
    expect(Math.round(h[0].pctChange)).toBe(30);
  });

  it("ignores flat and single-charge histories", () => {
    expect(
      detectPriceHikes([T("2025-01-01", 9.99), T("2025-02-01", 9.99)])
    ).toHaveLength(0);
    expect(detectPriceHikes([T("2025-01-01", 9.99)])).toHaveLength(0);
  });
});

describe("scoreZombie", () => {
  it("flags a dormant monthly sub as a zombie", () => {
    const z = scoreZombie({
      lastSeen: new Date("2025-01-01"),
      now: new Date("2025-06-15"),
      cadence: "monthly",
      monthlyCost: 15,
    });
    expect(z.isZombie).toBe(true);
  });

  it("does not flag a freshly-charged sub", () => {
    const z = scoreZombie({
      lastSeen: new Date("2025-06-05"),
      now: new Date("2025-06-15"),
      cadence: "monthly",
      monthlyCost: 15,
    });
    expect(z.isZombie).toBe(false);
  });
});

describe("buildSubscriptions", () => {
  it("builds one sub and ignores one-off purchases", () => {
    const subs = buildSubscriptions(
      [
        T("2025-01-05", 9.99),
        T("2025-02-05", 9.99),
        T("2025-03-05", 9.99),
        T("2025-04-05", 9.99),
        T("2025-02-14", 120, "BEST BUY #221", "a"),
        T("2025-03-02", 42, "SHELL OIL 7781", "b"),
      ],
      new Date("2025-04-20")
    );
    expect(subs).toHaveLength(1);
    expect(subs[0].merchant).toBe("Netflix");
    expect(subs[0].nextRenewal.getTime()).toBeGreaterThan(
      subs[0].lastSeen.getTime()
    );
    expect(Math.round(subs[0].monthlyCost)).toBe(10);
  });
});

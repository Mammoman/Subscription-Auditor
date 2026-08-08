import { describe, it, expect } from "vitest";
import {
  isTransfer,
  extractRecipient,
  buildTransfers,
  buildAccounts,
  DirectedTxn,
} from "./transfers";
import { Txn } from "./types";

const T = (d: string, amount: number, merchantRaw: string, id = d + merchantRaw): Txn => ({
  id,
  date: new Date(d),
  merchantRaw,
  amount,
});

describe("isTransfer", () => {
  it("flags transfers, not merchant charges", () => {
    expect(isTransfer("TRANSFER TO JOHN DOE")).toBe(true);
    expect(isTransfer("NIP/GTB/AMAKA OKAFOR/REF88")).toBe(true);
    expect(isTransfer("TRF/MUSA BELLO/LAG")).toBe(true);
    expect(isTransfer("NETFLIX.COM CA")).toBe(false);
    expect(isTransfer("SHELL OIL 7781")).toBe(false);
  });
});

describe("extractRecipient", () => {
  it("pulls the person's name from common formats (to and from)", () => {
    expect(extractRecipient("TRANSFER TO JOHN DOE 12:04")).toBe("John Doe");
    expect(extractRecipient("TRANSFER FROM JOHN DOE")).toBe("John Doe");
    expect(extractRecipient("NIP/GTB/AMAKA OKAFOR/REF88")).toBe("Amaka Okafor");
    expect(extractRecipient("TRF/MUSA BELLO/LAG")).toBe("Musa Bello");
  });
});

describe("buildAccounts", () => {
  const D = (
    d: string,
    amount: number,
    merchantRaw: string,
    direction: "debit" | "credit"
  ): DirectedTxn => ({ id: d + merchantRaw, date: new Date(d), merchantRaw, amount, direction });

  it("tracks money sent and received per account", () => {
    const txns: DirectedTxn[] = [
      D("2025-01-05", 5000, "TRANSFER TO JOHN DOE", "debit"),
      D("2025-02-05", 3000, "TRANSFER TO JOHN DOE", "debit"),
      D("2025-03-01", 8000, "TRANSFER FROM JOHN DOE", "credit"),
      D("2025-03-10", 200, "NETFLIX.COM CA", "debit"), // not a transfer
    ];
    const accounts = buildAccounts(txns);

    expect(accounts).toHaveLength(1);
    const john = accounts[0];
    expect(john.account).toBe("John Doe");
    expect(john.sentCount).toBe(2);
    expect(john.sentTotal).toBeCloseTo(8000);
    expect(john.receivedCount).toBe(1);
    expect(john.receivedTotal).toBeCloseTo(8000);
    expect(john.net).toBeCloseTo(0);
  });
});

describe("buildTransfers", () => {
  it("aggregates count and total sent per recipient", () => {
    const txns = [
      T("2025-01-05", 5000, "TRANSFER TO JOHN DOE"),
      T("2025-02-05", 3000, "TRANSFER TO JOHN DOE"),
      T("2025-02-20", 2000, "NIP/GTB/JOHN DOE/REF1"),
      T("2025-03-01", 10000, "TRF/AMAKA OKAFOR/LAG"),
      T("2025-01-15", 9.99, "NETFLIX.COM CA"), // not a transfer
    ];
    const result = buildTransfers(txns);

    expect(result).toHaveLength(2);
    const john = result.find((r) => r.recipient === "John Doe");
    expect(john?.count).toBe(3);
    expect(john?.totalSent).toBeCloseTo(10000);
    // sorted by total desc: John (10,000) before Amaka (10,000)? tie-break ok,
    // but Netflix must never appear
    expect(result.map((r) => r.recipient)).not.toContain("Netflix");
  });
});

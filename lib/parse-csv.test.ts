import { describe, it, expect } from "vitest";
import { parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("keeps debits and credits (tagged), skips only unparseable rows", () => {
    const csv = [
      "date,description,amount",
      "2025-01-05,NETFLIX.COM CA,15.49",
      "2025-02-05,SPOTIFY P1,10.99",
      "not-a-date,HULU,9.99",
      "2025-03-05,REFUND STORE,-20.00",
      "2025-04-05,GYM,abc",
    ].join("\n");

    const { rows, skipped } = parseCsv(csv);

    // 2 debits + 1 credit (the refund) kept; 2 unparseable skipped
    expect(rows).toHaveLength(3);
    expect(skipped).toHaveLength(2);
    const netflix = rows.find((r) => r.merchantRaw.includes("NETFLIX"));
    expect(netflix?.direction).toBe("debit");
    const refund = rows.find((r) => r.merchantRaw.includes("REFUND"));
    expect(refund?.direction).toBe("credit");
    expect(refund?.amount).toBeCloseTo(20);
  });

  it("tags negative-debit exports and keeps the deposit as a credit", () => {
    const csv = [
      "date,description,amount",
      "2025-01-05,NETFLIX,-15.49",
      "2025-02-05,SPOTIFY,-10.99",
      "2025-03-05,NETFLIX,-15.49",
      "2025-01-20,PAYROLL DEPOSIT,2000.00", // money in -> credit
    ].join("\n");

    const { rows } = parseCsv(csv);

    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.direction === "debit")).toHaveLength(3);
    const payroll = rows.find((r) => r.merchantRaw.includes("PAYROLL"));
    expect(payroll?.direction).toBe("credit");
    expect(rows.every((r) => r.amount > 0)).toBe(true);
  });

  it("tolerates header aliases and currency symbols (₦, £, €, $)", () => {
    const csv = [
      "Posted Date,Payee,Value",
      "2025-01-05,Amazon Prime,$139.00",
      '2025-02-05,DSTV,"₦24,500.00"',
      "2025-03-05,Spotify UK,£11.99",
      "2025-04-05,Netflix EU,€17.99",
    ].join("\n");
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.direction === "debit")).toBe(true);
    expect(rows[1].amount).toBeCloseTo(24500);
  });
});

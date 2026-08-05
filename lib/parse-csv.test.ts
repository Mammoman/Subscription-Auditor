import { describe, it, expect } from "vitest";
import { parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("keeps positive-convention charges and skips bad/credit rows", () => {
    const csv = [
      "date,description,amount",
      "2025-01-05,NETFLIX.COM CA,15.49",
      "2025-02-05,SPOTIFY P1,10.99",
      "not-a-date,HULU,9.99",
      "2025-03-05,REFUND STORE,-20.00",
      "2025-04-05,GYM,abc",
    ].join("\n");

    const { rows, skipped } = parseCsv(csv);

    expect(rows).toHaveLength(2);
    expect(skipped).toHaveLength(3);
    expect(rows[0].merchantRaw).toBe("NETFLIX.COM CA");
    expect(rows[0].amount).toBeCloseTo(15.49);
    // skipped is reported in line order: bad date (4), credit (5), bad amount (6)
    expect(skipped.map((s) => s.line)).toEqual([4, 5, 6]);
  });

  it("handles negative-debit exports (charges are negative)", () => {
    const csv = [
      "date,description,amount",
      "2025-01-05,NETFLIX,-15.49",
      "2025-02-05,SPOTIFY,-10.99",
      "2025-03-05,NETFLIX,-15.49",
      "2025-01-20,PAYROLL DEPOSIT,2000.00", // credit -> skipped
    ].join("\n");

    const { rows, skipped } = parseCsv(csv);

    expect(rows).toHaveLength(3);
    // magnitudes are normalized to positive charges
    expect(rows[0].amount).toBeCloseTo(15.49);
    expect(rows.every((r) => r.amount > 0)).toBe(true);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/credit|non-charge/i);
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
    expect(rows[0].amount).toBeCloseTo(139);
    expect(rows[1].amount).toBeCloseTo(24500);
    expect(rows[2].amount).toBeCloseTo(11.99);
    expect(rows[3].amount).toBeCloseTo(17.99);
  });
});

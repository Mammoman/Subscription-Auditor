import { describe, it, expect } from "vitest";
import { parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("keeps valid charges and skips bad rows with reasons", () => {
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
    // line numbers account for the header row
    expect(skipped.map((s) => s.line)).toEqual([4, 5, 6]);
  });

  it("tolerates header aliases and currency formatting", () => {
    const csv = [
      "Posted Date,Payee,Value",
      "2025-01-05,Amazon Prime,$139.00",
    ].join("\n");
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBeCloseTo(139);
  });
});

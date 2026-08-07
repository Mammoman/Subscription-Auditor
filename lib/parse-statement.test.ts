import { describe, it, expect } from "vitest";
import { parseStatementText, findDate } from "./parse-statement";

describe("findDate", () => {
  it("reads ISO, day-first slash, and textual dates", () => {
    expect(findDate("2025-01-05 NETFLIX 15.49")?.date.getUTCMonth()).toBe(0);
    // 13/02/2025 must be day-first (13 can't be a month)
    const dmy = findDate("13/02/2025 SPOTIFY 9.99");
    expect(dmy?.date.getUTCDate()).toBe(13);
    expect(dmy?.date.getUTCMonth()).toBe(1); // February
    expect(findDate("05 Jan 2025 ADOBE 54.99")?.date.getUTCMonth()).toBe(0);
    expect(findDate("Jan 5, 2025 ADOBE 54.99")?.date.getUTCMonth()).toBe(0);
  });

  it("ignores lines with no date", () => {
    expect(findDate("Opening Balance 1,000.00")).toBeNull();
  });
});

describe("parseStatementText", () => {
  it("extracts charges from a tabular statement, using amount not balance", () => {
    const text = [
      "FIRST BANK OF NIGERIA",
      "Date        Description            Debit       Balance",
      "05/01/2025  NETFLIX SUBSCRIPTION   15.49       1,234.56",
      "05/02/2025  SPOTIFY                10.99       1,180.00",
      "05/03/2025  SALARY CREDIT          250,000.00 CR  251,180.00",
      "Opening Balance                                 1,000.00",
    ].join("\n");

    const { rows, skipped } = parseStatementText(text);

    expect(rows).toHaveLength(2);
    expect(rows[0].merchantRaw).toContain("NETFLIX");
    expect(rows[0].amount).toBeCloseTo(15.49); // the txn, not the 1,234.56 balance
    expect(rows[1].amount).toBeCloseTo(10.99);
    // the CR salary line is recognized but skipped as a credit
    expect(skipped.some((s) => /credit/i.test(s.reason))).toBe(true);
  });

  it("handles single-amount lines and currency symbols", () => {
    const text = "12/04/2025  DSTV SUBSCRIPTION  ₦24,500.00";
    const { rows } = parseStatementText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBeCloseTo(24500);
    expect(rows[0].merchantRaw).toContain("DSTV");
  });
});

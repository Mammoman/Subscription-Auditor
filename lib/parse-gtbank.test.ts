import { describe, it, expect } from "vitest";
import { parseGtbank, looksLikeGtbank } from "./parse-gtbank";
import { parseBankStatement } from "./parse-bank";

const SAMPLE = [
  "CUSTOMER STATEMENT",
  "Account Type GTCrea8 eSavers",
  "Opening Balance 103.90",
  "Trans. Date Value Date Reference Debits Credits Balance Originating Branch Remarks",
  "03-Jul-2026 03-Jul-2026 '000014 2,000.00 2,103.90 635 AKIN ADESOLA TRANSFER BETWEEN CUSTOMERS",
  "05-Jul-2026 05-Jul-2026 ' 100.00 2,003.90 635 AKIN ADESOLA Stamp Duties STAMP DUTY CHARGE",
  "17-Jul-2026 17-Jul-2026 'API 20,000.00 22,003.90 635 AKIN ADESOLA NEFT TRANSFER UNIVERSITY UPKEEP",
  "22-Jul-2026 22-Jul-2026 'GTW 2,000.00 20,003.90 635 AKIN ADESOLA NIBSS Instant Payment Outward 000013 NIP TRANSFER TO WEMA - AYISAT ASHABI RUFAI",
].join("\n");

describe("GTBank parser", () => {
  it("detects the GTBank format", () => {
    expect(looksLikeGtbank(SAMPLE)).toBe(true);
    expect(looksLikeGtbank("random")).toBe(false);
  });

  it("derives direction from balance movement and reads the counterparty", () => {
    const { rows } = parseGtbank(SAMPLE);
    expect(rows).toHaveLength(4);

    // 103.90 -> 2,103.90 = credit
    expect(rows[0].direction).toBe("credit");
    expect(rows[0].amount).toBeCloseTo(2000);

    const stamp = rows.find((r) => /stamp duty/i.test(r.merchantRaw));
    expect(stamp?.direction).toBe("debit");
    expect(stamp?.amount).toBeCloseTo(100);

    const upkeep = rows.find((r) => /upkeep/i.test(r.merchantRaw));
    expect(upkeep?.direction).toBe("credit");

    const wema = rows.find((r) => /AYISAT/i.test(r.merchantRaw));
    expect(wema?.direction).toBe("debit");
    expect(wema?.merchantRaw).toBe("Transfer to AYISAT ASHABI RUFAI");
  });

  it("routes through the bank dispatcher", () => {
    expect(parseBankStatement(SAMPLE).format).toBe("gtbank");
  });
});

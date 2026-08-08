import { describe, it, expect } from "vitest";
import { parseOpay, looksLikeOpay } from "./parse-opay";

const SAMPLE = [
  "Trans. Time Value Date Description Debit(₦) Credit(₦) Balance After(₦) Channel Transaction Reference",
  "03 Jan 2026 14:10:01 03 Jan 2026 Transfer from EMMANUEL OLUWATOBILOBA YUSUF | OPay | 813****379 | family -- 4,000.00 4,000.00 Mobile 260103010100927724571799",
  "03 Jan 2026 14:11:08 03 Jan 2026 Auto-save to OWealth Balance 4,000.00 -- 0.00 Mobile 260103140300927416192161",
  "06 Jan 2026 14:09:21 06 Jan 2026 OPay Card Payment | Spotify 800.00 -- 0.00 WEB 260106330100004555011091",
  "03 Jan 2026 22:35:31 03 Jan 2026 Betting | 8126188197 | SPORTYBET 431.00 -- 0.00 Mobile 260103130100941508358666",
].join("\n");

describe("OPay parser", () => {
  it("detects the OPay format", () => {
    expect(looksLikeOpay(SAMPLE)).toBe(true);
    expect(looksLikeOpay("random text")).toBe(false);
  });

  it("parses direction from the debit/credit columns and cleans merchants", () => {
    const { rows } = parseOpay(SAMPLE);
    expect(rows).toHaveLength(4);

    const inflow = rows.find((r) => r.merchantRaw.startsWith("Transfer from"));
    expect(inflow?.direction).toBe("credit");
    expect(inflow?.amount).toBeCloseTo(4000);
    expect(inflow?.merchantRaw).toBe("Transfer from EMMANUEL OLUWATOBILOBA YUSUF");

    const save = rows.find((r) => r.merchantRaw.includes("OWealth"));
    expect(save?.direction).toBe("debit");

    const spotify = rows.find((r) => r.merchantRaw === "Spotify");
    expect(spotify?.direction).toBe("debit");
    expect(spotify?.amount).toBeCloseTo(800);

    const bet = rows.find((r) => r.merchantRaw === "SPORTYBET");
    expect(bet?.amount).toBeCloseTo(431);
  });
});

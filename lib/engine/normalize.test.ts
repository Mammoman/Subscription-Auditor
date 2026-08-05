import { describe, it, expect } from "vitest";
import { normalizeMerchant } from "./normalize";

describe("normalizeMerchant", () => {
  it("collapses processor noise + store numbers to one key", () => {
    const variants = [
      "NETFLIX.COM 866-579-7172 CA",
      "Netflix #4471",
      "SQ *NETFLIX",
      "netflix.com",
    ];
    const keys = new Set(variants.map(normalizeMerchant));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("netflix");
  });

  it("keeps distinct merchants distinct", () => {
    expect(normalizeMerchant("SPOTIFY P1A2B3")).not.toBe(normalizeMerchant("HULU"));
    expect(normalizeMerchant("SPOTIFY P1A2B3")).toBe("spotify");
    expect(normalizeMerchant("HULU")).toBe("hulu");
  });

  it("strips phone numbers and trailing state codes", () => {
    expect(normalizeMerchant("AUDIBLE*AB12CD 888-283-5051 NJ")).toBe("audible");
  });
});

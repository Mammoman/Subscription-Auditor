"use client";

import { CurrencyCode, CURRENCIES, BASE_CURRENCY } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";

const ORDER: CurrencyCode[] = ["NGN", "USD", "EUR", "GBP"];

export default function CurrencySelector() {
  const { currency, setCurrency, ratesLive } = useCurrency();

  const rateHint =
    currency === BASE_CURRENCY
      ? "Base currency (₦) — amounts as imported"
      : `Converted from ₦ · ${ratesLive ? "live rate" : "offline rate"}`;

  return (
    <div
      className="flex items-center overflow-hidden rounded-[3px] border border-fg/15"
      title={rateHint}
    >
      {ORDER.map((code) => {
        const active = code === currency;
        return (
          <button
            key={code}
            onClick={() => setCurrency(code)}
            title={CURRENCIES[code].label}
            className={
              "figures flex items-center gap-1 border-l border-fg/15 px-2.5 py-1.5 text-[0.68rem] uppercase tracking-wide transition first:border-l-0 " +
              (active
                ? "bg-fg text-paper"
                : "text-fg/55 hover:bg-fg/8 hover:text-fg")
            }
          >
            <span>{code}</span>
          </button>
        );
      })}
      <span
        className={
          "mx-1.5 h-1.5 w-1.5 rounded-full " +
          (ratesLive ? "bg-green" : "bg-fg/30")
        }
        title={ratesLive ? "Live exchange rates" : "Offline exchange rates"}
      />
    </div>
  );
}

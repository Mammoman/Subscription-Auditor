"use client";

import { CurrencyCode, CURRENCIES } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";

const ORDER: CurrencyCode[] = ["USD", "NGN", "EUR", "GBP"];

export default function CurrencySelector() {
  const { currency, setCurrency, rates, ratesLive } = useCurrency();

  const rate = rates[currency];
  const rateHint =
    currency === "USD"
      ? "Base currency"
      : `1 USD = ${CURRENCIES[currency].symbol}${rate.toLocaleString(undefined, {
          maximumFractionDigits: rate < 10 ? 2 : 0,
        })} · ${ratesLive ? "live rate" : "offline rate"}`;

  return (
    <div
      className="flex items-center gap-1 rounded-xl bg-fg/5 p-1"
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
              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition " +
              (active
                ? "bg-fg/15 text-fg"
                : "text-fg/50 hover:text-fg/80")
            }
          >
            <span className="text-sm">{CURRENCIES[code].symbol}</span>
            <span>{code}</span>
          </button>
        );
      })}
      <span
        className={
          "ml-1 mr-1 h-1.5 w-1.5 rounded-full " +
          (ratesLive ? "bg-good" : "bg-fg/30")
        }
        title={ratesLive ? "Live exchange rates" : "Offline exchange rates"}
      />
    </div>
  );
}

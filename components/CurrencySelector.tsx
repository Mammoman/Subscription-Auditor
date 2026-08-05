"use client";

import { CurrencyCode, CURRENCIES } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";

const ORDER: CurrencyCode[] = ["USD", "NGN", "EUR", "GBP"];

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
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
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/80")
            }
          >
            <span className="text-sm">{CURRENCIES[code].symbol}</span>
            <span>{code}</span>
          </button>
        );
      })}
    </div>
  );
}

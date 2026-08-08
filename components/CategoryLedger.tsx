"use client";

import { motion } from "framer-motion";
import { Summary } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

export default function CategoryLedger({ summary }: { summary: Summary }) {
  const money = useMoney();
  const data = summary.byCategory;
  const total = data.reduce((s, d) => s + d.total, 0);
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="glass flex h-full flex-col p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="eyebrow">By category</h2>
        <span className="figures text-xs text-fg/40">per month</span>
      </div>

      <div className="flex-1 space-y-3">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.total / total) * 100) : 0;
          return (
            <motion.div
              key={d.category}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg/80">{d.category}</span>
                <span className="figures text-sm text-fg tabular-nums">
                  {money(d.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-[6px] flex-1 overflow-hidden rounded-[1px] bg-fg/8">
                  <motion.div
                    className="h-full bg-fg/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.total / max) * 100}%` }}
                    transition={{ delay: 0.1 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="figures w-9 text-right text-xs text-fg/40">
                  {pct}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <hr className="rule my-3" />
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Total</span>
        <span className="figures text-base font-semibold text-fg">
          {money(total)}
        </span>
      </div>
    </div>
  );
}

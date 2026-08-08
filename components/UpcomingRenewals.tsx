"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { Summary } from "@/lib/client-types";
import { formatDate, cadenceLabel } from "@/lib/format";
import { useMoney } from "./CurrencyContext";

function daysUntil(iso: string): number {
  return Math.max(
    0,
    Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  );
}

export default function UpcomingRenewals({ summary }: { summary: Summary }) {
  const money = useMoney();
  const items = summary.upcoming;

  return (
    <div className="glass p-5">
      <div className="mb-2 flex items-baseline justify-between border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Upcoming charges</h2>
        <span className="figures text-xs text-fg/40">next 45 days</span>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg/40">
          Nothing renewing in the next 45 days.
        </p>
      ) : (
        <ul>
          {items.map((item, i) => {
            const days = daysUntil(item.date);
            const urgent = days <= 7;
            return (
              <motion.li
                key={item.merchant + item.date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 border-b border-fg/8 py-2.5 last:border-0"
              >
                <span className="figures w-24 shrink-0 text-xs text-fg/45">
                  {formatDate(item.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {item.merchant}
                  <span className="ml-2 text-xs text-fg/35">
                    {cadenceLabel(item.cadence)}
                  </span>
                </span>
                <span
                  className={clsx(
                    "figures shrink-0 text-[0.62rem] uppercase tracking-wide",
                    urgent ? "text-red" : "text-fg/40"
                  )}
                >
                  {days === 0 ? "today" : `in ${days}d`}
                </span>
                <span className="figures w-20 shrink-0 text-right text-sm font-medium text-fg">
                  {money(item.amount)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

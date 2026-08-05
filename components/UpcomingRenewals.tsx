"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { Summary } from "@/lib/client-types";
import { formatCurrency, formatDate, cadenceLabel } from "@/lib/format";

function daysUntil(iso: string): number {
  return Math.max(
    0,
    Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  );
}

export default function UpcomingRenewals({ summary }: { summary: Summary }) {
  const items = summary.upcoming;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Upcoming renewals
        </h2>
        <span className="text-xs text-white/40">next 45 days</span>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">
          Nothing renewing in the next 45 days.
        </p>
      ) : (
        <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-2">
          {items.map((item, i) => {
            const days = daysUntil(item.date);
            const urgent = days <= 7;
            return (
              <motion.div
                key={item.merchant + item.date}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-hover min-w-[150px] shrink-0 rounded-xl border border-white/5 bg-white/[0.03] p-4"
              >
                <div
                  className={clsx(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    urgent
                      ? "bg-danger/20 text-danger"
                      : "bg-white/10 text-white/60"
                  )}
                >
                  {days === 0 ? "today" : `in ${days}d`}
                </div>
                <p className="mt-3 truncate font-medium text-white">
                  {item.merchant}
                </p>
                <p className="text-xs text-white/40">
                  {cadenceLabel(item.cadence)}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-white">
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-xs text-white/40">{formatDate(item.date)}</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

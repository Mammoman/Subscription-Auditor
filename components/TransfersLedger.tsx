"use client";

import { motion } from "framer-motion";
import { TransferRecipientDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";
import { relativeTime } from "@/lib/format";

export default function TransfersLedger({
  transfers,
}: {
  transfers: TransferRecipientDTO[];
}) {
  const money = useMoney();
  if (transfers.length === 0) return null;

  const total = transfers.reduce((s, t) => s + t.totalSent, 0);
  const totalSends = transfers.reduce((s, t) => s + t.count, 0);
  const max = Math.max(1, ...transfers.map((t) => t.totalSent));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Transfers · people you&rsquo;ve paid</h2>
        <span className="figures text-xs text-fg/45">
          {transfers.length} {transfers.length === 1 ? "person" : "people"} ·{" "}
          {totalSends} sends
        </span>
      </div>

      <p className="mb-5 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
        You&rsquo;ve sent{" "}
        <span className="figures">{money(total, { cents: false })}</span>{" "}
        <span className="text-lg font-medium text-fg/45">
          across {transfers.length}{" "}
          {transfers.length === 1 ? "person" : "people"}
        </span>
      </p>

      <div className="glass divide-y divide-fg/8">
        {transfers.map((t, i) => (
          <motion.div
            key={t.recipient}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.3 }}
            className="flex items-center gap-4 p-4"
          >
            <span className="figures w-5 shrink-0 text-xs text-fg/35">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium text-fg">
                  {t.recipient}
                </span>
                <span className="figures shrink-0 text-base font-semibold text-fg">
                  {money(t.totalSent)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-[5px] flex-1 overflow-hidden rounded-[1px] bg-fg/8">
                  <motion.div
                    className="h-full bg-fg/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.totalSent / max) * 100}%` }}
                    transition={{ delay: 0.15 + i * 0.04, duration: 0.5 }}
                  />
                </div>
                <span className="figures shrink-0 text-xs text-fg/45">
                  ×{t.count}
                </span>
                <span className="figures hidden shrink-0 text-xs text-fg/35 sm:inline">
                  sent {relativeTime(t.lastSent)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

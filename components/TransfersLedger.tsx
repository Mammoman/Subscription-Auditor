"use client";

import { motion } from "framer-motion";
import { TransferRecipientDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

export default function TransfersLedger({
  recipients,
}: {
  recipients: TransferRecipientDTO[];
}) {
  const money = useMoney();
  if (recipients.length === 0) return null;

  const totalSent = recipients.reduce((s, r) => s + r.totalSent, 0);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Transfers · money sent by recipient</h2>
        <span className="figures text-xs text-fg/45">
          {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"} ·{" "}
          {money(totalSent, { cents: false })} total
        </span>
      </div>

      <div className="glass divide-y divide-fg/8">
        {recipients.map((r, i) => {
          const firstSent = new Date(r.firstSent).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          const lastSent = new Date(r.lastSent).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });

          return (
            <motion.div
              key={r.recipient}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.3 }}
              className="flex w-full items-center gap-4 p-4"
            >
              {/* Rank */}
              <span className="figures w-5 shrink-0 text-xs text-fg/35">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Name + date range */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium text-fg">{r.recipient}</span>
                  <span className="figures shrink-0 text-right text-sm font-semibold text-red/90">
                    {money(r.totalSent, { cents: false })}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-fg/45">
                  <span className="figures">
                    ×{r.count} {r.count === 1 ? "transfer" : "transfers"}
                  </span>
                  <span className="figures">
                    avg {money(r.avgSent, { cents: false })}
                  </span>
                  <span>
                    {firstSent === lastSent ? firstSent : `${firstSent} – ${lastSent}`}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { SubscriptionDTO } from "@/lib/client-types";
import { cadenceLabel, relativeTime } from "@/lib/format";
import { useMoney } from "./CurrencyContext";
import PriceSparkline from "./PriceSparkline";

interface Props {
  sub: SubscriptionDTO;
  onCancel: (sub: SubscriptionDTO) => void;
  canceling: boolean;
  index?: number;
}

const SubscriptionCard = forwardRef<HTMLDivElement, Props>(function SubscriptionCard(
  { sub, onCancel, canceling, index = 0 },
  ref
) {
  const money = useMoney();
  const topHike = sub.priceHikes[sub.priceHikes.length - 1];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        duration: 0.32,
        ease: "easeOut",
        delay: Math.min(index * 0.045, 0.6),
      }}
      className={clsx(
        "glass glass-hover relative flex flex-col p-5",
        sub.isZombie && "border-l-2 border-l-red"
      )}
    >
      {/* Merchant + cadence */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-fg">
            {sub.merchant}
          </h3>
          <p className="text-xs text-fg/40">{sub.category}</p>
        </div>
        <span className="figures shrink-0 text-[0.62rem] uppercase tracking-eyebrow text-fg/45">
          {cadenceLabel(sub.cadence)}
        </span>
      </div>

      {/* Amount line — the statement figure */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="figures text-2xl font-semibold tabular-nums text-fg">
            {money(sub.avgAmount)}
          </p>
          <p className="figures mt-0.5 text-xs text-fg/40">
            {money(sub.monthlyCost)}/mo · {money(sub.annualCost, { cents: false })}/yr
          </p>
        </div>
        <div className="text-right">
          <PriceSparkline history={sub.history} />
        </div>
      </div>

      {/* Flags — the auditor's marks */}
      {(sub.isZombie || topHike) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sub.isZombie && (
            <span className="stamp">
              <span className="h-1.5 w-1.5 rounded-full bg-red" />
              Still billing
            </span>
          )}
          {topHike && (
            <span className="figures inline-flex items-center gap-1 rounded-[2px] border border-amber/45 px-1.5 py-[3px] text-[0.62rem] font-semibold uppercase tracking-wide text-amber">
              ▲ +{Math.round(topHike.pctChange)}% · {money(topHike.fromAmount)}→
              {money(topHike.toAmount)}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-fg/10 pt-3">
        <p className="text-xs text-fg/45">
          {sub.isZombie
            ? `Last charged ${relativeTime(sub.lastSeen)}`
            : `Renews ${relativeTime(sub.nextRenewal)}`}
        </p>
        <button
          onClick={() => onCancel(sub)}
          disabled={canceling}
          className="figures text-xs font-medium uppercase tracking-wide text-fg/60 underline decoration-fg/25 underline-offset-4 transition hover:text-red hover:decoration-red disabled:opacity-50"
        >
          {canceling ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </motion.div>
  );
});

export default SubscriptionCard;

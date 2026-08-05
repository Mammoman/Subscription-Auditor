"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { SubscriptionDTO } from "@/lib/client-types";
import {
  formatCurrency,
  cadenceLabel,
  relativeTime,
} from "@/lib/format";
import PriceSparkline from "./PriceSparkline";

interface Props {
  sub: SubscriptionDTO;
  onCancel: (sub: SubscriptionDTO) => void;
  canceling: boolean;
}

const SubscriptionCard = forwardRef<HTMLDivElement, Props>(function SubscriptionCard(
  { sub, onCancel, canceling },
  ref
) {
  const topHike = sub.priceHikes[sub.priceHikes.length - 1];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={clsx(
        "glass glass-hover relative flex flex-col rounded-2xl p-5",
        sub.isZombie && "shadow-glow-danger ring-1 ring-danger/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">
            {sub.merchant}
          </h3>
          <p className="text-xs text-white/40">{sub.category}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
          {cadenceLabel(sub.cadence)}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-white">
            {formatCurrency(sub.avgAmount)}
          </p>
          <p className="text-xs text-white/40">
            {formatCurrency(sub.monthlyCost)}/mo ·{" "}
            {formatCurrency(sub.annualCost, { cents: false })}/yr
          </p>
        </div>
        <div className="text-right">
          <PriceSparkline history={sub.history} />
        </div>
      </div>

      {/* Flag row */}
      <div className="mt-4 flex flex-wrap gap-2">
        {sub.isZombie && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-medium text-danger">
            👻 Forgotten? · {sub.zombieScore}/100
          </span>
        )}
        {topHike && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-1 text-xs font-medium text-warn">
            ▲ +{Math.round(topHike.pctChange)}% price hike
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <p className="text-xs text-white/40">
          {sub.isZombie
            ? `Last charged ${relativeTime(sub.lastSeen)}`
            : `Renews ${relativeTime(sub.nextRenewal)}`}
        </p>
        <button
          onClick={() => onCancel(sub)}
          disabled={canceling}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          {canceling ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </motion.div>
  );
});

export default SubscriptionCard;

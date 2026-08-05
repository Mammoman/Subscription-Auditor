"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { SubscriptionDTO } from "@/lib/client-types";
import SubscriptionCard from "./SubscriptionCard";

type Filter = "all" | "zombie" | "hikes";

export default function SubscriptionList({
  subscriptions,
  onCancel,
  cancelingMerchant,
}: {
  subscriptions: SubscriptionDTO[];
  onCancel: (sub: SubscriptionDTO) => void;
  cancelingMerchant: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: subscriptions.length,
      zombie: subscriptions.filter((s) => s.isZombie).length,
      hikes: subscriptions.filter((s) => s.priceHikes.length > 0).length,
    }),
    [subscriptions]
  );

  const filtered = useMemo(() => {
    if (filter === "zombie") return subscriptions.filter((s) => s.isZombie);
    if (filter === "hikes")
      return subscriptions.filter((s) => s.priceHikes.length > 0);
    return subscriptions;
  }, [subscriptions, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "zombie", label: `Zombies ${counts.zombie}` },
    { key: "hikes", label: `Price hikes ${counts.hikes}` },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Subscriptions
        </h2>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filter === t.key
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="glass rounded-2xl py-10 text-center text-sm text-white/40">
          No subscriptions in this view.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((sub) => (
              <SubscriptionCard
                key={sub.merchant}
                sub={sub}
                onCancel={onCancel}
                canceling={cancelingMerchant === sub.merchant}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

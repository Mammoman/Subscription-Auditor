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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Itemized subscriptions</h2>
        <div className="flex overflow-hidden rounded-[3px] border border-fg/15">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={clsx(
                "figures border-l border-fg/15 px-3 py-1.5 text-[0.68rem] uppercase tracking-wide transition first:border-l-0",
                filter === t.key
                  ? "bg-fg text-paper"
                  : "text-fg/55 hover:bg-fg/8 hover:text-fg"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="glass py-10 text-center text-sm text-fg/40">
          No subscriptions in this view.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((sub, i) => (
              <SubscriptionCard
                key={sub.merchant}
                sub={sub}
                index={i}
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

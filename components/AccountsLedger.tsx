"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { AccountSummaryDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

export default function AccountsLedger({
  accounts,
  selected,
  onSelect,
}: {
  accounts: AccountSummaryDTO[];
  selected: string | null;
  onSelect: (account: string) => void;
}) {
  const money = useMoney();
  if (accounts.length === 0) return null;

  const totalSent = accounts.reduce((s, a) => s + a.sentTotal, 0);
  const totalReceived = accounts.reduce((s, a) => s + a.receivedTotal, 0);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Accounts · people you&rsquo;ve moved money with</h2>
        <span className="figures text-xs text-fg/45">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"} ·
          click to see history
        </span>
      </div>

      <p className="mb-5 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
        Sent <span className="figures text-red">{money(totalSent, { cents: false })}</span>
        <span className="text-lg font-medium text-fg/45"> · received </span>
        <span className="figures text-green">{money(totalReceived, { cents: false })}</span>
      </p>

      <div className="scrollbar-slim glass max-h-[65vh] divide-y divide-fg/8 overflow-y-auto">
        {accounts.map((a, i) => {
          const isActive = selected === a.account;
          return (
            <motion.button
              key={a.account}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.3 }}
              onClick={() => onSelect(a.account)}
              className={clsx(
                "flex w-full items-center gap-4 p-4 text-left transition",
                isActive ? "bg-fg/8" : "hover:bg-fg/[0.04]"
              )}
            >
              <span className="figures w-5 shrink-0 text-xs text-fg/35">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium text-fg">{a.account}</span>
                  <span className="figures shrink-0 text-xs text-fg/40">
                    view →
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
                  <span className="figures text-red/90">
                    ↑ sent {money(a.sentTotal)}{" "}
                    <span className="text-fg/35">×{a.sentCount}</span>
                  </span>
                  <span className="figures text-green">
                    ↓ received {money(a.receivedTotal)}{" "}
                    <span className="text-fg/35">×{a.receivedCount}</span>
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

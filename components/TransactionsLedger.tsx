"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { TransactionDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthShort(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function rowDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
  });
}

export default function TransactionsLedger({
  transactions,
}: {
  transactions: TransactionDTO[];
}) {
  const money = useMoney();
  const [selected, setSelected] = useState<string>("all");

  const { months, groups } = useMemo(() => {
    const g = new Map<string, TransactionDTO[]>();
    for (const t of transactions) {
      const k = monthKey(t.date);
      const bucket = g.get(k);
      if (bucket) bucket.push(t);
      else g.set(k, [t]);
    }
    const m = [...g.keys()].sort((a, b) => b.localeCompare(a));
    return { months: m, groups: g };
  }, [transactions]);

  if (transactions.length === 0) return null;

  const visible = selected === "all" ? months : [selected];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">All transactions</h2>
        <span className="figures text-xs text-fg/45">{transactions.length} total</span>
      </div>

      {/* Month filter — select a month or view all */}
      <div className="scrollbar-slim mb-4 flex gap-1 overflow-x-auto pb-1">
        <MonthChip
          label={`All ${transactions.length}`}
          active={selected === "all"}
          onClick={() => setSelected("all")}
        />
        {months.map((k) => (
          <MonthChip
            key={k}
            label={`${monthShort(k)} ${groups.get(k)!.length}`}
            active={selected === k}
            onClick={() => setSelected(k)}
          />
        ))}
      </div>

      <div className="space-y-6">
        {visible.map((k) => {
          const rows = groups.get(k) ?? [];
          const total = rows.reduce((s, t) => s + t.amount, 0);
          return (
            <div key={k}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-display text-sm font-semibold text-fg">
                  {monthLabel(k)}
                </h3>
                <span className="figures text-xs text-fg/45">
                  {rows.length} · {money(total)}
                </span>
              </div>
              <div className="glass divide-y divide-fg/8">
                {rows.map((t, i) => (
                  <Row key={t.id} t={t} money={money} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MonthChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "figures shrink-0 rounded-[3px] border px-2.5 py-1 text-[0.68rem] uppercase tracking-wide transition",
        active
          ? "border-fg bg-fg text-paper"
          : "border-fg/15 text-fg/55 hover:border-fg/40 hover:text-fg"
      )}
    >
      {label}
    </button>
  );
}

function Row({
  t,
  money,
  index,
}: {
  t: TransactionDTO;
  money: (n: number, opts?: { cents?: boolean }) => string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.008, 0.25) }}
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <span className="figures w-16 shrink-0 text-xs text-fg/45">
        {rowDate(t.date)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-fg/90">
        {t.merchant}
      </span>
      {t.isTransfer ? (
        <span className="figures shrink-0 text-[0.58rem] uppercase tracking-wide text-red/80">
          transfer
        </span>
      ) : (
        t.category && (
          <span className="hidden shrink-0 text-xs text-fg/35 sm:inline">
            {t.category}
          </span>
        )
      )}
      <span className="figures w-24 shrink-0 text-right text-sm text-fg">
        {money(t.amount)}
      </span>
    </motion.div>
  );
}

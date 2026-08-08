"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { TransactionDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

type Dir = "debit" | "credit";

function monthKey(iso: string): string {
  return iso.slice(0, 7);
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
  const [dir, setDir] = useState<Dir>("debit");
  const [selected, setSelected] = useState<string>("all");

  const counts = useMemo(
    () => ({
      debit: transactions.filter((t) => t.direction === "debit").length,
      credit: transactions.filter((t) => t.direction === "credit").length,
    }),
    [transactions]
  );

  const { months, groups, filteredCount } = useMemo(() => {
    const filtered = transactions.filter((t) => t.direction === dir);
    const g = new Map<string, TransactionDTO[]>();
    for (const t of filtered) {
      const k = monthKey(t.date);
      (g.get(k) ?? g.set(k, []).get(k)!).push(t);
    }
    const m = [...g.keys()].sort((a, b) => b.localeCompare(a));
    return { months: m, groups: g, filteredCount: filtered.length };
  }, [transactions, dir]);

  if (transactions.length === 0) return null;

  const visible =
    selected === "all" || !groups.has(selected) ? months : [selected];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-fg/12 pb-3">
        <h2 className="eyebrow">All transactions</h2>
        {/* Money out / in toggle */}
        <div className="flex overflow-hidden rounded-[3px] border border-fg/15">
          {(
            [
              ["debit", "Money out", counts.debit],
              ["credit", "Money in", counts.credit],
            ] as [Dir, string, number][]
          ).map(([key, label, n]) => (
            <button
              key={key}
              onClick={() => {
                setDir(key);
                setSelected("all");
              }}
              className={clsx(
                "figures border-l border-fg/15 px-3 py-1.5 text-[0.68rem] uppercase tracking-wide transition first:border-l-0",
                dir === key
                  ? key === "credit"
                    ? "bg-green text-paper"
                    : "bg-fg text-paper"
                  : "text-fg/55 hover:bg-fg/8 hover:text-fg"
              )}
            >
              {label} {n}
            </button>
          ))}
        </div>
      </div>

      {/* Month filter */}
      <div className="scrollbar-slim mb-3 flex gap-1 overflow-x-auto pb-1">
        <MonthChip
          label={`All ${filteredCount}`}
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

      {/* Scrollable ledger — contained so it never pushes the page around */}
      <div className="scrollbar-slim max-h-[65vh] space-y-6 overflow-y-auto rounded-[4px] border border-fg/10 bg-surface/40 p-4">
        {visible.map((k) => {
          const rows = groups.get(k) ?? [];
          const total = rows.reduce((s, t) => s + t.amount, 0);
          return (
            <div key={k}>
              <div className="sticky top-0 -mx-4 mb-2 flex items-baseline justify-between border-b border-fg/10 bg-paper/90 px-4 py-1.5 backdrop-blur">
                <h3 className="font-display text-sm font-semibold text-fg">
                  {monthLabel(k)}
                </h3>
                <span className="figures text-xs text-fg/45">
                  {rows.length} · {money(total)}
                </span>
              </div>
              <div className="divide-y divide-fg/8">
                {rows.map((t) => (
                  <Row key={t.id} t={t} money={money} />
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
}: {
  t: TransactionDTO;
  money: (n: number, opts?: { cents?: boolean }) => string;
}) {
  const credit = t.direction === "credit";
  return (
    <div className="flex items-center gap-3 py-2.5">
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
      <span
        className={clsx(
          "figures w-28 shrink-0 text-right text-sm",
          credit ? "text-green" : "text-fg"
        )}
      >
        {credit ? "+" : "−"}
        {money(t.amount)}
      </span>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import CountUp from "./CountUp";
import { Summary } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";

export default function HeroSummary({ summary }: { summary: Summary }) {
  const money = useMoney();
  const leaking = summary.zombieAnnualWaste > 0;

  const cells: {
    label: string;
    value: number;
    format: (n: number) => string;
    tone?: "red" | "amber";
    sub?: string;
  }[] = [
    {
      label: "Monthly spend",
      value: summary.monthlyTotal,
      format: (n) => money(n),
      sub: `${money(summary.annualTotal, { cents: false })}/yr`,
    },
    {
      label: "Active subs",
      value: summary.activeCount,
      format: (n) => Math.round(n).toString(),
      sub: "recurring merchants",
    },
    {
      label: "Zombies",
      value: summary.zombieCount,
      format: (n) => Math.round(n).toString(),
      tone: "red",
      sub: `${money(summary.zombieMonthlyWaste)}/mo unused`,
    },
    {
      label: "Price hikes",
      value: summary.priceHikeCount,
      format: (n) => Math.round(n).toString(),
      tone: "amber",
      sub: "increases detected",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass p-6"
    >
      <p className="eyebrow">Audit summary</p>

      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {leaking ? (
          <>
            You&rsquo;re leaking{" "}
            <span className="figures text-red">
              <CountUp
                value={summary.zombieAnnualWaste}
                format={(n) => money(n, { cents: false })}
              />
            </span>
            <span className="text-xl font-medium text-fg/45"> / yr</span>
          </>
        ) : (
          <>
            No wasted spend detected{" "}
            <span className="text-green">✓</span>
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-fg/50">
        {leaking
          ? `${summary.zombieCount} forgotten subscription${
              summary.zombieCount === 1 ? "" : "s"
            } still billing you.`
          : "Every recurring charge here looks active."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-fg/12 sm:grid-cols-4">
        {cells.map((c, i) => (
          <div key={c.label} className="bg-surface p-4">
            <p className="eyebrow">{c.label}</p>
            <p
              className={clsx(
                "figures mt-2 text-2xl font-semibold tabular-nums",
                c.tone === "red" && "text-red",
                c.tone === "amber" && "text-amber",
                !c.tone && "text-fg"
              )}
            >
              <CountUp value={c.value} format={c.format} duration={0.9 + i * 0.05} />
            </p>
            {c.sub && (
              <p className="figures mt-1 text-xs text-fg/40">{c.sub}</p>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

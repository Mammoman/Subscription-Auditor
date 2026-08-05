"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import CountUp from "./CountUp";
import { Summary } from "@/lib/client-types";
import { formatCurrency } from "@/lib/format";

interface Stat {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  tone?: "default" | "danger" | "warn";
  emphasize?: boolean;
}

export default function HeroSummary({ summary }: { summary: Summary }) {
  const stats: Stat[] = [
    {
      label: "Monthly spend",
      value: summary.monthlyTotal,
      format: (n) => formatCurrency(n),
      sub: `${formatCurrency(summary.annualTotal, { cents: false })} / year`,
    },
    {
      label: "Active subscriptions",
      value: summary.activeCount,
      format: (n) => Math.round(n).toString(),
      sub: "recurring merchants",
    },
    {
      label: "Wasted on zombies",
      value: summary.zombieMonthlyWaste,
      format: (n) => formatCurrency(n),
      sub: `${summary.zombieCount} forgotten · ${formatCurrency(
        summary.zombieAnnualWaste,
        { cents: false }
      )}/yr`,
      tone: "danger",
      emphasize: true,
    },
    {
      label: "Price hikes",
      value: summary.priceHikeCount,
      format: (n) => Math.round(n).toString(),
      sub: "detected increases",
      tone: "warn",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
          className={clsx(
            "glass glass-hover relative overflow-hidden rounded-2xl p-5",
            s.emphasize && "shadow-glow-danger"
          )}
        >
          {s.emphasize && (
            <span className="absolute right-4 top-4 h-2 w-2 animate-pulse-soft rounded-full bg-danger" />
          )}
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            {s.label}
          </p>
          <p
            className={clsx(
              "mt-2 text-3xl font-semibold tabular-nums",
              s.tone === "danger" && "text-danger",
              s.tone === "warn" && "text-warn",
              (!s.tone || s.tone === "default") && "text-white"
            )}
          >
            <CountUp value={s.value} format={s.format} />
          </p>
          {s.sub && <p className="mt-1 text-sm text-white/40">{s.sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}

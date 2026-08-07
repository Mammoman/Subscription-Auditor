"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Summary } from "@/lib/client-types";
import { formatMonth } from "@/lib/format";
import { useMoney } from "./CurrencyContext";
import { useChartColors } from "./ThemeContext";

export default function SpendTimeline({ summary }: { summary: Summary }) {
  const money = useMoney();
  const c = useChartColors();
  const data = summary.timeline.map((t) => ({
    month: formatMonth(t.month),
    total: t.total,
  }));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg/60">
          Spend over time
        </h2>
        <span className="text-xs text-fg/40">all transactions / month</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => money(v, { cents: false })}
            />
            <Tooltip
              cursor={{ stroke: c.cursor }}
              contentStyle={{
                background: c.tooltipBg,
                border: `1px solid ${c.tooltipBorder}`,
                borderRadius: 12,
                color: c.tooltipText,
              }}
              formatter={(v: number) => [money(v), "Spend"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#spendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

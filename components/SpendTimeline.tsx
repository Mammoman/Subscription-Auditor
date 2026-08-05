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
import { formatCurrency, formatMonth } from "@/lib/format";

export default function SpendTimeline({ summary }: { summary: Summary }) {
  const data = summary.timeline.map((t) => ({
    month: formatMonth(t.month),
    total: t.total,
  }));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Spend over time
        </h2>
        <span className="text-xs text-white/40">all transactions / month</span>
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
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => formatCurrency(v, { cents: false })}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)" }}
              contentStyle={{
                background: "rgba(12,12,20,0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#fff",
              }}
              formatter={(v: number) => [formatCurrency(v), "Spend"]}
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

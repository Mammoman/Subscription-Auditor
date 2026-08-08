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
    <div className="glass h-full p-5">
      <div className="mb-4 flex items-baseline justify-between border-b border-fg/12 pb-3">
        <h2 className="eyebrow">Monthly spend</h2>
        <span className="figures text-xs text-fg/40">all charges</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.ink} stopOpacity={0.2} />
                <stop offset="100%" stopColor={c.ink} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: c.tick, fontSize: 10, fontFamily: c.mono }}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: c.tick, fontSize: 10, fontFamily: c.mono }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v) => money(v, { cents: false })}
            />
            <Tooltip
              cursor={{ stroke: c.cursor, strokeDasharray: "3 3" }}
              contentStyle={{
                background: c.tooltipBg,
                border: `1px solid ${c.tooltipBorder}`,
                borderRadius: 3,
                color: c.tooltipText,
                fontFamily: c.mono,
                fontSize: 12,
              }}
              formatter={(v: number) => [money(v), "Spend"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={c.ink}
              strokeWidth={1.5}
              fill="url(#spendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

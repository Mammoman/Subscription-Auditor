"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Summary } from "@/lib/client-types";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#8b5cf6",
  "#22d3ee",
  "#6366f1",
  "#ec4899",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
];

export default function CategoryDonut({ summary }: { summary: Summary }) {
  const data = summary.byCategory;
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
        By category
      </h2>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(12,12,20,0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#fff",
                }}
                formatter={(v: number) => [formatCurrency(v) + "/mo", "Spend"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-white/40">per month</span>
            <span className="text-xl font-semibold text-white">
              {formatCurrency(total, { cents: false })}
            </span>
          </div>
        </div>
        <ul className="w-full space-y-2">
          {data.map((d, i) => (
            <li key={d.category} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-white/70">{d.category}</span>
              <span className="ml-auto tabular-nums text-white/50">
                {formatCurrency(d.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

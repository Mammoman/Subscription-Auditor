"use client";

import { PricePointDTO } from "@/lib/client-types";

/**
 * Tiny inline SVG sparkline of a subscription's charge amounts over time.
 * Segments where the price increased are drawn in the danger color.
 */
export default function PriceSparkline({
  history,
  width = 120,
  height = 32,
}: {
  history: PricePointDTO[];
  width?: number;
  height?: number;
}) {
  if (history.length < 2) return null;

  const amounts = history.map((h) => h.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = max - min || 1;
  const pad = 3;

  const points = amounts.map((a, i) => {
    const x = pad + (i / (amounts.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (a - min) / range) * (height - pad * 2);
    return { x, y };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      {points.slice(1).map((p, i) => {
        const prev = points[i];
        const rose = amounts[i + 1] > amounts[i];
        return (
          <line
            key={i}
            x1={prev.x}
            y1={prev.y}
            x2={p.x}
            y2={p.y}
            stroke={rose ? "#fb7185" : "#67e8f9"}
            strokeWidth={rose ? 2.5 : 1.75}
            strokeLinecap="round"
          />
        );
      })}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 2.5 : 1.5}
          fill={i === points.length - 1 ? "#c4b5fd" : "rgba(255,255,255,0.5)"}
        />
      ))}
    </svg>
  );
}

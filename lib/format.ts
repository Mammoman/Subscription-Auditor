export function formatCurrency(n: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(n);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(ym: string): string {
  // ym is "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Human relative time, e.g. "in 4 days", "2 months ago". */
export function relativeTime(d: Date | string, now: Date = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffDays = Math.round(
    (date.getTime() - now.getTime()) / 86_400_000
  );
  const abs = Math.abs(diffDays);
  const fmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 1) return "today";
  if (abs < 30) return fmt.format(diffDays, "day");
  if (abs < 365) return fmt.format(Math.round(diffDays / 30), "month");
  return fmt.format(Math.round(diffDays / 365), "year");
}

export function cadenceLabel(cadence: string): string {
  return (
    {
      weekly: "Weekly",
      biweekly: "Biweekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annual: "Annual",
    }[cadence] ?? cadence
  );
}

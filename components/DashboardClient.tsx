"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Summary, SubscriptionDTO } from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";
import CurrencySelector from "./CurrencySelector";
import ThemeToggle from "./ThemeToggle";
import HeroSummary from "./HeroSummary";
import SpendTimeline from "./SpendTimeline";
import CategoryDonut from "./CategoryDonut";
import UpcomingRenewals from "./UpcomingRenewals";
import SubscriptionList from "./SubscriptionList";
import ImportPanel from "./ImportPanel";
import MonoConnectButton from "./MonoConnectButton";
import ToastStack, { ToastMessage } from "./Toast";

// Mono bank-connect is dormant until a public key is configured.
const MONO_ENABLED = Boolean(process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY);

export default function DashboardClient() {
  const money = useMoney();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelingMerchant, setCancelingMerchant] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, tone?: ToastMessage["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [sRes, subRes] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }),
        fetch("/api/subscriptions", { cache: "no-store" }),
      ]);
      if (!sRes.ok || !subRes.ok) throw new Error("fetch failed");
      const s: Summary = await sRes.json();
      const { subscriptions: subs }: { subscriptions: SubscriptionDTO[] } =
        await subRes.json();
      setSummary(s);
      setSubscriptions(subs);
    } catch {
      toast("Couldn't load data. Is the server running?", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasData = subscriptions.length > 0;

  const monoButton = MONO_ENABLED ? (
    <MonoConnectButton
      onLinked={(n) => {
        toast(`Synced ${n} bank transactions`, "success");
        refresh();
      }}
      onError={(m) => toast(m, "danger")}
    />
  ) : null;

  async function loadDemo() {
    setBusy("seed");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const { seeded } = await res.json();
      toast(`Loaded ${seeded} demo transactions`, "success");
      await refresh();
    } catch {
      toast("Failed to load demo data", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function clearData() {
    setBusy("clear");
    try {
      await fetch("/api/clear", { method: "POST" });
      toast("Cleared all data", "info");
      await refresh();
    } catch {
      toast("Failed to clear data", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function importCsv(csv: string) {
    setBusy("import");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const { imported, skipped } = await res.json();
      toast(
        `Imported ${imported} charges${
          skipped?.length ? `, skipped ${skipped.length}` : ""
        }`,
        "success"
      );
      await refresh();
    } catch {
      toast("Import failed", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function importPdf(file: File) {
    setBusy("import");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import-pdf", { method: "POST", body: fd });
      if (!res.ok) throw new Error("pdf failed");
      const { imported, skipped } = await res.json();
      if (imported === 0) {
        toast("No transactions found in that PDF", "danger");
      } else {
        toast(
          `Imported ${imported} charges from PDF${
            skipped?.length ? `, skipped ${skipped.length}` : ""
          }`,
          "success"
        );
      }
      await refresh();
    } catch {
      toast("PDF import failed — try a CSV export instead", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function cancelSub(sub: SubscriptionDTO) {
    setCancelingMerchant(sub.merchant);
    // optimistic removal
    setSubscriptions((subs) => subs.filter((s) => s.merchant !== sub.merchant));
    try {
      await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant: sub.merchant }),
      });
      toast(
        `Cancelled ${sub.merchant} · saving ${money(sub.annualCost, {
          cents: false,
        })}/yr`,
        "success"
      );
      await refresh();
    } catch {
      toast("Cancel failed", "danger");
      await refresh();
    } finally {
      setCancelingMerchant(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/5 px-3 py-1 text-xs text-fg/60">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Kill your zombie subscriptions
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient">Subscription Auditor</span>
          </h1>
          <p className="mt-1 text-sm text-fg/50">
            Detect recurring charges, forgotten subscriptions, and sneaky price
            hikes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <CurrencySelector />
          <button
            onClick={loadDemo}
            disabled={busy !== null}
            className="rounded-xl bg-brand-grad px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === "seed" ? "Loading…" : "Load demo data"}
          </button>
          {hasData && (
            <button
              onClick={clearData}
              disabled={busy !== null}
              className="rounded-xl border border-fg/10 bg-fg/5 px-4 py-2 text-sm font-medium text-fg/70 transition hover:bg-fg/10 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState
          onLoadDemo={loadDemo}
          onImportCsv={importCsv}
          onImportPdf={importPdf}
          busy={busy}
          extra={monoButton}
        />
      ) : (
        <div className="space-y-6">
          {summary && <HeroSummary summary={summary} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {summary && <SpendTimeline summary={summary} />}
            </div>
            <div className="lg:col-span-2">
              {summary && <CategoryDonut summary={summary} />}
            </div>
          </div>

          {summary && <UpcomingRenewals summary={summary} />}

          <SubscriptionList
            subscriptions={subscriptions}
            onCancel={cancelSub}
            cancelingMerchant={cancelingMerchant}
          />

          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-fg/60">
                Add your own data
              </h2>
              {monoButton}
            </div>
            <ImportPanel
              onImportCsv={importCsv}
              onImportPdf={importPdf}
              busy={busy === "import"}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState({
  onLoadDemo,
  onImportCsv,
  onImportPdf,
  busy,
  extra,
}: {
  onLoadDemo: () => void;
  onImportCsv: (csv: string) => void;
  onImportPdf: (file: File) => void;
  busy: string | null;
  extra?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mx-auto max-w-2xl rounded-3xl p-10 text-center"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-grad text-3xl shadow-glow">
        👻
      </div>
      <h2 className="text-2xl font-semibold text-fg">
        Find your zombie subscriptions
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg/50">
        Load a realistic demo dataset to see the auditor detect recurring
        charges, forgotten subscriptions, and price hikes — or upload your own
        bank CSV.
      </p>
      <button
        onClick={onLoadDemo}
        disabled={busy !== null}
        className="mt-6 rounded-xl bg-brand-grad px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
      >
        {busy === "seed" ? "Loading…" : "Load demo data"}
      </button>
      <div className="mt-6">
        <ImportPanel
          onImportCsv={onImportCsv}
          onImportPdf={onImportPdf}
          busy={busy === "import"}
        />
      </div>
      {extra && <div className="mt-4 flex justify-center">{extra}</div>}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass h-28 animate-pulse-soft rounded-2xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="glass h-72 animate-pulse-soft rounded-2xl lg:col-span-3" />
        <div className="glass h-72 animate-pulse-soft rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Summary,
  SubscriptionDTO,
  AccountSummaryDTO,
  TransactionDTO,
} from "@/lib/client-types";
import { useMoney } from "./CurrencyContext";
import CurrencySelector from "./CurrencySelector";
import ThemeToggle from "./ThemeToggle";
import HeroSummary from "./HeroSummary";
import SpendTimeline from "./SpendTimeline";
import CategoryLedger from "./CategoryLedger";
import UpcomingRenewals from "./UpcomingRenewals";
import SubscriptionList from "./SubscriptionList";
import AccountsLedger from "./AccountsLedger";
import TransactionsLedger from "./TransactionsLedger";
import ImportPanel from "./ImportPanel";
import MonoConnectButton from "./MonoConnectButton";
import ToastStack, { ToastMessage } from "./Toast";

// Mono bank-connect is dormant until a public key is configured.
const MONO_ENABLED = Boolean(process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY);

export default function DashboardClient() {
  const money = useMoney();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountSummaryDTO[]>([]);
  const [txns, setTxns] = useState<TransactionDTO[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
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
      const [sRes, subRes, acRes, txRes] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }),
        fetch("/api/subscriptions", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/transactions", { cache: "no-store" }),
      ]);
      if (!sRes.ok || !subRes.ok || !acRes.ok || !txRes.ok)
        throw new Error("fetch failed");
      const s: Summary = await sRes.json();
      const { subscriptions: subs }: { subscriptions: SubscriptionDTO[] } =
        await subRes.json();
      const { accounts: acc }: { accounts: AccountSummaryDTO[] } =
        await acRes.json();
      const { transactions: tx }: { transactions: TransactionDTO[] } =
        await txRes.json();
      setSummary(s);
      setSubscriptions(subs);
      setAccounts(acc);
      setTxns(tx);
    } catch {
      toast("Couldn't load data. Is the server running?", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasSubs = subscriptions.length > 0;
  const txnCount = summary?.transactionCount ?? 0;
  const hasData = hasSubs || txnCount > 0;

  function selectAccount(account: string) {
    setSelectedAccount((prev) => (prev === account ? null : account));
    setTimeout(() => {
      document
        .getElementById("transactions-ledger")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

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
      const { imported, skipped, duplicates } = await res.json();
      toast(
        `Imported ${imported} charges${
          duplicates ? `, ${duplicates} duplicates skipped` : ""
        }${skipped?.length ? `, ${skipped.length} unreadable` : ""}`,
        "success"
      );
      await refresh();
    } catch {
      toast("Import failed", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function importPdf(file: File, password?: string) {
    setBusy("import");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (password) fd.append("password", password);
      const res = await fetch("/api/import-pdf", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.needsPassword) {
          const entered = window.prompt(
            password
              ? "Incorrect password. Try again:"
              : "This PDF is password-protected. Enter its password:"
          );
          if (entered) {
            await importPdf(file, entered);
            return;
          }
        }
        toast(data?.error || "PDF import failed — try a CSV export instead", "danger");
        return;
      }

      const { imported, skipped, duplicates, format } = data;
      const source =
        format === "opay" ? "OPay" : format === "gtbank" ? "GTBank" : "PDF";
      if (imported === 0 && !duplicates) {
        toast("No transactions found in that PDF", "danger");
      } else if (imported === 0 && duplicates) {
        toast(`Already imported — ${duplicates} duplicates skipped`, "info");
      } else {
        toast(
          `Imported ${imported} from ${source}${
            duplicates ? `, ${duplicates} duplicates skipped` : ""
          }${skipped?.length ? `, ${skipped.length} unreadable` : ""}`,
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

      {/* Masthead — the top of a statement */}
      <header className="mb-8 border-b border-fg/15 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Statement of recurring charges</p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              Subscription Auditor<span className="text-red">.</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <CurrencySelector />
            <button
              onClick={loadDemo}
              disabled={busy !== null}
              className="rounded-[3px] bg-fg px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === "seed" ? "Loading…" : "Load demo statement"}
            </button>
            {hasData && (
              <button
                onClick={clearData}
                disabled={busy !== null}
                className="rounded-[3px] border border-fg/20 px-4 py-2 text-sm font-medium text-fg/70 transition hover:border-fg/40 hover:text-fg disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm text-fg/50">
          Every recurring charge, itemized — with the forgotten ones and the
          price hikes flagged in red.
        </p>
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
          {hasSubs ? (
            <>
              {summary && <HeroSummary summary={summary} />}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  {summary && <SpendTimeline summary={summary} />}
                </div>
                <div className="lg:col-span-2">
                  {summary && <CategoryLedger summary={summary} />}
                </div>
              </div>

              {summary && <UpcomingRenewals summary={summary} />}

              <SubscriptionList
                subscriptions={subscriptions}
                onCancel={cancelSub}
                cancelingMerchant={cancelingMerchant}
              />
            </>
          ) : (
            <>
              {/* No subscriptions: lead with the accounts you've moved money with */}
              {accounts.length > 0 && (
                <AccountsLedger
                  accounts={accounts}
                  selected={selectedAccount}
                  onSelect={selectAccount}
                />
              )}
              <NoSubscriptionsNotice count={txnCount} />
              {summary && <SpendTimeline summary={summary} />}
            </>
          )}

          {hasSubs && accounts.length > 0 && (
            <AccountsLedger
              accounts={accounts}
              selected={selectedAccount}
              onSelect={selectAccount}
            />
          )}

          <TransactionsLedger
            transactions={txns}
            accountFilter={selectedAccount}
            onClearAccount={() => setSelectedAccount(null)}
          />

          <div className="glass p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="eyebrow">Append a statement</h2>
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

function NoSubscriptionsNotice({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border border-green/50 font-mono text-lg text-green">
          ✓
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">
            Imported {count} transaction{count === 1 ? "" : "s"} — but no
            recurring subscriptions yet
          </h2>
          <p className="mt-1 text-sm text-fg/50">
            A charge only counts as a subscription once the same merchant appears{" "}
            <strong className="text-fg/80">at least 3 times</strong>. Your spend
            is shown below — import a longer statement (more months of history)
            so repeat charges can be detected, or{" "}
            <span className="text-fg/80">Load demo data</span> to see the full
            experience.
          </p>
        </div>
      </div>
    </motion.div>
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
      className="glass mx-auto max-w-2xl p-8 sm:p-10"
    >
      <p className="eyebrow">No statement on file</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
        Audit your subscriptions
      </h2>
      <p className="mt-2 max-w-md text-sm text-fg/50">
        Load a realistic demo statement to watch the auditor flag recurring
        charges, forgotten subscriptions, and price hikes — or bring your own
        bank statement (CSV or PDF).
      </p>
      <button
        onClick={onLoadDemo}
        disabled={busy !== null}
        className="mt-6 rounded-[3px] bg-fg px-6 py-3 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
      >
        {busy === "seed" ? "Loading…" : "Load demo statement"}
      </button>
      <hr className="rule my-7" />
      <ImportPanel
        onImportCsv={onImportCsv}
        onImportPdf={onImportPdf}
        busy={busy === "import"}
      />
      {extra && <div className="mt-4">{extra}</div>}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass h-40 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="glass h-72 animate-pulse lg:col-span-3" />
        <div className="glass h-72 animate-pulse lg:col-span-2" />
      </div>
    </div>
  );
}

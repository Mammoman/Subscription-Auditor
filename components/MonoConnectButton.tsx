"use client";

import { useState } from "react";
import Script from "next/script";

/** Minimal typing for the Mono Connect widget injected by connect.js. */
interface MonoConnectInstance {
  setup: () => void;
  open: () => void;
}
interface MonoConnectCtor {
  new (opts: {
    key: string | undefined;
    onSuccess: (payload: { code: string }) => void;
    onClose?: () => void;
  }): MonoConnectInstance;
}
declare global {
  interface Window {
    Connect?: MonoConnectCtor;
  }
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;

export default function MonoConnectButton({
  onLinked,
  onError,
}: {
  onLinked: (imported: number) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  function openWidget() {
    if (!window.Connect) {
      onError("Mono widget is still loading — try again in a moment.");
      return;
    }
    const connect = new window.Connect({
      key: PUBLIC_KEY,
      onSuccess: async ({ code }) => {
        setBusy(true);
        try {
          const ex = await fetch("/api/mono/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!ex.ok) throw new Error("Account link failed");
          const { accountId } = await ex.json();

          const sync = await fetch("/api/mono/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId }),
          });
          if (!sync.ok) throw new Error("Transaction sync failed");
          const { imported } = await sync.json();
          onLinked(imported);
        } catch (e) {
          onError(e instanceof Error ? e.message : "Bank connection failed");
        } finally {
          setBusy(false);
        }
      },
    });
    connect.setup();
    connect.open();
  }

  return (
    <>
      <Script
        src="https://connect.withmono.com/connect.js"
        strategy="lazyOnload"
      />
      <button
        onClick={openWidget}
        disabled={busy}
        className="rounded-xl border border-fg/10 bg-fg/5 px-4 py-2 text-sm font-medium text-fg/80 transition hover:bg-fg/10 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "🏦 Connect your bank"}
      </button>
    </>
  );
}

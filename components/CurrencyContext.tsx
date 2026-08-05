"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CurrencyCode,
  CURRENCIES,
  formatCurrency,
} from "@/lib/format";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Format a number in the active currency. */
  money: (n: number, opts?: { cents?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "sa.currency";

function isCurrencyCode(v: string | null): v is CurrencyCode {
  return v !== null && v in CURRENCIES;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  // Load persisted preference on mount (client-only to avoid hydration mismatch).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(stored)) setCurrencyState(stored);
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const money = useCallback(
    (n: number, opts?: { cents?: boolean }) =>
      formatCurrency(n, currency, opts),
    [currency]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, money }),
    [currency, setCurrency, money]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/** Convenience: just the formatter bound to the active currency. */
export function useMoney() {
  return useCurrency().money;
}

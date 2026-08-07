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
  Rates,
  FALLBACK_RATES,
  convertAmount,
  formatCurrency,
} from "@/lib/format";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Convert from the base currency and format in the active currency. */
  money: (n: number, opts?: { cents?: boolean }) => string;
  rates: Rates;
  ratesLive: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "sa.currency";
const RATES_URL = "https://open.er-api.com/v6/latest/USD";

function isCurrencyCode(v: string | null): v is CurrencyCode {
  return v !== null && v in CURRENCIES;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
  const [ratesLive, setRatesLive] = useState(false);

  // Load persisted preference on mount (client-only to avoid hydration mismatch).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(stored)) setCurrencyState(stored);
  }, []);

  // Fetch live exchange rates; silently keep fallbacks if the request fails.
  useEffect(() => {
    let cancelled = false;
    fetch(RATES_URL)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.rates) return;
        setRates({
          USD: 1,
          EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
          GBP: data.rates.GBP ?? FALLBACK_RATES.GBP,
          NGN: data.rates.NGN ?? FALLBACK_RATES.NGN,
        });
        setRatesLive(true);
      })
      .catch(() => {
        /* offline / blocked — fallback rates remain in effect */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const money = useCallback(
    (n: number, opts?: { cents?: boolean }) =>
      formatCurrency(convertAmount(n, rates, currency), currency, opts),
    [currency, rates]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, money, rates, ratesLive }),
    [currency, setCurrency, money, rates, ratesLive]
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

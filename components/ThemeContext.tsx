"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "sa.theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default dark; the inline script in layout.tsx sets the class before paint
  // to avoid a flash, and we read the resolved class back here on mount.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    setThemeState(initial);
    apply(initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    apply(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      apply(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Theme-aware colors for Recharts (axis ticks, tooltips) which can't read CSS. */
export function useChartColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return {
    ink: isDark ? "#F1EAD8" : "#221C14",
    tick: isDark ? "rgba(241,234,216,0.45)" : "rgba(34,28,20,0.5)",
    fillTop: isDark ? "rgba(241,234,216,0.18)" : "rgba(34,28,20,0.14)",
    cursor: isDark ? "rgba(241,234,216,0.18)" : "rgba(34,28,20,0.18)",
    tooltipBg: isDark ? "#1E1A13" : "#F3ECDD",
    tooltipBorder: isDark ? "rgba(241,234,216,0.16)" : "rgba(34,28,20,0.16)",
    tooltipText: isDark ? "#F1EAD8" : "#221C14",
    mono: "var(--font-mono), ui-monospace, monospace",
  };
}

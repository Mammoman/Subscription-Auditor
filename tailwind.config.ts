import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware ink (near-white in dark, near-black in light) — drives
        // every neutral text/surface/border via alpha, e.g. text-fg/60.
        fg: "rgb(var(--fg) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        // Audit accents — one voice each, consistent across themes.
        red: "rgb(var(--red) / <alpha-value>)",
        green: "rgb(var(--green) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        // Back-compat aliases so existing status classes keep meaning.
        danger: "rgb(var(--red) / <alpha-value>)",
        good: "rgb(var(--green) / <alpha-value>)",
        warn: "rgb(var(--amber) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      keyframes: {
        "print-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "print-in": "print-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

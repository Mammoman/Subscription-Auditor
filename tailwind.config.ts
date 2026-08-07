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
        // Theme-aware foreground: white-ish in dark, near-black in light.
        // Drives every neutral surface/text/border via alpha (e.g. text-fg/50).
        fg: "rgb(var(--fg) / <alpha-value>)",
        ink: {
          950: "#07070c",
          900: "#0a0a12",
          800: "#12121d",
          700: "#1a1a29",
        },
        brand: {
          violet: "#8b5cf6",
          indigo: "#6366f1",
          cyan: "#22d3ee",
          pink: "#ec4899",
        },
        danger: "#fb7185",
        warn: "#fbbf24",
        good: "#34d399",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 40px -12px rgba(0,0,0,0.7)",
        glow: "0 0 40px -8px rgba(139,92,246,0.5)",
        "glow-danger": "0 0 40px -6px rgba(251,113,133,0.55)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #22d3ee 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

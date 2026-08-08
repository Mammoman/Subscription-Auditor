"use client";

import { motion } from "framer-motion";
import { useTheme } from "./ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
      className="figures flex h-8 w-8 items-center justify-center rounded-[3px] border border-fg/15 text-fg/60 transition hover:border-fg/40 hover:text-fg"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="text-sm leading-none"
      >
        {isDark ? "◐" : "◑"}
      </motion.span>
    </button>
  );
}

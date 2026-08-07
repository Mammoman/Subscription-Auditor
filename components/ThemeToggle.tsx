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
      className="glass glass-hover flex h-9 w-9 items-center justify-center rounded-xl text-fg/70 hover:text-fg"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="text-base"
      >
        {isDark ? "☀️" : "🌙"}
      </motion.span>
    </button>
  );
}

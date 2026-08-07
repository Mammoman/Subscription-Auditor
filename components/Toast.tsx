"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

export interface ToastMessage {
  id: number;
  text: string;
  tone?: "info" | "success" | "danger";
}

export default function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={clsx(
              "glass pointer-events-auto max-w-xs rounded-xl px-4 py-3 text-sm shadow-glass",
              t.tone === "success" && "border-good/30 text-good",
              t.tone === "danger" && "border-danger/30 text-danger",
              (!t.tone || t.tone === "info") && "text-fg/80"
            )}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface PdfPasswordModalProps {
  /** null = hidden; "first" = initial prompt; "retry" = wrong password */
  mode: "first" | "retry" | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PdfPasswordModal({
  mode,
  onSubmit,
  onCancel,
}: PdfPasswordModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input whenever the modal opens.
  useEffect(() => {
    if (mode) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [mode]);

  // Close on Escape.
  useEffect(() => {
    if (!mode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onCancel]);

  if (!mode) return null;

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-pwd-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="glass mx-4 w-full max-w-sm p-6">
        <p className="eyebrow mb-1">Encrypted PDF</p>
        <h2
          id="pdf-pwd-title"
          className="font-display text-lg font-semibold text-fg"
        >
          {mode === "retry"
            ? "Incorrect password — try again"
            : "This PDF is password-protected"}
        </h2>
        <p className="mt-1 text-sm text-fg/50">
          Enter the password your bank uses to protect statement PDFs.
        </p>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSubmit(value.trim());
          }}
        >
          <input
            ref={inputRef}
            id="pdf-password-input"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="PDF password"
            className="w-full rounded-[3px] border border-fg/20 bg-paper px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:border-fg/50 focus:outline-none"
          />
          {mode === "retry" && (
            <p className="mt-1.5 text-xs text-red">
              That password was incorrect. Please try again.
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 rounded-[3px] bg-fg px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
            >
              Unlock PDF
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[3px] border border-fg/20 px-4 py-2 text-sm font-medium text-fg/70 transition hover:border-fg/40 hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

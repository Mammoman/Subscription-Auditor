"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm p-7">
        <p className="eyebrow">Subscription Auditor</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
          {mode === "login" ? "Sign in to your audit" : "Create your account"}
          <span className="text-red">.</span>
        </h1>
        <p className="mt-1 text-sm text-fg/50">
          {mode === "login"
            ? "Your statements, subscriptions, and accounts — private to you."
            : "Import your statements and audit your spending privately."}
        </p>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <Field
              label="Name (optional)"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Your name"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[3px] bg-fg px-4 py-2.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-fg/50">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="font-medium text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="mt-1.5 w-full rounded-[3px] border border-fg/20 bg-paper px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:border-fg/50 focus:outline-none"
      />
    </label>
  );
}

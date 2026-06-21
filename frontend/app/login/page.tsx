"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="13" width="5" height="8.5" rx="1.5" fill="#34d399" />
      <rect x="9.5" y="7" width="5" height="14.5" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.5" fill="#34d399" opacity="0.6" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push(next);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setNotice("Account created. If email confirmation is on, check your inbox, then log in.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#07090e] px-6 text-[#e4e7f0]">
      <Link
        href="/"
        className="mb-10 flex items-center gap-2.5"
        style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
      >
        <Logo />
        <span className="text-sm font-bold uppercase tracking-widest text-[#e4e7f0]">
          The Breakdown
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1
            className="text-2xl font-bold text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1.5 text-sm text-[#5a607a]">
            {mode === "login"
              ? "Sign in to access every pick."
              : "Free account — every sport, every pick."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-6">
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#1e2236] bg-[#07090e] px-3 py-2.5 text-sm text-[#e4e7f0] outline-none transition-colors duration-150 placeholder:text-[#3a3e55] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1e2236] bg-[#07090e] px-3 py-2.5 text-sm text-[#e4e7f0] outline-none transition-colors duration-150 placeholder:text-[#3a3e55] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {notice && <p className="text-sm text-emerald-400">{notice}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 w-full text-center text-xs text-[#5a607a] transition-colors duration-150 hover:text-[#b0b8d0]"
          >
            {mode === "login" ? "No account? Sign up free" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07090e]" />}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
        router.push("/dashboard");
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-sm font-bold uppercase tracking-widest">
          The Breakdown
        </Link>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h1 className="mb-1 text-xl font-semibold">
            {mode === "login" ? "Log in" : "Create account"}
          </h1>
          <p className="mb-5 text-sm text-neutral-500">
            {mode === "login" ? "Access your predictions." : "Free tier — soccer picks."}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {notice && <p className="text-sm text-emerald-400">{notice}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
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
            className="mt-4 w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          >
            {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    </main>
  );
}

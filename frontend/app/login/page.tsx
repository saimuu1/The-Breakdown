"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { MIN_AGE } from "@/lib/legal";
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

/** Turn raw Supabase auth errors into something a person wants to read. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account — log in instead.";
  }
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("at least 6")) return "Password must be at least 6 characters.";
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup" && !agreed) {
      setError(`You must be ${MIN_AGE}+ and agree to the Terms and Privacy Policy.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyError(error.message));
      else {
        router.push(next);
        router.refresh();
      }
    } else {
      // Record consent durably in the user's auth metadata — proof of age
      // confirmation + terms acceptance without a separate table/migration.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            age_confirmed: true,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (error) setError(friendlyError(error.message));
      else if (data.session) {
        // Email confirmation is off → the user is already signed in. Go straight in.
        router.push(next);
        router.refresh();
      } else {
        // Email confirmation is on → they must verify before they can sign in.
        setNotice("Account created — check your inbox to confirm your email, then log in.");
      }
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
            {mode === "signup" && (
              <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed text-[#5a607a]">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                />
                <span>
                  I confirm I am {MIN_AGE}+ and agree to the{" "}
                  <Link href="/terms" className="text-[#b0b8d0] underline hover:text-[#e4e7f0]">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#b0b8d0] underline hover:text-[#e4e7f0]">
                    Privacy Policy
                  </Link>
                  . Predictions are for entertainment, not betting advice.
                </span>
              </label>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {notice && <p className="text-sm text-emerald-400">{notice}</p>}
            <button
              type="submit"
              disabled={loading || (mode === "signup" && !agreed)}
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

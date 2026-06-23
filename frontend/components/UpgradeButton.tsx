"use client";

import { useState } from "react";

/** Kicks off Stripe Checkout: POSTs to /api/checkout and redirects to the
   hosted payment page. In test mode use card 4242 4242 4242 4242, any future
   expiry, any CVC. */
export function UpgradeButton({
  className,
  children = "Go Pro",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={loading}
        className={
          className ??
          "rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400 disabled:opacity-60"
        }
      >
        {loading ? "Redirecting…" : children}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

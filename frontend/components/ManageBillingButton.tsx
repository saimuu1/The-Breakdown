"use client";

import { useState } from "react";

/** Opens the Stripe Customer Portal so a Pro user can update or cancel. */
export function ManageBillingButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={open}
        disabled={loading}
        className={
          className ??
          "rounded-xl border border-[#272b3f] px-5 py-2.5 font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#3a3e55] hover:text-[#e4e7f0] disabled:opacity-60"
        }
      >
        {loading ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

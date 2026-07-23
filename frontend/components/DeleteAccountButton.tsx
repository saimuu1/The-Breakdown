"use client";

import { useState } from "react";

/** Two-step "delete my account": a button that reveals a confirm row, then POSTs
   to /api/account/delete and redirects home. Destructive + irreversible, so it
   never fires on a single click. */
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not delete the account.");
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[#b0b8d0]">
        This permanently deletes your account, your follows, and your preferences. This can&apos;t
        be undone.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors duration-150 hover:bg-red-400 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Yes, delete my account"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg border border-[#272b3f] px-4 py-2 text-sm font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#3a3e55] hover:text-[#e4e7f0]"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

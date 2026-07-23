"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BILLING_ENABLED } from "@/lib/flags";

export function ProfileMenu({ email, plan = "free" }: { email: string; plan?: "free" | "pro" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-[#1e2236] bg-[#0c0f1a] shadow-2xl shadow-black/50">
          <div className="border-b border-[#1e2236] px-4 py-3">
            <p className="truncate text-xs text-[#5a607a]">{email}</p>
            {BILLING_ENABLED && (
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  plan === "pro"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-[#1e2236] text-[#8b92a8]"
                }`}
              >
                {plan === "pro" ? "Pro" : "Free"}
              </span>
            )}
          </div>
          {BILLING_ENABLED && (
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-[#b0b8d0] transition-colors duration-150 hover:bg-[#111420] hover:text-[#e4e7f0]"
            >
              <StarIcon />
              {plan === "pro" ? "Manage plan" : "Upgrade to Pro"}
            </Link>
          )}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-[#b0b8d0] transition-colors duration-150 hover:bg-[#111420] hover:text-[#e4e7f0]"
          >
            <GearIcon />
            Settings
          </Link>
          <form action="/auth/signout" method="post" className="border-t border-[#1e2236]">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-[#b0b8d0] transition-colors duration-150 hover:bg-[#111420] hover:text-[#e4e7f0]"
            >
              <SignOutIcon />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StarIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export function ProfileMenu({ email }: { email: string }) {
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
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 text-xs font-bold text-neutral-900 shadow-md shadow-emerald-500/20 transition hover:brightness-110 focus:outline-none"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0d0f17] shadow-2xl shadow-black/60">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="truncate text-xs text-neutral-400">{email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
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

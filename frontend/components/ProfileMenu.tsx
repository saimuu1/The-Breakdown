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
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400 focus:outline-none"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-[#1e2236] bg-[#0c0f1a] shadow-2xl shadow-black/50">
          <div className="border-b border-[#1e2236] px-4 py-3">
            <p className="truncate text-xs text-[#5a607a]">{email}</p>
          </div>
          <form action="/auth/signout" method="post">
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

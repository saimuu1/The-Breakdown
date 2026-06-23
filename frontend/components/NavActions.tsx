"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BILLING_ENABLED } from "@/lib/flags";
import { ProfileMenu } from "./ProfileMenu";

const linkCls =
  "text-sm font-medium text-[#7a8099] transition-colors duration-150 hover:text-[#e4e7f0]";

/** Right side of the nav: inline links on desktop, a hamburger dropdown on mobile
   so the links never overflow on small screens. Account/Login stays visible at
   every width. */
export function NavActions({
  loggedIn,
  email,
  plan,
}: {
  loggedIn: boolean;
  email: string;
  plan: "free" | "pro";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { href: "/dashboard", label: "Upcoming" },
    { href: "/past", label: "Past" },
    ...(loggedIn
      ? [
          { href: "/favorites", label: "Following" },
          { href: "/accuracy", label: "Track record" },
        ]
      : []),
  ];
  const showGoPro = BILLING_ENABLED && loggedIn && plan === "free";

  return (
    <div className="flex items-center gap-4 md:gap-6">
      {/* Desktop: inline links */}
      <div className="hidden items-center gap-6 md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={linkCls}>
            {l.label}
          </Link>
        ))}
        {showGoPro && (
          <Link
            href="/pricing"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400 transition-colors duration-150 hover:bg-emerald-500/15"
          >
            Go Pro
          </Link>
        )}
      </div>

      {/* Account / Login — visible at every width */}
      {loggedIn ? (
        <ProfileMenu email={email} plan={plan} />
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
        >
          Log in
        </Link>
      )}

      {/* Mobile: hamburger dropdown */}
      <div ref={ref} className="relative md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2236] text-[#b0b8d0] transition-colors duration-150 hover:border-[#2e3248] hover:text-[#e4e7f0]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-[#1e2236] bg-[#0c0f1a] shadow-2xl shadow-black/50">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-[#b0b8d0] transition-colors duration-150 hover:bg-[#111420] hover:text-[#e4e7f0]"
              >
                {l.label}
              </Link>
            ))}
            {showGoPro && (
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-emerald-400 transition-colors duration-150 hover:bg-[#111420]"
              >
                Go Pro
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { APP_NAV } from "./appNav";

/** Slim top bar with a hamburger drawer — the sidebar's stand-in on mobile. */
export function MobileTopBar({ email, followingCount }: { email: string; followingCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#07090e]/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2.5" y="13" width="5" height="8.5" rx="1.5" fill="#34d399" />
            <rect x="9.5" y="7" width="5" height="14.5" rx="1.5" fill="#34d399" opacity="0.8" />
            <rect x="16.5" y="2.5" width="5" height="19" rx="1.5" fill="#34d399" opacity="0.6" />
          </svg>
          <span
            className="text-xs font-bold uppercase tracking-widest text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            The Breakdown
          </span>
        </Link>

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2236] text-[#b0b8d0] transition-colors duration-150 hover:border-[#2e3248] hover:text-[#e4e7f0]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-[#1e2236] bg-[#0c0f1a] shadow-2xl shadow-black/50">
              <div className="border-b border-[#1e2236] px-4 py-3">
                <p className="truncate text-xs text-[#5a607a]">{email}</p>
              </div>
              {APP_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-[#111420] ${
                      active ? "text-emerald-400" : "text-[#b0b8d0] hover:text-[#e4e7f0]"
                    }`}
                  >
                    <span className={active ? "text-emerald-400" : "text-[#5a607a]"}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/favorites" && followingCount > 0 && (
                      <span className="rounded-full bg-[#1e2236] px-1.5 py-0.5 text-[10px] font-semibold text-[#8b92a8]">
                        {followingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              <form action="/auth/signout" method="post" className="border-t border-[#1e2236]">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#b0b8d0] transition-colors duration-150 hover:bg-[#111420] hover:text-[#e4e7f0]"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

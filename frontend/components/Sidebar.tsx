"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV } from "./appNav";

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="13" width="5" height="8.5" rx="1.5" fill="#34d399" />
      <rect x="9.5" y="7" width="5" height="14.5" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.5" fill="#34d399" opacity="0.6" />
    </svg>
  );
}

/** The persistent product sidebar for the signed-in app (desktop). */
export function Sidebar({ email, followingCount }: { email: string; followingCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.05] bg-[#080a10] md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5 no-underline">
        <Logo />
        <span
          className="text-sm font-bold uppercase tracking-widest text-[#e4e7f0]"
          style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
        >
          The Breakdown
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {APP_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-[#7a8099] hover:bg-white/[0.03] hover:text-[#e4e7f0]"
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
      </nav>

      <div className="border-t border-white/[0.05] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-neutral-950">
            {email.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-[#7a8099]">{email}</span>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#5a607a] transition-colors duration-150 hover:bg-white/[0.05] hover:text-[#e4e7f0]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

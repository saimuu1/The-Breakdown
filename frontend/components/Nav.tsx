import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ProfileMenu } from "./ProfileMenu";

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nav-logo-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="13" width="5" height="8.5" rx="2" fill="url(#nav-logo-grad)" />
      <rect x="9.5" y="7" width="5" height="14.5" rx="2" fill="url(#nav-logo-grad)" />
      <rect x="16.5" y="2.5" width="5" height="19" rx="2" fill="url(#nav-logo-grad)" />
    </svg>
  );
}

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070810]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Logo />
          <span className="text-sm font-bold uppercase tracking-widest text-neutral-100">
            The Breakdown
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium tracking-wide text-neutral-400 transition hover:text-neutral-100"
          >
            Upcoming
          </Link>
          <Link
            href="/past"
            className="text-sm font-medium tracking-wide text-neutral-400 transition hover:text-neutral-100"
          >
            Past
          </Link>
          {user && (
            <>
              <Link
                href="/favorites"
                className="text-sm font-medium tracking-wide text-neutral-400 transition hover:text-neutral-100"
              >
                Favorites
              </Link>
              <Link
                href="/accuracy"
                className="text-sm font-medium tracking-wide text-neutral-400 transition hover:text-neutral-100"
              >
                Track record
              </Link>
            </>
          )}

          {user ? (
            <ProfileMenu email={user.email ?? ""} />
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-1.5 text-sm font-medium text-neutral-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-300 hover:to-emerald-400"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

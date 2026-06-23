import Link from "next/link";

import { getMyPlan } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ProfileMenu } from "./ProfileMenu";

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="13" width="5" height="8.5" rx="1.5" fill="#34d399" />
      <rect x="9.5" y="7" width="5" height="14.5" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.5" fill="#34d399" opacity="0.6" />
    </svg>
  );
}

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const plan = user ? await getMyPlan() : "free";

  return (
    <nav className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#07090e]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Logo />
          <span
            className="text-sm font-bold uppercase tracking-widest text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            The Breakdown
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#7a8099] transition-colors duration-150 hover:text-[#e4e7f0]"
          >
            Upcoming
          </Link>
          <Link
            href="/past"
            className="text-sm font-medium text-[#7a8099] transition-colors duration-150 hover:text-[#e4e7f0]"
          >
            Past
          </Link>
          {user && (
            <>
              <Link
                href="/favorites"
                className="text-sm font-medium text-[#7a8099] transition-colors duration-150 hover:text-[#e4e7f0]"
              >
                Following
              </Link>
              <Link
                href="/accuracy"
                className="text-sm font-medium text-[#7a8099] transition-colors duration-150 hover:text-[#e4e7f0]"
              >
                Track record
              </Link>
            </>
          )}

          {user && plan === "free" && (
            <Link
              href="/pricing"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400 transition-colors duration-150 hover:bg-emerald-500/15"
            >
              Go Pro
            </Link>
          )}

          {user ? (
            <ProfileMenu email={user.email ?? ""} plan={plan} />
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

import Link from "next/link";

import { getMyPlan } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NavActions } from "./NavActions";

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

        <NavActions loggedIn={!!user} email={user?.email ?? ""} plan={plan} />
      </div>
    </nav>
  );
}

import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-bold uppercase tracking-widest text-neutral-100">
          The Breakdown
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="text-neutral-300 hover:text-white">
            Upcoming
          </Link>
          <Link href="/past" className="text-neutral-300 hover:text-white">
            Past
          </Link>
          {user && (
            <>
              <Link href="/favorites" className="text-neutral-300 hover:text-white">
                Favorites
              </Link>
              <Link href="/accuracy" className="text-neutral-300 hover:text-white">
                Track record
              </Link>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-neutral-500 sm:block">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button className="text-neutral-400 hover:text-white" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-neutral-950 hover:bg-emerald-400"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

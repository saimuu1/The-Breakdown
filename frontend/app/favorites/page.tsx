import Link from "next/link";

import { Nav } from "@/components/Nav";
import { PredictionGrid } from "@/components/PredictionGrid";
import { getFavoriteMatchIds, getFavoritePredictions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [predictions, favoriteIds] = await Promise.all([
    getFavoritePredictions(),
    getFavoriteMatchIds(),
  ]);

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}>Favorites</h1>
          <p className="mt-2 text-[#5a607a]">The matchups you&apos;re tracking, all in one place.</p>
        </header>

        <PredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          empty={
            user ? (
              <p className="text-[#b0b8d0]">
                No favorites yet — tap the ☆ on any prediction to track it.
              </p>
            ) : (
              <div>
                <p className="text-neutral-200">Log in to save favorites.</p>
                <Link
                  href="/login"
                  className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 hover:bg-emerald-400"
                >
                  Log in
                </Link>
              </div>
            )
          }
        />
      </main>
    </div>
  );
}

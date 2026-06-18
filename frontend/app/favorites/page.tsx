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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Favorites</h1>
          <p className="mt-1 text-neutral-400">The matchups you&apos;re tracking, all in one place.</p>
        </header>

        <PredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          empty={
            user ? (
              <p className="text-neutral-300">
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

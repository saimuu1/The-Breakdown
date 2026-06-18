import Link from "next/link";

import { Nav } from "@/components/Nav";
import { PredictionGrid } from "@/components/PredictionGrid";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SportTabs } from "@/components/SportTabs";
import { getFavoriteMatchIds, getPredictions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // always reflect the current user's RLS view

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport = "" } = await searchParams;
  const [predictions, favoriteIds] = await Promise.all([
    getPredictions("upcoming", sport || undefined),
    getFavoriteMatchIds(),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <RealtimeRefresher />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Upcoming</h1>
          <p className="mt-1 text-neutral-400">
            Win probabilities and a plain-English breakdown for the fights and games ahead.
          </p>
        </header>

        <SportTabs basePath="/dashboard" active={sport} />

        <PredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          empty={<EmptyMessage sport={sport} loggedIn={!!user} />}
        />
      </main>
    </div>
  );
}

const SPORT_NAME: Record<string, string> = { ufc: "UFC", soccer: "soccer", nba: "NBA" };

function EmptyMessage({ sport, loggedIn }: { sport: string; loggedIn: boolean }) {
  // A specific sport is selected but has no upcoming games (e.g. NBA offseason).
  if (sport && loggedIn) {
    return (
      <div>
        <p className="text-lg font-medium text-neutral-200">
          No upcoming {SPORT_NAME[sport] ?? sport} predictions right now.
        </p>
        <p className="mt-2 text-sm">
          Check the <Link href={`/past?sport=${sport}`} className="text-emerald-400 hover:underline">
          past predictions</Link> for the latest completed games, or another sport above.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-lg font-medium text-neutral-200">No upcoming predictions on your plan.</p>
      <p className="mx-auto mt-2 max-w-md text-sm">
        Soccer is free — log in to see World Cup picks. UFC &amp; NBA are Pro-tier; the database
        enforces this, so free accounts can&apos;t see paid picks.
      </p>
      {!loggedIn && (
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 hover:bg-emerald-400"
        >
          Log in
        </Link>
      )}
    </div>
  );
}

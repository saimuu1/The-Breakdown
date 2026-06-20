import Link from "next/link";

import { FightCard } from "@/components/FightCard";
import { GroupedPredictionGrid } from "@/components/GroupedPredictionGrid";
import { Nav } from "@/components/Nav";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SearchBar } from "@/components/SearchBar";
import { SportTabs } from "@/components/SportTabs";
import { isMarqueeFight } from "@/lib/marquee";
import {
  getFavoriteMatchIds,
  getPredictions,
  predictionMatchesQuery,
  withinUpcomingWindow,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // always reflect the current user's RLS view

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; q?: string }>;
}) {
  const { sport: sportParam, q = "" } = await searchParams;
  const sport = sportParam || "ufc"; // no "All" view — default to UFC
  const [all, favoriteIds] = await Promise.all([
    getPredictions("upcoming", sport),
    getFavoriteMatchIds(),
  ]);

  const search = q.trim();
  const windowed = search
    ? all.filter((p) => predictionMatchesQuery(p, search))
    : withinUpcomingWindow(all);

  // Pin the soonest marquee matchups (champions, megastars, big nations) to the
  // top — capped so the Spotlight stays a tight "can't-miss" strip, not a wall.
  // Not while searching — a search should return exactly what was asked for.
  const SPOTLIGHT_MAX = 5;
  const spotlight = search ? [] : windowed.filter(isMarqueeFight).slice(0, SPOTLIGHT_MAX);
  const spotlightIds = new Set(spotlight.map((p) => p.id));
  const predictions = windowed.filter((p) => !spotlightIds.has(p.id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#070810] text-neutral-100">
      <Nav />
      <RealtimeRefresher />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            The board
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">Upcoming</h1>
          <p className="mt-3 max-w-xl text-lg text-neutral-400">
            {search
              ? `Upcoming results for “${search}”.`
              : "We already called every matchup. Here's who wins — and exactly why."}
          </p>
        </header>

        <SportTabs basePath="/dashboard" active={sport} />
        <SearchBar
          sport={sport}
          q={q}
          basePath="/dashboard"
          placeholder="Search an upcoming fighter, team, or event…"
        />

        {spotlight.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <h2 className="text-xl font-bold tracking-tight text-neutral-100">Spotlight</h2>
              <span className="text-sm text-neutral-500">— the can&apos;t-miss matchups</span>
            </div>
            <div className="grid gap-4">
              {spotlight.map((p) => (
                <FightCard
                  key={p.id}
                  p={p}
                  favorited={favoriteIds.has(p.match.id)}
                  spotlight
                />
              ))}
            </div>
          </section>
        )}

        <GroupedPredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          variant="premium"
          empty={
            search ? (
              <p className="text-neutral-300">No upcoming predictions match “{search}”.</p>
            ) : (
              <EmptyMessage sport={sport} loggedIn={!!user} />
            )
          }
        />
      </main>
    </div>
  );
}

const SPORT_NAME: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

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
  if (!loggedIn) {
    return (
      <div>
        <p className="text-lg font-medium text-neutral-200">Log in to see the picks.</p>
        <p className="mx-auto mt-2 max-w-md text-sm">
          A free account unlocks every Soccer, UFC, and NBA prediction — upcoming and past.
        </p>
        <Link
          href="/login?next=/dashboard"
          className="mt-5 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 hover:bg-emerald-400"
        >
          Create a free account
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="text-lg font-medium text-neutral-200">No upcoming predictions right now.</p>
      <p className="mx-auto mt-2 max-w-md text-sm">
        Nothing on the schedule at the moment. Check the{" "}
        <Link href="/past" className="text-emerald-400 hover:underline">
          past predictions
        </Link>{" "}
        for recent completed games.
      </p>
    </div>
  );
}

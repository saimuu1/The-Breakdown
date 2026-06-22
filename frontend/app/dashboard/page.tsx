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

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; q?: string }>;
}) {
  const { sport: sportParam, q = "" } = await searchParams;
  const sport = sportParam || "ufc";
  const [all, favoriteIds] = await Promise.all([
    getPredictions("upcoming", sport),
    getFavoriteMatchIds(),
  ]);

  const search = q.trim();
  const windowed = search
    ? all.filter((p) => predictionMatchesQuery(p, search))
    : withinUpcomingWindow(all);

  const SPOTLIGHT_MAX = 5;
  const spotlight = search ? [] : windowed.filter(isMarqueeFight).slice(0, SPOTLIGHT_MAX);
  const spotlightIds = new Set(spotlight.map((p) => p.id));
  const predictions = windowed.filter((p) => !spotlightIds.has(p.id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <Nav />
      <RealtimeRefresher />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            The board
          </span>
          <h1
            className="mt-4 text-5xl font-bold tracking-tight text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Upcoming
          </h1>
          <p className="mt-3 max-w-xl text-lg text-[#5a607a]">
            {search
              ? `Upcoming results for "${search}".`
              : "Every matchup called before the first bell. Here's who wins — and why."}
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
            <div className="mb-5 flex items-baseline gap-3">
              <h2
                className="text-lg font-bold tracking-tight text-[#e4e7f0]"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                Spotlight
              </h2>
              <span className="text-sm text-[#5a607a]">can&apos;t-miss matchups</span>
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
              <p className="text-[#b0b8d0]">No upcoming predictions match &ldquo;{search}&rdquo;.</p>
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
  // NBA is between seasons — be explicit that games will populate automatically
  // once the new season tips off (the ingest pulls upcoming fixtures from ESPN).
  if (sport === "nba" && loggedIn) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-4xl">🏀</span>
        <p className="mt-4 text-lg font-semibold text-[#b0b8d0]">The NBA is between seasons.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#5a607a]">
          No games to call right now. Upcoming matchups will appear here automatically
          the moment the new season tips off — check back then.
        </p>
        <Link
          href="/past?sport=nba"
          className="mt-5 inline-block rounded-lg border border-[#1e2236] px-4 py-2 text-sm font-medium text-[#b0b8d0] transition-colors duration-150 hover:border-[#2e3248] hover:text-[#e4e7f0]"
        >
          Revisit this year&apos;s playoffs →
        </Link>
      </div>
    );
  }
  if (sport && loggedIn) {
    return (
      <div>
        <p className="text-lg font-medium text-[#b0b8d0]">
          No upcoming {SPORT_NAME[sport] ?? sport} predictions right now.
        </p>
        <p className="mt-2 text-sm text-[#5a607a]">
          Check the{" "}
          <Link href={`/past?sport=${sport}`} className="text-emerald-400 hover:underline">
            past predictions
          </Link>{" "}
          for the latest completed games, or another sport above.
        </p>
      </div>
    );
  }
  if (!loggedIn) {
    return (
      <div>
        <p className="text-lg font-medium text-[#b0b8d0]">Log in to see the picks.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#5a607a]">
          A free account unlocks every Soccer, UFC, and NBA prediction — upcoming and past.
        </p>
        <Link
          href="/login?next=/dashboard"
          className="mt-5 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400"
        >
          Create a free account
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="text-lg font-medium text-[#b0b8d0]">No upcoming predictions right now.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#5a607a]">
        Nothing on the schedule at the moment. Check the{" "}
        <Link href="/past" className="text-emerald-400 hover:underline">
          past predictions
        </Link>{" "}
        for recent completed games.
      </p>
    </div>
  );
}

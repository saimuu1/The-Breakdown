import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { FightCard } from "@/components/FightCard";
import { GroupedPredictionGrid } from "@/components/GroupedPredictionGrid";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { SearchBar } from "@/components/SearchBar";
import { SportTabs } from "@/components/SportTabs";
import { UpgradeButton } from "@/components/UpgradeButton";
import accuracy from "@/lib/accuracy.json";
import { BILLING_ENABLED } from "@/lib/flags";
import { isMarqueeFight } from "@/lib/marquee";
import {
  getFollowedCompetitorIds,
  getMyPlan,
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
  const sport = sportParam || "soccer";
  const [all, followedCompetitorIds] = await Promise.all([
    getPredictions("upcoming", sport),
    getFollowedCompetitorIds(),
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
  const plan = user ? await getMyPlan() : "free";

  // UFC and NBA are Pro-tier sports; a free user's board for them is empty
  // because RLS hides Pro predictions. Show an upsell rather than "nothing here."
  const PRO_SPORTS = new Set(["ufc", "nba"]);
  const lockedForFree = BILLING_ENABLED && !!user && plan === "free" && PRO_SPORTS.has(sport);

  return (
    <AppShell>
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

        {!search && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Following" value={String(followedCompetitorIds.size)} sub="teams & fighters" />
            <StatTile label={`Upcoming ${SPORT_NAME[sport] ?? sport}`} value={String(windowed.length)} sub="calls on the board" />
            <StatTile
              label="Model accuracy"
              value={accuracy.model.brier.toFixed(3)}
              sub={`Brier · market ${accuracy.market.brier.toFixed(3)}`}
            />
          </div>
        )}

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
                  followedCompetitorIds={followedCompetitorIds}
                  spotlight
                />
              ))}
            </div>
          </section>
        )}

        <GroupedPredictionGrid
          predictions={predictions}
          followedCompetitorIds={followedCompetitorIds}
          variant="premium"
          empty={
            search ? (
              <p className="text-[#b0b8d0]">No upcoming predictions match &ldquo;{search}&rdquo;.</p>
            ) : lockedForFree ? (
              <ProUpsell sport={sport} />
            ) : (
              <EmptyMessage sport={sport} loggedIn={!!user} />
            )
          }
        />
      </main>
    </AppShell>
  );
}

const SPORT_NAME: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#141826] bg-[#0c0f1a] px-4 py-3.5">
      <p className="truncate text-xs font-medium text-[#5a607a]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#e4e7f0]">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#3a3e55]">{sub}</p>}
    </div>
  );
}

function ProUpsell({ sport }: { sport: string }) {
  const name = SPORT_NAME[sport] ?? sport;
  return (
    <div className="flex flex-col items-center">
      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
        Pro
      </span>
      <p className="mt-4 text-lg font-semibold text-[#e4e7f0]">
        {name} predictions are a Pro feature.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#5a607a]">
        Unlock every {name} pick — plus NBA and the full Breakdown analysis on every card —
        with Pro. Soccer stays free.
      </p>
      <div className="mt-6">
        <UpgradeButton>Go Pro — $9/mo</UpgradeButton>
      </div>
    </div>
  );
}

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
          href="/login?next=/dashboard&mode=signup"
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

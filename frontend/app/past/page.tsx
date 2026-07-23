import { AppShell } from "@/components/AppShell";
import { GroupedPredictionGrid } from "@/components/GroupedPredictionGrid";
import { SearchBar } from "@/components/SearchBar";
import { SportTabs } from "@/components/SportTabs";
import {
  getFollowedCompetitorIds,
  getPastPredictions,
  predictionMatchesQuery,
  type PredictionView,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

// The NBA past board shows ONLY this year's playoffs, grouped by series. The
// 2025-26 regular season ends 2026-04-13 and the play-in runs 04-14 to 04-17
// (single-elimination, not series). The playoffs proper (best-of-7 rounds) start
// 2026-04-18, so we cut there — every group is then a real series. Our NBA data
// is a static this-year snapshot, so a date cutoff is the simplest separator.
const NBA_PLAYOFFS_START = "2026-04-18";

function seriesKey(p: PredictionView): string {
  return [p.match.home.name, p.match.away.name].sort().join(" | ");
}

/** This year's playoffs, as true series. A best-of-7 series always has 2+ games;
   dropping single-game matchups removes any play-in straggler that lands on the
   cutoff date, so every group on the board is an actual series. */
function nbaPlayoffs(preds: PredictionView[]): PredictionView[] {
  const postseason = preds.filter((p) => p.match.starts_at >= NBA_PLAYOFFS_START);
  const counts = new Map<string, number>();
  for (const p of postseason) counts.set(seriesKey(p), (counts.get(seriesKey(p)) ?? 0) + 1);
  return postseason.filter((p) => (counts.get(seriesKey(p)) ?? 0) >= 2);
}

function latestNumberedCard(
  preds: PredictionView[],
): { event: string | null; preds: PredictionView[] } {
  if (preds.length === 0) return { event: null, preds };
  const isNumbered = (name: string | null) => !!name && !/fight night/i.test(name);
  const target = preds.find((p) => isNumbered(p.match.event_name)) ?? preds[0];
  const event = target.match.event_name;
  if (event) {
    return { event, preds: preds.filter((p) => p.match.event_name === event) };
  }
  const day = target.match.starts_at.slice(0, 10);
  return { event: null, preds: preds.filter((p) => p.match.starts_at.slice(0, 10) === day) };
}

export default async function PastPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; q?: string; event?: string }>;
}) {
  const { sport: sportParam, q = "", event = "" } = await searchParams;
  const sport = sportParam || "soccer";

  // Always load the full recent past — search is done in-memory below so
  // every team / fighter name is findable without a round-trip per query.
  // NBA goes back further so the whole playoff bracket is covered.
  const [all, followedCompetitorIds] = await Promise.all([
    getPastPredictions({ sport, event: event || undefined, limit: sport === "nba" ? 200 : 120 }),
    getFollowedCompetitorIds(),
  ]);

  const search = q.trim();
  let predictions = all;
  let blurb = "Every pick we've published for events that have already happened — most recent first.";

  if (sport === "nba") {
    // NBA past = this year's playoffs only, grouped by date.
    const playoffs = nbaPlayoffs(all);
    if (search) {
      predictions = playoffs.filter((p) => predictionMatchesQuery(p, search));
      blurb = `Playoff results for "${search}".`;
    } else {
      predictions = playoffs;
      blurb = "Every pick from this year's NBA playoffs — all the way to the Finals.";
    }
  } else if (search) {
    predictions = all.filter((p) => predictionMatchesQuery(p, search));
    blurb = `Results for "${search}".`;
  } else if (event) {
    blurb = `Showing event: ${event}.`;
  } else if (sport === "ufc") {
    const { preds } = latestNumberedCard(all);
    predictions = preds;
    if (preds.length) {
      blurb = "Here's how the latest card shook out. Search any fighter or event to dig further back.";
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <h1
            className="text-4xl font-bold tracking-tight text-[#e4e7f0]"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Past predictions
          </h1>
          <p className="mt-2 text-[#5a607a]">{blurb}</p>
        </header>

        <SportTabs basePath="/past" active={sport} />
        <SearchBar sport={sport} q={q} basePath="/past" />

        <GroupedPredictionGrid
          predictions={predictions}
          followedCompetitorIds={followedCompetitorIds}
          groupBy={sport === "nba" ? "series" : "auto"}
          empty={
            search ? (
              <div>
                <p className="text-[#b0b8d0]">No past predictions for &ldquo;{search}&rdquo;.</p>
                <p className="mt-1 text-sm text-[#5a607a]">
                  They may not have played yet —{" "}
                  <a
                    href={`/dashboard?sport=${sport}&q=${encodeURIComponent(search)}`}
                    className="text-emerald-400 hover:underline"
                  >
                    check Upcoming
                  </a>.
                </p>
              </div>
            ) : (
              <p className="text-[#b0b8d0]">No past predictions in this category yet.</p>
            )
          }
        />
      </main>
    </AppShell>
  );
}

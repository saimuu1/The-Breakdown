import { Nav } from "@/components/Nav";
import { PredictionGrid } from "@/components/PredictionGrid";
import { SearchBar } from "@/components/SearchBar";
import { SportTabs } from "@/components/SportTabs";
import { getFavoriteMatchIds, getPastPredictions, type PredictionView } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Same-pair set as the most recent game (for NBA "last series only"). */
function lastSeries(preds: PredictionView[]): PredictionView[] {
  if (preds.length === 0) return preds;
  const top = preds[0].match;
  const pair = new Set([top.home.name, top.away.name]);
  return preds.filter(
    (p) => pair.has(p.match.home.name) && pair.has(p.match.away.name),
  );
}

/** Narrow to the most recent UFC card (group by event_name). */
function latestCard(preds: PredictionView[]): { event: string | null; preds: PredictionView[] } {
  const event = preds.find((p) => p.match.event_name)?.match.event_name ?? null;
  if (!event) return { event: null, preds };
  return { event, preds: preds.filter((p) => p.match.event_name === event) };
}

export default async function PastPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; q?: string; event?: string }>;
}) {
  const { sport = "", q = "", event = "" } = await searchParams;
  const [all, favoriteIds] = await Promise.all([
    getPastPredictions({ sport: sport || undefined, q: q || undefined, event: event || undefined }),
    getFavoriteMatchIds(),
  ]);

  // Smart defaults when not searching / not viewing a specific card.
  let predictions = all;
  let blurb = "Every pick we've published for events that have already happened — most recent first.";
  if (!q && !event) {
    if (sport === "ufc") {
      const { event: latest, preds } = latestCard(all);
      predictions = preds;
      if (latest) blurb = `Showing the latest card: ${latest}. Search a fighter to go further back.`;
    } else if (sport === "nba") {
      predictions = lastSeries(all);
      if (predictions.length) {
        const m = predictions[0].match;
        blurb = `Showing the last series: ${m.home.name} vs ${m.away.name}. Search a team for more.`;
      }
    }
  } else if (q) {
    blurb = `Results for “${q}”.`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Past predictions</h1>
          <p className="mt-1 text-neutral-400">{blurb}</p>
        </header>

        <SportTabs basePath="/past" active={sport} />
        <SearchBar sport={sport} q={q} />

        <PredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          empty={
            <p className="text-neutral-300">
              {q ? `No past predictions match “${q}”.` : "No past predictions in this category yet."}
            </p>
          }
        />
      </main>
    </div>
  );
}

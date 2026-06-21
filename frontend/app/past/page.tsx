import { GroupedPredictionGrid } from "@/components/GroupedPredictionGrid";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SportTabs } from "@/components/SportTabs";
import { getFavoriteMatchIds, getPastPredictions, type PredictionView } from "@/lib/queries";

export const dynamic = "force-dynamic";

function lastSeries(preds: PredictionView[]): PredictionView[] {
  if (preds.length === 0) return preds;
  const top = preds[0].match;
  const pair = new Set([top.home.name, top.away.name]);
  return preds.filter(
    (p) => pair.has(p.match.home.name) && pair.has(p.match.away.name),
  );
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
  const sport = sportParam || "ufc";
  const [all, favoriteIds] = await Promise.all([
    getPastPredictions({ sport, q: q || undefined, event: event || undefined }),
    getFavoriteMatchIds(),
  ]);

  let predictions = all;
  let blurb = "Every pick we've published for events that have already happened — most recent first.";
  if (!q && !event) {
    if (sport === "ufc") {
      const { preds } = latestNumberedCard(all);
      predictions = preds;
      if (preds.length) {
        blurb = "Here's how the latest card shook out. Search any fighter or event to dig further back.";
      }
    } else if (sport === "nba") {
      predictions = lastSeries(all);
      if (predictions.length) {
        const m = predictions[0].match;
        blurb = `Showing the last series: ${m.home.name} vs ${m.away.name}. Search a team for more.`;
      }
    }
  } else if (q) {
    blurb = `Results for "${q}".`;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <Nav />
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
          favoriteIds={favoriteIds}
          empty={
            <p className="text-[#b0b8d0]">
              {q ? `No past predictions match "${q}".` : "No past predictions in this category yet."}
            </p>
          }
        />
      </main>
    </div>
  );
}

import { FightCard } from "@/components/FightCard";
import { PredictionCard } from "@/components/PredictionCard";
import type { PredictionView } from "@/lib/queries";

const UNIT: Record<string, [string, string]> = {
  ufc: ["fight", "fights"],
  soccer: ["match", "matches"],
  nba: ["game", "games"],
};

function unit(sportId: string, n: number): string {
  const [one, many] = UNIT[sportId] ?? ["event", "events"];
  return n === 1 ? one : many;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Group {
  key: string;
  title: string;
  hasEvent: boolean;
  date: string;
  sportId: string;
  preds: PredictionView[];
}

function group(predictions: PredictionView[]): Group[] {
  const groups: Group[] = [];
  const index = new Map<string, number>();
  for (const p of predictions) {
    const event = p.match.event_name;
    // Use the formatted display date as the key so that matches on the same
    // calendar day (local timezone) land in the same section. Using the raw
    // UTC slice would split early-UTC matches onto a different "day" than how
    // they display, producing duplicate-looking date headers.
    const key = event ?? formatDate(p.match.starts_at);
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({
        key,
        title: event ?? formatDate(p.match.starts_at),
        hasEvent: !!event,
        date: p.match.starts_at,
        sportId: p.match.league.sport_id,
        preds: [],
      });
    }
    groups[index.get(key)!].preds.push(p);
  }
  return groups;
}

/** Group a playoff bracket by series — the unordered pair of teams. Within a
   year each pair meets exactly once, so the pair uniquely identifies a series.
   Series stay in most-recent-first order (Finals on top); games inside each run
   chronologically (Game 1 → last) so the series reads in order. */
function groupBySeries(predictions: PredictionView[]): Group[] {
  const groups: Group[] = [];
  const index = new Map<string, number>();
  for (const p of predictions) {
    const key = [p.match.home.name, p.match.away.name].sort().join(" | ");
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({
        key,
        title: `${p.match.home.name} vs ${p.match.away.name}`,
        hasEvent: false, // matchup title carries it; no date prefix
        date: p.match.starts_at,
        sportId: p.match.league.sport_id,
        preds: [],
      });
    }
    groups[index.get(key)!].preds.push(p);
  }
  for (const g of groups) {
    g.preds.sort(
      (a, b) => new Date(a.match.starts_at).getTime() - new Date(b.match.starts_at).getTime(),
    );
  }
  return groups;
}

export function GroupedPredictionGrid({
  predictions,
  empty,
  favoriteIds,
  followedCompetitorIds,
  variant = "default",
  groupBy = "auto",
}: {
  predictions: PredictionView[];
  empty: React.ReactNode;
  favoriteIds?: Set<string>;
  followedCompetitorIds?: Set<string>;
  variant?: "default" | "premium";
  groupBy?: "auto" | "series";
}) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1e2236] p-10 text-center text-[#5a607a]">
        {empty}
      </div>
    );
  }

  const premium = variant === "premium";
  const groups = groupBy === "series" ? groupBySeries(predictions) : group(predictions);

  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <section key={g.key}>
          {premium ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-3">
                <h2
                  className="text-xl font-bold tracking-tight text-[#e4e7f0]"
                  style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                >
                  {g.title}
                </h2>
                <span className="text-xs font-medium text-[#5a607a]">
                  {g.hasEvent ? formatDate(g.date) : ""}
                </span>
              </div>
              <span className="rounded-full border border-[#1e2236] px-3 py-1 text-xs font-medium text-[#5a607a]">
                {g.preds.length} {unit(g.sportId, g.preds.length)}
              </span>
            </div>
          ) : (
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#1e2236] pb-2">
              <h2 className="text-lg font-semibold tracking-tight text-[#e4e7f0]">{g.title}</h2>
              <span className="text-xs text-[#5a607a]">
                {g.hasEvent && <>{formatDate(g.date)} · </>}
                {g.preds.length} {unit(g.sportId, g.preds.length)}
              </span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {g.preds.map((p) =>
              premium ? (
                <FightCard key={p.id} p={p} favorited={favoriteIds?.has(p.match.id) ?? false} />
              ) : (
                <PredictionCard
                  key={p.id}
                  p={p}
                  favorited={favoriteIds?.has(p.match.id) ?? false}
                  followedCompetitorIds={followedCompetitorIds}
                />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

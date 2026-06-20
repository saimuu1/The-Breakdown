import { FightCard } from "@/components/FightCard";
import { PredictionCard } from "@/components/PredictionCard";
import type { PredictionView } from "@/lib/queries";

/** Unit noun per sport, for the "5 fights" / "3 games" group count. */
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

/** Group predictions into cards/days, preserving the incoming order. A group is
   one event_name (e.g. a UFC card) or, when none is set, one calendar day. */
function group(predictions: PredictionView[]): Group[] {
  const groups: Group[] = [];
  const index = new Map<string, number>();
  for (const p of predictions) {
    const event = p.match.event_name;
    const key = event ?? p.match.starts_at.slice(0, 10);
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

/** Predictions rendered as titled sections — one per card/day — so a long list
   reads as an organized program instead of a flat wall of matchups. */
export function GroupedPredictionGrid({
  predictions,
  empty,
  favoriteIds,
  variant = "default",
}: {
  predictions: PredictionView[];
  empty: React.ReactNode;
  favoriteIds?: Set<string>;
  variant?: "default" | "premium";
}) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center text-neutral-400">
        {empty}
      </div>
    );
  }

  const premium = variant === "premium";

  return (
    <div className="space-y-12">
      {group(predictions).map((g) => (
        <section key={g.key}>
          {premium ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-emerald-400" />
                <h2 className="text-xl font-bold tracking-tight text-neutral-100">{g.title}</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
                {g.hasEvent && <>{formatDate(g.date)} · </>}
                {g.preds.length} {unit(g.sportId, g.preds.length)}
              </span>
            </div>
          ) : (
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-neutral-800 pb-2">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-100">{g.title}</h2>
              <span className="text-xs text-neutral-500">
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
                <PredictionCard key={p.id} p={p} favorited={favoriteIds?.has(p.match.id) ?? false} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

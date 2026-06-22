import { PredictionCard } from "@/components/PredictionCard";
import type { PredictionView } from "@/lib/queries";

export function PredictionGrid({
  predictions,
  empty,
  favoriteIds,
  followedCompetitorIds,
}: {
  predictions: PredictionView[];
  empty: React.ReactNode;
  favoriteIds?: Set<string>;
  followedCompetitorIds?: Set<string>;
}) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center text-neutral-400">
        {empty}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {predictions.map((p) => (
        <PredictionCard
          key={p.id}
          p={p}
          favorited={favoriteIds?.has(p.match.id) ?? false}
          followedCompetitorIds={followedCompetitorIds}
        />
      ))}
    </div>
  );
}

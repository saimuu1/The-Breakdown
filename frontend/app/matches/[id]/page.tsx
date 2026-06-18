import Link from "next/link";

import { FavoriteButton } from "@/components/FavoriteButton";
import { Nav } from "@/components/Nav";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { computeEdges } from "@/lib/featureLabels";
import { getFavoriteMatchIds, getMatchFeatures, getPredictionByMatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPredictionByMatch(id);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-300">
          ← Back to dashboard
        </Link>

        {prediction ? (
          <MatchDetail prediction={prediction} matchId={id} />
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
            <p className="text-lg font-medium">This prediction isn&apos;t available on your plan.</p>
            <p className="mt-2 text-sm text-neutral-400">
              It may be a Pro-tier pick — the database hides it from free accounts.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

async function MatchDetail({
  prediction,
  matchId,
}: {
  prediction: NonNullable<Awaited<ReturnType<typeof getPredictionByMatch>>>;
  matchId: string;
}) {
  const [features, favoriteIds] = await Promise.all([
    getMatchFeatures(matchId),
    getFavoriteMatchIds(),
  ]);
  const { home, away } = prediction.match;
  const edges = computeEdges(features, home.name, away.name, prediction.match.league.sport_id);
  const sport = SPORT_LABEL[prediction.match.league.sport_id] ?? prediction.match.league.sport_id;
  const date = new Date(prediction.match.starts_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="mt-6">
      <div className="mb-2 flex items-center gap-3 text-xs text-neutral-500">
        <span className="rounded bg-neutral-800 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-300">
          {sport}
        </span>
        <span>{date}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {home.name} <span className="text-neutral-600">vs</span> {away.name}
        </h1>
        <FavoriteButton
          matchId={matchId}
          initialFavorited={favoriteIds.has(matchId)}
          variant="labeled"
        />
      </div>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Model win probability
        </p>
        <ProbabilityBar probs={prediction.probs} />
      </div>

      {prediction.analysis && (
        <section className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-emerald-400">
            The Breakdown
          </h2>
          <p className="whitespace-pre-line leading-relaxed text-neutral-200">{prediction.analysis}</p>
        </section>
      )}

      {edges.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Key statistical edges
          </h2>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {edges.map((e) => (
              <li key={e.label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-neutral-400">{e.label}</span>
                <span className="font-medium text-neutral-100">
                  {e.favored}{" "}
                  <span className="text-neutral-500">+{e.magnitude.toFixed(1)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-neutral-600">
        Model {prediction.model_version}
        {prediction.analysis_version ? ` · analyst ${prediction.analysis_version}` : ""} · for
        entertainment, not betting advice.
      </p>
    </article>
  );
}

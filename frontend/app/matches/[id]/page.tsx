import Link from "next/link";

import { Breakdown } from "@/components/Breakdown";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Leaders } from "@/components/Leaders";
import { Nav } from "@/components/Nav";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { StatCompare } from "@/components/StatCompare";
import { TeamCrest } from "@/components/TeamCrest";
import { computeEdges } from "@/lib/featureLabels";
import { getFavoriteMatchIds, getMatchFeatures, getPredictionByMatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };
const OUTCOME_NAME: Record<string, (h: string, a: string) => string> = {
  home: (h) => h,
  away: (_h, a) => a,
  draw: () => "Draw",
};

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
            <p className="text-lg font-medium">This prediction isn&apos;t available.</p>
            <p className="mt-2 text-sm text-neutral-400">
              You may need to{" "}
              <Link href="/login?next=/dashboard" className="text-emerald-400 hover:underline">
                log in
              </Link>{" "}
              to view picks, or this match no longer exists.
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
  const sportId = prediction.match.league.sport_id;
  const edges = computeEdges(features, home.name, away.name, sportId);
  const sport = SPORT_LABEL[sportId] ?? sportId;
  const date = new Date(prediction.match.starts_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Verdict: the model's favored outcome + confidence.
  const [pickKey, pickProb] = Object.entries(prediction.probs).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  );
  const pickName = (OUTCOME_NAME[pickKey] ?? (() => pickKey))(home.name, away.name);
  const result = prediction.match.result;
  const graded = result?.winner
    ? { hit: result.winner === pickKey, winnerName: result.winner_name ?? result.winner }
    : null;

  return (
    <article className="mt-6 space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-3 text-xs text-neutral-500">
          <span className="rounded bg-neutral-800 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-300">
            {sport}
          </span>
          {prediction.match.event_name && <span>{prediction.match.event_name}</span>}
          <span>{date}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="flex items-center gap-2">
              <TeamCrest name={home.name} logoUrl={home.logo_url} size={32} />
              {home.name}
            </span>
            <span className="text-neutral-600">vs</span>
            <span className="flex items-center gap-2">
              <TeamCrest name={away.name} logoUrl={away.logo_url} size={32} />
              {away.name}
            </span>
          </h1>
          <FavoriteButton
            matchId={matchId}
            initialFavorited={favoriteIds.has(matchId)}
            variant="labeled"
          />
        </div>
      </div>

      {/* Verdict header */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              The pick
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{pickName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Model confidence
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-100">{Math.round(pickProb * 100)}%</p>
          </div>
        </div>
        {graded && (
          <div className="mt-4 flex items-center gap-2 border-t border-neutral-800 pt-3 text-sm">
            <span
              className={`rounded px-2 py-0.5 font-semibold ${
                graded.hit ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {graded.hit ? "✓ Called it" : "✗ Missed"}
            </span>
            <span className="text-neutral-500">{graded.winnerName} won</span>
          </div>
        )}
        <div className="mt-5">
          <ProbabilityBar probs={prediction.probs} />
        </div>
      </div>

      {prediction.analysis && <Breakdown text={prediction.analysis} />}

      <Leaders
        context={prediction.match.context}
        home={home.name}
        away={away.name}
        homeLogo={home.logo_url}
        awayLogo={away.logo_url}
      />

      <StatCompare diffs={features} home={home.name} away={away.name} sportId={sportId} />

      {edges.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Key statistical edges
          </h2>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {edges.map((e) => (
              <li key={e.label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-neutral-400">{e.label}</span>
                <span className="font-medium text-neutral-100">
                  {e.favored} <span className="text-neutral-500">+{e.magnitude.toFixed(1)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-neutral-600">
        Model {prediction.model_version}
        {prediction.analysis_version ? ` · analyst ${prediction.analysis_version}` : ""} · for
        entertainment, not betting advice.
      </p>
    </article>
  );
}

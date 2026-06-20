import Link from "next/link";

import { FavoriteButton } from "@/components/FavoriteButton";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { TeamCrest } from "@/components/TeamCrest";
import type { PredictionView } from "@/lib/queries";

const SPORT_LABEL: Record<string, string> = {
  ufc: "UFC",
  soccer: "Soccer",
  nba: "NBA",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Drop a leading section header (e.g. "THE STORY:") so the teaser reads as prose. */
function teaser(text: string): string {
  return text.replace(/^\s*[A-Z][A-Z '’-]{2,40}:\s*/, "");
}

/** The model's favored outcome key (e.g. "home"), for grading past picks. */
function modelPick(probs: Record<string, number>): string {
  return Object.entries(probs).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function ResultBadge({ p }: { p: PredictionView }) {
  const winner = p.match.result?.winner;
  if (!winner) return null;
  const hit = modelPick(p.probs) === winner;
  const winnerName = p.match.result?.winner_name ?? winner;
  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      <span
        className={`rounded px-2 py-0.5 font-semibold ${
          hit ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        }`}
      >
        {hit ? "✓ Called it" : "✗ Missed"}
      </span>
      <span className="text-neutral-500">{winnerName} won</span>
    </div>
  );
}

export function PredictionCard({ p, favorited = false }: { p: PredictionView; favorited?: boolean }) {
  const sport = SPORT_LABEL[p.match.league.sport_id] ?? p.match.league.sport_id;

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-neutral-500">
        <span className="rounded bg-neutral-800 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-300">
          {sport}
        </span>
        <div className="flex items-center gap-3">
          <span>{formatDate(p.match.starts_at)}</span>
          <FavoriteButton matchId={p.match.id} initialFavorited={favorited} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <span className="font-semibold text-neutral-100">{p.match.home.name}</span>
          <TeamCrest name={p.match.home.name} logoUrl={p.match.home.logo_url} />
        </div>
        <span className="text-xs font-medium text-neutral-600">vs</span>
        <div className="flex flex-1 items-center gap-2">
          <TeamCrest name={p.match.away.name} logoUrl={p.match.away.logo_url} />
          <span className="font-semibold text-neutral-100">{p.match.away.name}</span>
        </div>
      </div>

      <ProbabilityBar probs={p.probs} />

      <ResultBadge p={p} />

      {p.analysis && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-400">
          <span className="font-semibold text-emerald-400">The Breakdown: </span>
          {teaser(p.analysis)}
        </p>
      )}
    </Link>
  );
}

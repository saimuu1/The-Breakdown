import Link from "next/link";

import { FavoriteButton } from "@/components/FavoriteButton";
import { FollowButton } from "@/components/FollowButton";
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

function teaser(text: string): string {
  return text.replace(/^\s*[A-Z][A-Z ''-]{2,40}:\s*/, "");
}

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
          hit ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"
        }`}
      >
        {hit ? "✓ Called it" : "✗ Missed"}
      </span>
      <span className="text-[#5a607a]">{winnerName} won</span>
    </div>
  );
}

export function PredictionCard({
  p,
  favorited = false,
  followedCompetitorIds,
}: {
  p: PredictionView;
  favorited?: boolean;
  followedCompetitorIds?: Set<string>;
}) {
  const sport = SPORT_LABEL[p.match.league.sport_id] ?? p.match.league.sport_id;

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className="group block rounded-2xl border border-[#181b2a] bg-[#0c0f1a] p-5 transition-colors duration-150 hover:border-[#272b3f]"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-[#5a607a]">
        <span className="rounded bg-[#181b2a] px-2 py-0.5 font-medium uppercase tracking-wide text-[#8b92a8]">
          {sport}
        </span>
        <div className="flex items-center gap-3">
          <span>{formatDate(p.match.starts_at)}</span>
          <FavoriteButton matchId={p.match.id} initialFavorited={favorited} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <FollowButton
            competitorId={p.match.home.id}
            competitorName={p.match.home.name}
            initialFollowed={followedCompetitorIds?.has(p.match.home.id) ?? false}
          />
          <span className="font-semibold text-[#e4e7f0]">{p.match.home.name}</span>
          <TeamCrest name={p.match.home.name} logoUrl={p.match.home.logo_url} />
        </div>
        <span className="text-xs font-medium text-[#3a3e55]">vs</span>
        <div className="flex flex-1 items-center gap-2">
          <TeamCrest name={p.match.away.name} logoUrl={p.match.away.logo_url} />
          <span className="font-semibold text-[#e4e7f0]">{p.match.away.name}</span>
          <FollowButton
            competitorId={p.match.away.id}
            competitorName={p.match.away.name}
            initialFollowed={followedCompetitorIds?.has(p.match.away.id) ?? false}
          />
        </div>
      </div>

      <ProbabilityBar probs={p.probs} />

      <ResultBadge p={p} />

      {p.analysis && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[#5a607a]">
          <span className="font-semibold text-emerald-400">The Breakdown: </span>
          {teaser(p.analysis)}
        </p>
      )}
    </Link>
  );
}

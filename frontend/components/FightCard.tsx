import Link from "next/link";

import { FavoriteButton } from "@/components/FavoriteButton";
import { TeamCrest } from "@/components/TeamCrest";
import type { PredictionView } from "@/lib/queries";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

function pct(probs: Record<string, number>, key: string): number {
  return Math.round((probs[key] ?? 0) * 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function FighterSide({
  name,
  logoUrl,
  percent,
  favored,
  align,
}: {
  name: string;
  logoUrl: string | null;
  percent: number;
  favored: boolean;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${right ? "items-end text-right" : "items-start text-left"}`}>
      <span
        className={`rounded-full ring-2 ${
          favored ? "ring-emerald-400 shadow-md shadow-emerald-500/20" : "ring-white/10"
        }`}
      >
        <TeamCrest name={name} logoUrl={logoUrl} size={52} cover />
      </span>
      <span className="line-clamp-2 min-h-[2.5rem] w-full text-sm font-semibold leading-tight text-neutral-100">
        {name}
      </span>
      <span
        className={`text-2xl font-bold tabular-nums leading-none ${
          favored ? "text-emerald-400" : "text-neutral-500"
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}

/** Clean upcoming-fight card: real fighter headshots, the favored fighter marked
   with a single emerald accent, on a calm neutral surface. `spotlight` makes it
   a pinned marquee fight — brighter emerald frame, a badge, and its card label. */
export function FightCard({
  p,
  favorited = false,
  spotlight = false,
}: {
  p: PredictionView;
  favorited?: boolean;
  spotlight?: boolean;
}) {
  const sport = SPORT_LABEL[p.match.league.sport_id] ?? p.match.league.sport_id;
  const home = pct(p.probs, "home");
  const away = pct(p.probs, "away");
  const homeFavored = home >= away;

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className={
        spotlight
          ? "group relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 to-neutral-900 p-5 shadow-[0_0_45px_-18px_rgba(16,185,129,0.6)] ring-1 ring-inset ring-emerald-500/15 transition duration-200 hover:border-emerald-400/70 hover:shadow-[0_0_55px_-14px_rgba(16,185,129,0.7)]"
          : "group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition duration-200 hover:border-emerald-500/40 hover:shadow-[0_0_30px_-16px_rgba(16,185,129,0.4)]"
      }
    >
      {/* top row */}
      <div className="mb-5 flex items-center justify-between gap-2">
        {spotlight ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
              Big Fight
            </span>
            {p.match.event_name && (
              <span className="truncate text-xs text-neutral-400">
                {p.match.event_name} · {formatDate(p.match.starts_at)}
              </span>
            )}
          </div>
        ) : (
          <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-300">
            {sport}
          </span>
        )}
        <FavoriteButton matchId={p.match.id} initialFavorited={favorited} />
      </div>

      {/* fighters */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <FighterSide
          name={p.match.home.name}
          logoUrl={p.match.home.logo_url}
          percent={home}
          favored={homeFavored}
          align="right"
        />
        <span className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-600">vs</span>
        <FighterSide
          name={p.match.away.name}
          logoUrl={p.match.away.logo_url}
          percent={away}
          favored={!homeFavored}
          align="left"
        />
      </div>

      {/* probability bar — favored side emerald, underdog neutral */}
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={homeFavored ? "bg-emerald-500" : "bg-neutral-600"}
          style={{ width: `${home}%` }}
        />
        <div
          className={!homeFavored ? "bg-emerald-500" : "bg-neutral-600"}
          style={{ width: `${away}%` }}
        />
      </div>

      {p.analysis && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          <span className="font-semibold text-emerald-400">The Breakdown: </span>
          {p.analysis}
        </p>
      )}
    </Link>
  );
}

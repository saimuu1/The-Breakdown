import Link from "next/link";

import { FavoriteButton } from "@/components/FavoriteButton";
import { TeamCrest } from "@/components/TeamCrest";
import { isTopTenClash } from "@/lib/marquee";
import type { PredictionView } from "@/lib/queries";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };
const BIG_LABEL: Record<string, string> = {
  ufc: "Big Fight",
  soccer: "Big Match",
  nba: "Big Game",
};

// Accent palettes: emerald is the default; amber marks a top-10 clash so it pops.
const ACCENT = {
  emerald: { ring: "ring-emerald-400", shadow: "shadow-emerald-500/20", text: "text-emerald-400", seg: "bg-emerald-500" },
  amber: { ring: "ring-amber-400", shadow: "shadow-amber-500/25", text: "text-amber-400", seg: "bg-amber-500" },
};

function pct(probs: Record<string, number>, key: string): number {
  return Math.round((probs[key] ?? 0) * 100);
}

function Side({
  name,
  logoUrl,
  percent,
  favored,
  align,
  cover,
  accent,
}: {
  name: string;
  logoUrl: string | null;
  percent: number;
  favored: boolean;
  align: "left" | "right";
  cover: boolean;
  accent: (typeof ACCENT)[keyof typeof ACCENT];
}) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${right ? "items-end text-right" : "items-start text-left"}`}>
      <span
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${
          favored ? `ring-2 ${accent.ring} shadow-md ${accent.shadow}` : "ring-1 ring-white/10"
        }`}
      >
        <TeamCrest name={name} logoUrl={logoUrl} size={cover ? 52 : 38} cover={cover} />
      </span>
      <span className="line-clamp-2 min-h-[2.5rem] w-full text-sm font-semibold leading-tight text-neutral-100">
        {name}
      </span>
      <span
        className={`text-2xl font-bold tabular-nums leading-none ${
          favored ? accent.text : "text-neutral-500"
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}

/** Premium matchup card for the upcoming board. Handles UFC (2-way, fighter
   headshots) and soccer (3-way W/D/L, team crests). `spotlight` pins a big
   fight; a top-10 soccer clash gets a standout amber accent in place. */
export function FightCard({
  p,
  favorited = false,
  spotlight = false,
}: {
  p: PredictionView;
  favorited?: boolean;
  spotlight?: boolean;
}) {
  const sportId = p.match.league.sport_id;
  const sport = SPORT_LABEL[sportId] ?? sportId;
  const cover = sportId === "ufc"; // circular headshots for fighters; contain logos otherwise
  const clash = !spotlight && isTopTenClash(p);
  const accent = clash ? ACCENT.amber : ACCENT.emerald;

  const probs = p.probs;
  const hasDraw = "draw" in probs;
  const home = pct(probs, "home");
  const away = pct(probs, "away");
  const draw = pct(probs, "draw");

  const outcomes: [string, number][] = hasDraw
    ? [["home", home], ["draw", draw], ["away", away]]
    : [["home", home], ["away", away]];
  const favored = outcomes.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const seg = (key: string) => (favored === key ? accent.seg : "bg-neutral-600");

  const cardClass = spotlight
    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 to-neutral-900 shadow-[0_0_45px_-18px_rgba(16,185,129,0.6)] ring-1 ring-inset ring-emerald-500/15 hover:border-emerald-400/70 hover:shadow-[0_0_55px_-14px_rgba(16,185,129,0.7)]"
    : clash
      ? "border-amber-500/50 bg-gradient-to-br from-amber-950/30 to-neutral-900 ring-1 ring-inset ring-amber-500/15 hover:border-amber-400/70 hover:shadow-[0_0_40px_-16px_rgba(245,158,11,0.5)]"
      : "border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 hover:shadow-[0_0_30px_-16px_rgba(16,185,129,0.4)]";

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-200 ${cardClass}`}
    >
      {/* top row */}
      <div className="mb-5 flex items-center justify-between gap-2">
        {spotlight ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
              {BIG_LABEL[sportId] ?? "Featured"}
            </span>
            {p.match.event_name && (
              <span className="truncate text-xs text-neutral-400">{p.match.event_name}</span>
            )}
          </div>
        ) : clash ? (
          <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
            Top-10 Clash
          </span>
        ) : (
          <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-300">
            {sport}
          </span>
        )}
        <FavoriteButton matchId={p.match.id} initialFavorited={favorited} />
      </div>

      {/* teams / fighters */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <Side
          name={p.match.home.name}
          logoUrl={p.match.home.logo_url}
          percent={home}
          favored={favored === "home"}
          align="right"
          cover={cover}
          accent={accent}
        />
        {hasDraw ? (
          <div className="mt-3 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
              Draw
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                favored === "draw" ? accent.text : "text-neutral-500"
              }`}
            >
              {draw}%
            </span>
          </div>
        ) : (
          <span className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-600">vs</span>
        )}
        <Side
          name={p.match.away.name}
          logoUrl={p.match.away.logo_url}
          percent={away}
          favored={favored === "away"}
          align="left"
          cover={cover}
          accent={accent}
        />
      </div>

      {/* probability bar */}
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-neutral-800">
        <div className={seg("home")} style={{ width: `${home}%` }} />
        {hasDraw && <div className={seg("draw")} style={{ width: `${draw}%` }} />}
        <div className={seg("away")} style={{ width: `${away}%` }} />
      </div>

      {p.analysis && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          <span className={`font-semibold ${accent.text}`}>The Breakdown: </span>
          {p.analysis}
        </p>
      )}
    </Link>
  );
}

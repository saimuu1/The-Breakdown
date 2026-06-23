import Link from "next/link";

import { FollowButton } from "@/components/FollowButton";
import { TeamCrest } from "@/components/TeamCrest";
import { isTopTenClash } from "@/lib/marquee";
import type { PredictionView } from "@/lib/queries";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };
const BIG_LABEL: Record<string, string> = {
  ufc: "Big Fight",
  soccer: "Big Match",
  nba: "Big Game",
};

const ACCENT = {
  emerald: { ring: "ring-emerald-400/60", text: "text-emerald-400", seg: "bg-emerald-500", badge: "bg-emerald-500 text-neutral-950" },
  amber:   { ring: "ring-amber-400/60",   text: "text-amber-400",   seg: "bg-amber-500",  badge: "bg-amber-500 text-neutral-950" },
};

function pct(probs: Record<string, number>, key: string): number {
  return Math.round((probs[key] ?? 0) * 100);
}

function teaser(text: string): string {
  return text.replace(/^\s*[A-Z][A-Z ''-]{2,40}:\s*/, "");
}

function Side({
  competitorId,
  name,
  logoUrl,
  percent,
  favored,
  followed,
  align,
  cover,
  accent,
}: {
  competitorId: string;
  name: string;
  logoUrl: string | null;
  percent: number;
  favored: boolean;
  followed: boolean;
  align: "left" | "right";
  cover: boolean;
  accent: (typeof ACCENT)[keyof typeof ACCENT];
}) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${right ? "items-end text-right" : "items-start text-left"}`}>
      <span
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${
          favored ? `ring-2 ${accent.ring}` : "ring-1 ring-white/8"
        }`}
      >
        <TeamCrest name={name} logoUrl={logoUrl} size={cover ? 52 : 38} cover={cover} />
      </span>
      <div className={`flex min-h-[2.5rem] w-full items-start gap-1.5 ${right ? "flex-row-reverse justify-start" : "flex-row"}`}>
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-[#e4e7f0]">
          {name}
        </span>
        <span className="mt-0.5 shrink-0">
          <FollowButton competitorId={competitorId} competitorName={name} initialFollowed={followed} />
        </span>
      </div>
      <span
        className={`text-2xl font-bold tabular-nums leading-none ${
          favored ? accent.text : "text-[#3a3e55]"
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}

export function FightCard({
  p,
  spotlight = false,
  followedCompetitorIds,
}: {
  p: PredictionView;
  spotlight?: boolean;
  followedCompetitorIds?: Set<string>;
}) {
  const sportId = p.match.league.sport_id;
  const sport = SPORT_LABEL[sportId] ?? sportId;
  const cover = sportId === "ufc";
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
  const seg = (key: string) => (favored === key ? accent.seg : "bg-[#1a1e30]");

  const cardClass = spotlight
    ? "border-emerald-500/35 bg-[#0c0f1a] hover:border-emerald-400/55"
    : clash
      ? "border-amber-500/35 bg-[#0c0f1a] hover:border-amber-400/55"
      : "border-[#181b2a] bg-[#0c0f1a] hover:border-[#272b3f]";

  return (
    <Link
      href={`/matches/${p.match.id}`}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-colors duration-150 ${cardClass}`}
    >
      {/* top row */}
      <div className="mb-5 flex items-center justify-between gap-2">
        {spotlight ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent.badge}`}>
              {BIG_LABEL[sportId] ?? "Featured"}
            </span>
            {p.match.event_name && (
              <span className="truncate text-xs text-[#5a607a]">{p.match.event_name}</span>
            )}
          </div>
        ) : clash ? (
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent.badge}`}>
            Top-10 Clash
          </span>
        ) : (
          <span className="rounded bg-[#181b2a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#7a8099]">
            {sport}
          </span>
        )}
      </div>

      {/* teams / fighters */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <Side
          competitorId={p.match.home.id}
          name={p.match.home.name}
          logoUrl={p.match.home.logo_url}
          percent={home}
          favored={favored === "home"}
          followed={followedCompetitorIds?.has(p.match.home.id) ?? false}
          align="right"
          cover={cover}
          accent={accent}
        />
        {hasDraw ? (
          <div className="mt-3 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3a3e55]">
              Draw
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                favored === "draw" ? accent.text : "text-[#3a3e55]"
              }`}
            >
              {draw}%
            </span>
          </div>
        ) : (
          <span className="mt-4 text-xs font-bold uppercase tracking-widest text-[#3a3e55]">vs</span>
        )}
        <Side
          competitorId={p.match.away.id}
          name={p.match.away.name}
          logoUrl={p.match.away.logo_url}
          percent={away}
          favored={favored === "away"}
          followed={followedCompetitorIds?.has(p.match.away.id) ?? false}
          align="left"
          cover={cover}
          accent={accent}
        />
      </div>

      {/* probability bar */}
      <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-[#1a1e30]">
        <div className={seg("home")} style={{ width: `${home}%` }} />
        {hasDraw && <div className={seg("draw")} style={{ width: `${draw}%` }} />}
        <div className={seg("away")} style={{ width: `${away}%` }} />
      </div>

      {p.analysis && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#5a607a]">
          <span className={`font-semibold ${accent.text}`}>The Breakdown: </span>
          {teaser(p.analysis)}
        </p>
      )}
    </Link>
  );
}

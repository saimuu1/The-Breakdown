import Link from "next/link";

import { TeamCrest } from "@/components/TeamCrest";
import type { FeedItem } from "@/lib/feed";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

const TYPE_LABEL: Record<string, string> = {
  upcoming_match: "Upcoming",
  recent_result: "Result",
  streak: "Streak",
};

function importanceColor(importance: number) {
  if (importance >= 90) return "bg-red-500/12 text-red-400 border-red-500/20";
  if (importance >= 75) return "bg-amber-500/12 text-amber-400 border-amber-500/20";
  if (importance >= 60) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  return "bg-[#1e2236] text-[#5a607a] border-[#272b3f]";
}

function typeColor(type: FeedItem["type"]) {
  if (type === "upcoming_match") return "text-[#8b92a8]";
  if (type === "streak") return "text-amber-400";
  return "text-[#5a607a]";
}

export function FeedCard({ item }: { item: FeedItem }) {
  const sportLabel = SPORT_LABEL[item.sport] ?? item.sport;
  const typeLabel = TYPE_LABEL[item.type] ?? item.type;
  const impColor = importanceColor(item.importance);

  const inner = (
    <div className="rounded-2xl border border-[#181b2a] bg-[#0c0f1a] p-5 transition-colors duration-150 hover:border-[#272b3f]">
      {/* entity row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TeamCrest name={item.entity.name} logoUrl={item.entity.logoUrl} size={28} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#e4e7f0]">{item.entity.name}</p>
            <p className="text-xs text-[#5a607a]">{sportLabel}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${impColor}`}>
            {typeLabel}
          </span>
        </div>
      </div>

      {/* headline */}
      <p className={`text-base font-semibold leading-snug ${typeColor(item.type)} ${item.type === "upcoming_match" ? "text-[#e4e7f0]" : ""}`}>
        {item.headline}
      </p>

      {/* detail */}
      <p className="mt-1.5 text-sm text-[#5a607a]">{item.detail}</p>

      {/* link hint */}
      {item.matchId && (
        <p className="mt-3 text-xs font-medium text-[#3a3e55] transition-colors duration-150 group-hover:text-[#5a607a]">
          View prediction →
        </p>
      )}
    </div>
  );

  if (item.matchId) {
    return (
      <Link href={`/matches/${item.matchId}`} className="group block">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

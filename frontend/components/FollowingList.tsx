"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TeamCrest } from "@/components/TeamCrest";
import type { FollowedCompetitor } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

const SPORT_LABEL: Record<string, string> = { ufc: "UFC", soccer: "Soccer", nba: "NBA" };

/** Chips for everyone the user follows, each with an inline unfollow (×). */
export function FollowingList({ following }: { following: FollowedCompetitor[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unfollow(id: string) {
    if (busyId) return;
    setBusyId(id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    await supabase
      .from("followed_competitors")
      .delete()
      .eq("user_id", user.id)
      .eq("competitor_id", id);
    setBusyId(null);
    router.refresh();
  }

  if (following.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#5a607a]">
        Following · {following.length}
      </h2>
      <div className="flex flex-wrap gap-2">
        {following.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-2 rounded-full border border-[#1e2236] bg-[#0c0f1a] py-1 pl-1.5 pr-1 text-sm text-[#e4e7f0]"
          >
            <TeamCrest name={c.name} logoUrl={c.logo_url} size={20} />
            <span className="font-medium">{c.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-[#3a3e55]">
              {SPORT_LABEL[c.sport] ?? c.sport}
            </span>
            <button
              onClick={() => unfollow(c.id)}
              disabled={busyId === c.id}
              aria-label={`Unfollow ${c.name}`}
              title={`Unfollow ${c.name}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#5a607a] transition-colors duration-150 hover:bg-[#1e2236] hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

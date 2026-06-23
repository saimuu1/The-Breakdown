"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/** Follow toggle for a single competitor (fighter / team / national team).
   Following drives the personalized feed on /favorites. Two variants:
   - "icon": a compact star, sits next to a name on cards.
   - "labeled": a full pill ("☆ Follow" / "★ Following") for detail pages. */
export function FollowButton({
  competitorId,
  competitorName,
  initialFollowed,
  variant = "icon",
}: {
  competitorId: string;
  competitorName: string;
  initialFollowed: boolean;
  variant?: "icon" | "labeled";
}) {
  const router = useRouter();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // Cards wrap this in a <Link>; don't navigate when following.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const next = !followed;
    setFollowed(next); // optimistic
    if (next) {
      await supabase
        .from("followed_competitors")
        .insert({ user_id: user.id, competitor_id: competitorId } as never);
    } else {
      await supabase
        .from("followed_competitors")
        .delete()
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId);
    }
    setBusy(false);
    router.refresh();
  }

  const star = followed ? "★" : "☆";

  if (variant === "labeled") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={followed}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
          followed
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
            : "border-[#272b3f] text-[#b0b8d0] hover:border-emerald-500/40 hover:text-emerald-400"
        }`}
      >
        <span className="text-base leading-none">{star}</span>
        {followed ? "Following" : `Follow ${competitorName}`}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={followed ? `Unfollow ${competitorName}` : `Follow ${competitorName}`}
      aria-pressed={followed}
      title={followed ? `Following ${competitorName}` : `Follow ${competitorName}`}
      className={`text-base leading-none transition-colors duration-150 ${
        followed
          ? "text-emerald-400 hover:text-emerald-300"
          : "text-[#5a607a] hover:text-emerald-400"
      }`}
    >
      {star}
    </button>
  );
}

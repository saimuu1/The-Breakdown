"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function FollowButton({
  competitorId,
  competitorName,
  initialFollowed,
}: {
  competitorId: string;
  competitorName: string;
  initialFollowed: boolean;
}) {
  const router = useRouter();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
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
    setFollowed(next);
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

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={followed ? `Unfollow ${competitorName}` : `Follow ${competitorName}`}
      aria-pressed={followed}
      title={followed ? `Unfollow ${competitorName}` : `Follow ${competitorName}`}
      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none transition-all duration-150 ${
        followed
          ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
          : "bg-transparent text-[#3a3e55] ring-1 ring-[#2a2e42] hover:text-[#b0b8d0] hover:ring-[#3a3e55]"
      } opacity-0 group-hover:opacity-100 ${followed ? "!opacity-100" : ""}`}
    >
      {followed ? "✓" : "+"}
    </button>
  );
}

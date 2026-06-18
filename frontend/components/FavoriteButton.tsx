"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/** Star toggle. Writes to the favorites table; RLS guarantees per-user isolation. */
export function FavoriteButton({
  matchId,
  initialFavorited,
  variant = "icon",
}: {
  matchId: string;
  initialFavorited: boolean;
  variant?: "icon" | "labeled";
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // Cards wrap this in a <Link>; don't navigate when starring.
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

    const next = !favorited;
    setFavorited(next); // optimistic
    if (next) {
      // `as never`: our hand-written Database type doesn't fully satisfy
      // supabase-js's insert generic, but the row shape is correct.
      await supabase.from("favorites").insert({ user_id: user.id, match_id: matchId } as never);
    } else {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("match_id", matchId);
    }
    setBusy(false);
    router.refresh();
  }

  const star = favorited ? "★" : "☆";

  if (variant === "labeled") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
          favorited
            ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
            : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
        }`}
        aria-pressed={favorited}
      >
        <span>{star}</span>
        {favorited ? "Favorited" : "Favorite"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? "Remove favorite" : "Add favorite"}
      aria-pressed={favorited}
      className={`text-lg leading-none transition ${
        favorited ? "text-amber-400" : "text-neutral-600 hover:text-neutral-300"
      }`}
    >
      {star}
    </button>
  );
}

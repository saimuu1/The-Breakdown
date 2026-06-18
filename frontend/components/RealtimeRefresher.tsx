"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/** Live-refresh the page when predictions change (Supabase Realtime).

   Requires the `predictions` table to be in the `supabase_realtime` publication
   (see migration). If it isn't enabled, this simply receives no events. */
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("predictions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

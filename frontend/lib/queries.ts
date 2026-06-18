import { createClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/types";

/** A prediction joined with its match, competitors, and sport — what the UI shows. */
export interface PredictionView {
  id: string;
  probs: Record<string, number>;
  analysis: string | null;
  analysis_version: string | null;
  model_version: string;
  tier: Tier;
  match: {
    id: string;
    starts_at: string;
    status: string;
    result: { winner?: string; winner_name?: string } | null;
    home: { name: string };
    away: { name: string };
    league: { sport_id: string };
  };
}

const SELECT = `
  id, probs, analysis, analysis_version, model_version, tier,
  match:matches!inner(
    id, starts_at, status, result,
    home:competitors!matches_home_id_fkey(name),
    away:competitors!matches_away_id_fkey(name),
    league:leagues!inner(sport_id)
  )
`;

function sortByStart(rows: PredictionView[]): PredictionView[] {
  return [...rows].sort(
    (a, b) => new Date(a.match.starts_at).getTime() - new Date(b.match.starts_at).getTime(),
  );
}

/** All predictions the current user is allowed to see (RLS-gated), oldest first. */
export async function getVisiblePredictions(): Promise<PredictionView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("predictions").select(SELECT);
  if (error) throw error;
  return sortByStart((data ?? []) as unknown as PredictionView[]);
}

export type Timeframe = "upcoming" | "past";

/** Predictions filtered to a timeframe and (optionally) a sport, correctly ordered. */
export async function getPredictions(
  timeframe: Timeframe,
  sport?: string,
): Promise<PredictionView[]> {
  const all = await getVisiblePredictions();
  const now = Date.now();
  let rows = all.filter((p) => {
    const future = new Date(p.match.starts_at).getTime() >= now;
    return timeframe === "upcoming" ? future : !future;
  });
  if (sport) rows = rows.filter((p) => p.match.league.sport_id === sport);
  // Upcoming: soonest first. Past: most recent first.
  return timeframe === "past" ? rows.reverse() : rows;
}

/** A single prediction by match id, or null if not visible / not found. */
export async function getPredictionByMatch(matchId: string): Promise<PredictionView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select(SELECT)
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PredictionView) ?? null;
}

/** The set of match ids the current user has favorited (empty if logged out). */
export async function getFavoriteMatchIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("match_id");
  return new Set(((data ?? []) as { match_id: string }[]).map((f) => f.match_id));
}

/** Predictions for the user's favorited matches (RLS-gated), soonest first. */
export async function getFavoritePredictions(): Promise<PredictionView[]> {
  const favs = await getFavoriteMatchIds();
  if (favs.size === 0) return [];
  const all = await getVisiblePredictions();
  return all.filter((p) => favs.has(p.match.id));
}

/** Stored feature differentials for a match (sport-specific inputs). */
export async function getMatchFeatures(
  matchId: string,
): Promise<Record<string, number | null>> {
  const supabase = await createClient();
  const { data } = await supabase.from("features").select("data").eq("match_id", matchId).maybeSingle();
  return ((data as { data: Record<string, number | null> } | null)?.data ?? {});
}

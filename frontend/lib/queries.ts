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
    event_name: string | null;
    context: { leaders?: { home?: string[]; away?: string[] } | null } | null;
    home: { name: string; logo_url: string | null };
    away: { name: string; logo_url: string | null };
    league: { sport_id: string };
  };
}

const SELECT = `
  id, probs, analysis, analysis_version, model_version, tier,
  match:matches!inner(
    id, starts_at, status, result, event_name, context,
    home:competitors!matches_home_id_fkey(name, logo_url),
    away:competitors!matches_away_id_fkey(name, logo_url),
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

export interface PastQuery {
  sport?: string;
  q?: string;
  event?: string;
  limit?: number;
}

/** Past predictions, server-side filtered + bounded (history can be thousands of
   rows, past PostgREST's 1000-row cap). We resolve ordered match ids first
   (sport / search / event filters live on the matches table), then fetch the
   RLS-gated predictions for them and restore the order. */
export async function getPastPredictions({
  sport,
  q,
  event,
  limit = 120,
}: PastQuery): Promise<PredictionView[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let order: string[] = [];
  const search = q?.trim();

  if (search) {
    const { data: comps } = await supabase
      .from("competitors")
      .select("id")
      .ilike("name", `%${search}%`)
      .limit(80);
    const ids = ((comps ?? []) as { id: string }[]).map((c) => c.id);
    if (ids.length === 0) return [];
    let mq = supabase
      .from("matches")
      .select("id, leagues!inner(sport_id)")
      .lt("starts_at", nowIso)
      .or(`home_id.in.(${ids.join(",")}),away_id.in.(${ids.join(",")})`)
      .order("starts_at", { ascending: false })
      .limit(limit);
    if (sport) mq = mq.eq("leagues.sport_id", sport);
    const { data } = await mq;
    order = ((data ?? []) as { id: string }[]).map((m) => m.id);
  } else {
    let mq = supabase
      .from("matches")
      .select("id, leagues!inner(sport_id)")
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(limit);
    if (sport) mq = mq.eq("leagues.sport_id", sport);
    if (event) mq = mq.eq("event_name", event);
    const { data } = await mq;
    order = ((data ?? []) as { id: string }[]).map((m) => m.id);
  }

  if (order.length === 0) return [];

  const { data, error } = await supabase.from("predictions").select(SELECT).in("match_id", order);
  if (error) throw error;
  const byMatch = new Map<string, PredictionView>();
  for (const p of (data ?? []) as unknown as PredictionView[]) byMatch.set(p.match.id, p);
  return order.map((id) => byMatch.get(id)).filter(Boolean) as PredictionView[];
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

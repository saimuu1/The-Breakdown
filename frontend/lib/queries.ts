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
    home: { id: string; name: string; logo_url: string | null };
    away: { id: string; name: string; logo_url: string | null };
    league: { sport_id: string };
  };
}

const SELECT = `
  id, probs, analysis, analysis_version, model_version, tier,
  match:matches!inner(
    id, starts_at, status, result, event_name, context,
    home:competitors!matches_home_id_fkey(id, name, logo_url),
    away:competitors!matches_away_id_fkey(id, name, logo_url),
    league:leagues!inner(sport_id)
  )
`;

type DB = Awaited<ReturnType<typeof createClient>>;

/** Fetch RLS-gated predictions for a set of match ids, restored to the given
   order. We resolve match ids first (bounded) and fetch by id here, rather than
   selecting every prediction — the predictions table is past PostgREST's
   1000-row cap, so an unbounded select silently drops rows. */
async function predictionsForMatches(db: DB, orderedIds: string[]): Promise<PredictionView[]> {
  if (orderedIds.length === 0) return [];
  const { data, error } = await db.from("predictions").select(SELECT).in("match_id", orderedIds);
  if (error) throw error;
  const byMatch = new Map<string, PredictionView>();
  for (const p of (data ?? []) as unknown as PredictionView[]) byMatch.set(p.match.id, p);
  return orderedIds.map((id) => byMatch.get(id)).filter(Boolean) as PredictionView[];
}

/** Match a prediction against free-text search: event name, either competitor,
   or an "A vs B" pair. Used to filter the (bounded) upcoming set in-memory. */
export function predictionMatchesQuery(p: PredictionView, query: string): boolean {
  const s = query.trim().toLowerCase();
  if (!s) return true;
  const ev = (p.match.event_name ?? "").toLowerCase();
  const home = p.match.home.name.toLowerCase();
  const away = p.match.away.name.toLowerCase();
  const parts = s.split(/\s+vs\.?\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 2) {
    const [a, b] = parts;
    const pairHit =
      (home.includes(a) || away.includes(a)) && (home.includes(b) || away.includes(b));
    return pairHit || ev.includes(s);
  }
  return ev.includes(s) || home.includes(s) || away.includes(s);
}

const UPCOMING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** The upcoming board window: every card within ~the next month, plus marquee
   PPV / numbered events beyond it (the big, heavily-promoted fights — e.g. an
   Islam vs. Ian title bout months out). Fight Nights beyond the window wait
   until they roll into it. */
export function withinUpcomingWindow(predictions: PredictionView[]): PredictionView[] {
  const cutoff = Date.now() + UPCOMING_WINDOW_MS;
  return predictions.filter((p) => {
    if (new Date(p.match.starts_at).getTime() <= cutoff) return true;
    const event = p.match.event_name ?? "";
    return !!event && !/fight night/i.test(event);
  });
}

export type Timeframe = "upcoming" | "past";

/** Predictions filtered to a timeframe and (optionally) a sport, correctly
   ordered (upcoming: soonest first; past: most recent first). */
export async function getPredictions(
  timeframe: Timeframe,
  sport?: string,
  limit = 400,
): Promise<PredictionView[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const upcoming = timeframe === "upcoming";

  let mq = supabase
    .from("matches")
    .select("id, leagues!inner(sport_id)")
    .order("starts_at", { ascending: upcoming })
    .limit(limit);
  mq = upcoming ? mq.gte("starts_at", nowIso) : mq.lt("starts_at", nowIso);
  if (sport) mq = mq.eq("leagues.sport_id", sport);

  const { data } = await mq;
  const order = ((data ?? []) as { id: string }[]).map((m) => m.id);
  return predictionsForMatches(supabase, order);
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

  // A past-matches query scoped to the sport, newest first. Extra filters are
  // chained by the caller.
  const pastMatches = () => {
    const mq = supabase
      .from("matches")
      .select("id, leagues!inner(sport_id)")
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(limit);
    return sport ? mq.eq("leagues.sport_id", sport) : mq;
  };

  const idsFor = async (name: string): Promise<string[]> => {
    const { data } = await supabase
      .from("competitors")
      .select("id")
      .ilike("name", `%${name}%`)
      .limit(80);
    return ((data ?? []) as { id: string }[]).map((c) => c.id);
  };

  if (search) {
    const matchIds = new Set<string>();
    const add = (rows: { id: string }[] | null) => {
      for (const m of rows ?? []) matchIds.add(m.id);
    };

    // 1) Event-name match (e.g. "UFC 328", "Freedom").
    const { data: byEvent } = await pastMatches().ilike("event_name", `%${search}%`);
    add(byEvent as { id: string }[] | null);

    // 2) Fighter / team match. "A vs B" → both fighters must appear in the bout.
    const parts = search.split(/\s+vs\.?\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const [idsA, idsB] = await Promise.all([idsFor(parts[0]), idsFor(parts[1])]);
      if (idsA.length && idsB.length) {
        const { data } = await pastMatches()
          .or(`home_id.in.(${idsA.join(",")}),away_id.in.(${idsA.join(",")})`)
          .or(`home_id.in.(${idsB.join(",")}),away_id.in.(${idsB.join(",")})`);
        add(data as { id: string }[] | null);
      }
    } else {
      const ids = await idsFor(search);
      if (ids.length) {
        const { data } = await pastMatches().or(
          `home_id.in.(${ids.join(",")}),away_id.in.(${ids.join(",")})`,
        );
        add(data as { id: string }[] | null);
      }
    }

    if (matchIds.size === 0) return [];

    // Final ordered pass over the union (most recent first).
    const { data } = await pastMatches().in("id", [...matchIds]);
    order = ((data ?? []) as { id: string }[]).map((m) => m.id);
  } else {
    let mq = pastMatches();
    if (event) mq = mq.eq("event_name", event);
    const { data } = await mq;
    order = ((data ?? []) as { id: string }[]).map((m) => m.id);
  }

  return predictionsForMatches(supabase, order);
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

/** The current user's plan ("free" when logged out or no profile). */
export async function getMyPlan(): Promise<"free" | "pro"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";
  const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  return ((data as { plan?: string } | null)?.plan === "pro" ? "pro" : "free");
}

/** The set of competitor ids the current user follows (empty if logged out). */
export async function getFollowedCompetitorIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("followed_competitors").select("competitor_id");
  return new Set(((data ?? []) as { competitor_id: string }[]).map((r) => r.competitor_id));
}

export interface FollowedCompetitor {
  id: string;
  name: string;
  logo_url: string | null;
  sport: string;
}

/** The competitors the current user follows, with name / logo / sport, for the
   "Following" management list. Alphabetical. */
export async function getFollowedCompetitors(): Promise<FollowedCompetitor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followed_competitors")
    .select("competitor:competitors(id, name, logo_url, league:leagues(sport_id))");

  type Row = {
    competitor: {
      id: string;
      name: string;
      logo_url: string | null;
      league: { sport_id: string } | null;
    } | null;
  };

  const out: FollowedCompetitor[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.competitor) continue;
    out.push({
      id: r.competitor.id,
      name: r.competitor.name,
      logo_url: r.competitor.logo_url,
      sport: r.competitor.league?.sport_id ?? "unknown",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Stored feature differentials for a match (sport-specific inputs). */
export async function getMatchFeatures(
  matchId: string,
): Promise<Record<string, number | null>> {
  const supabase = await createClient();
  const { data } = await supabase.from("features").select("data").eq("match_id", matchId).maybeSingle();
  return ((data as { data: Record<string, number | null> } | null)?.data ?? {});
}

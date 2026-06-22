import { createClient } from "@/lib/supabase/server";

export type FeedItemType = "upcoming_match" | "recent_result" | "streak";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  importance: number;
  sport: string;
  entity: { id: string; name: string; logoUrl: string | null };
  matchId: string | null;
  headline: string;
  detail: string;
  timestamp: string;
}

// WC 2026 starts on this date; soccer games on/after → WC games.
const WC_START = "2026-06-11";
// NBA playoffs start date for the 2025-26 season.
const NBA_PLAYOFF_START = "2026-04-18";

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / 86400000);
  const hours = Math.floor(absDiff / 3600000);
  if (diff > 0) {
    if (days > 1) return `in ${days} days`;
    if (hours > 1) return `in ${hours} hours`;
    return "today";
  }
  if (days > 1) return `${days} days ago`;
  if (hours > 1) return `${hours} hours ago`;
  return "today";
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function wcRound(priorGames: number): string {
  const game = priorGames + 1;
  if (game <= 3) return "Group Stage";
  if (game === 4) return "Round of 16";
  if (game === 5) return "Quarterfinal";
  if (game === 6) return "Semifinal";
  return "Final";
}

function scoreUpcoming(
  sport: string,
  eventName: string | null,
  wcPriorGames: number,
  pred: { probs: Record<string, number> } | undefined,
  isHome: boolean,
): number {
  let base: number;
  if (sport === "soccer") {
    const game = wcPriorGames + 1;
    if (game <= 3) base = 70;
    else if (game === 4) base = 85;
    else if (game === 5) base = 90;
    else if (game === 6) base = 95;
    else base = 100;
  } else if (sport === "nba") {
    base = 85;
  } else {
    // UFC — PPV (event name is "UFC {number}") vs Fight Night
    const isPPV = !!eventName && /^ufc\s+\d+/i.test(eventName);
    base = isPPV ? 80 : 65;
  }

  // Boost if model strongly favors the OTHER side (underdog situation for follower)
  if (pred) {
    const myKey = isHome ? "home" : "away";
    const myProb = pred.probs[myKey] ?? 0.5;
    if (myProb < 0.35) base += 5; // tough matchup coming up
  }
  return base;
}

function scoreResult(sport: string, wcPriorGames: number): number {
  if (sport === "soccer") {
    const game = wcPriorGames;
    if (game <= 3) return 65;
    if (game === 4) return 80;
    if (game === 5) return 85;
    return 90;
  }
  if (sport === "nba") return 75;
  // UFC Fight Night 60, PPV 70 (we don't track past event type here, use mid)
  return 65;
}

interface MatchRow {
  id: string;
  starts_at: string;
  status: string;
  result: { winner?: string; winner_name?: string } | null;
  event_name: string | null;
  home: { id: string; name: string; logo_url: string | null };
  away: { id: string; name: string; logo_url: string | null };
  league: { sport_id: string };
}

interface FollowRow {
  competitor_id: string;
  competitor: {
    id: string;
    name: string;
    logo_url: string | null;
    league: { sport_id: string } | null;
  };
}

function computeStreak(
  matches: MatchRow[],
  cid: string,
): { count: number; winning: boolean } {
  const results: boolean[] = [];
  for (const m of matches) {
    const winner = m.result?.winner;
    if (!winner || winner === "draw") continue;
    const isHome = m.home.id === cid;
    results.push(winner === (isHome ? "home" : "away"));
  }
  if (results.length === 0) return { count: 0, winning: true };
  const first = results[0];
  let count = 0;
  for (const r of results) {
    if (r === first) count++;
    else break;
  }
  return { count, winning: first };
}

export async function getFeed(): Promise<FeedItem[]> {
  const supabase = await createClient();

  const { data: rawFollows } = await supabase
    .from("followed_competitors")
    .select(
      "competitor_id, competitor:competitors(id, name, logo_url, league:leagues(sport_id))",
    );

  const follows = (rawFollows ?? []) as unknown as FollowRow[];
  if (follows.length === 0) return [];

  const ids = follows.map((f) => f.competitor_id);

  const { data: rawMatches } = await supabase
    .from("matches")
    .select(
      "id, starts_at, status, result, event_name," +
        "home:competitors!matches_home_id_fkey(id, name, logo_url)," +
        "away:competitors!matches_away_id_fkey(id, name, logo_url)," +
        "league:leagues!inner(sport_id)",
    )
    .or(`home_id.in.(${ids.join(",")}),away_id.in.(${ids.join(",")})`)
    .order("starts_at", { ascending: false })
    .limit(400);

  const allMatches = (rawMatches ?? []) as unknown as MatchRow[];
  const now = new Date().toISOString();
  const upcoming = allMatches.filter((m) => m.starts_at >= now);
  const completed = allMatches.filter((m) => m.starts_at < now && m.result);

  // Fetch probabilities for upcoming matches.
  const upcomingIds = upcoming.map((m) => m.id);
  const predsByMatch = new Map<string, { probs: Record<string, number> }>();
  if (upcomingIds.length > 0) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("match_id, probs")
      .in("match_id", upcomingIds);
    for (const p of (preds ?? []) as { match_id: string; probs: Record<string, number> }[]) {
      predsByMatch.set(p.match_id, p);
    }
  }

  const items: FeedItem[] = [];

  for (const follow of follows) {
    const cid = follow.competitor_id;
    const comp = follow.competitor;
    const sport = comp.league?.sport_id ?? "unknown";
    const entity = { id: cid, name: comp.name, logoUrl: comp.logo_url };

    const myUpcoming = upcoming
      .filter((m) => m.home.id === cid || m.away.id === cid)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const myCompleted = completed
      .filter((m) => m.home.id === cid || m.away.id === cid)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

    // Count prior WC/playoff games for round detection
    const wcPriorGames = myCompleted.filter(
      (m) => m.league.sport_id === "soccer" && m.starts_at >= WC_START,
    ).length;

    // --- UPCOMING MATCH ---
    if (myUpcoming.length > 0) {
      const m = myUpcoming[0];
      const isHome = m.home.id === cid;
      const opponent = isHome ? m.away : m.home;
      const pred = predsByMatch.get(m.id);
      const importance = scoreUpcoming(sport, m.event_name, wcPriorGames, pred, isHome);

      const round = sport === "soccer" ? wcRound(wcPriorGames) : null;
      const nbaGame =
        sport === "nba" && m.starts_at >= NBA_PLAYOFF_START ? "Playoffs" : null;
      const context = round ?? nbaGame ?? m.event_name ?? "";

      let detail = "";
      if (pred) {
        const myKey = isHome ? "home" : "away";
        const pct = Math.round((pred.probs[myKey] ?? 0.5) * 100);
        detail = `Model gives ${comp.name} ${pct}%`;
        if (context) detail += ` · ${context}`;
      } else if (context) {
        detail = context;
      }
      detail += ` · ${formatShort(m.starts_at)}`;

      items.push({
        id: `upcoming-${cid}-${m.id}`,
        type: "upcoming_match",
        importance,
        sport,
        entity,
        matchId: m.id,
        headline: `vs ${opponent.name} — ${relativeTime(m.starts_at)}`,
        detail,
        timestamp: m.starts_at,
      });
    }

    // --- STREAK ---
    if (myCompleted.length >= 3) {
      const streak = computeStreak(myCompleted.slice(0, 10), cid);
      if (streak.count >= 3) {
        const last = myCompleted[0];
        const isHome = last.home.id === cid;
        const opponent = isHome ? last.away : last.home;
        items.push({
          id: `streak-${cid}`,
          type: "streak",
          importance: streak.count >= 5 ? 80 : 75,
          sport,
          entity,
          matchId: last.id,
          headline: `${streak.count}-${streak.winning ? "win" : "loss"} streak`,
          detail: `Most recently ${streak.winning ? "beat" : "lost to"} ${opponent.name} · ${formatShort(last.starts_at)}`,
          timestamp: last.starts_at,
        });
      }
    }

    // --- RECENT RESULT ---
    if (myCompleted.length > 0) {
      const m = myCompleted[0];
      const isHome = m.home.id === cid;
      const opponent = isHome ? m.away : m.home;
      const winner = m.result?.winner;
      const won = winner === (isHome ? "home" : "away");
      const draw = winner === "draw";
      const winnerName = m.result?.winner_name ?? (draw ? "Draw" : won ? comp.name : opponent.name);

      const importance = scoreResult(sport, wcPriorGames);

      const round =
        sport === "soccer" ? wcRound(wcPriorGames) : m.event_name ?? null;
      const detail = [winnerName + (draw ? "" : " won"), round, formatShort(m.starts_at)]
        .filter(Boolean)
        .join(" · ");

      items.push({
        id: `result-${cid}-${m.id}`,
        type: "recent_result",
        importance,
        sport,
        entity,
        matchId: m.id,
        headline: draw
          ? `Drew with ${opponent.name}`
          : `${won ? "Defeated" : "Lost to"} ${opponent.name}`,
        detail,
        timestamp: m.starts_at,
      });
    }
  }

  // Sort by importance desc, then timestamp desc for same importance.
  items.sort(
    (a, b) =>
      b.importance - a.importance || b.timestamp.localeCompare(a.timestamp),
  );

  // Deduplicate: same match can appear for multiple followed competitors.
  // Keep the first (highest-importance) occurrence.
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.matchId ? `${item.type}-${item.matchId}` : item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

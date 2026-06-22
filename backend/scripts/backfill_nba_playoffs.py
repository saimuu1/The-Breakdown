"""Re-predict NBA playoff games with the series-aware model.

    python -m scripts.backfill_nba_playoffs [--start 2026-04-18]

The plain NBA model treats every game as an isolated rolling-form matchup. The
playoffs are a series, so this recomputes each playoff game's win probability
with `app.sports.nba.playoffs`: frozen pre-series strength (ELO + net rating +
home court) blended 40/60 with what's actually happened in the series so far
(record + point differential + home court). Game 1 is pure pre-series; later
games lean on the series itself.

Scores come from data/nba/games.csv (the only source with raw scores). Each
game's prediction is updated IN PLACE on its existing DB row, so the cached
analysis is preserved. Point-in-time throughout — a game's inputs use only games
that finished before it. No LLM.

Operational note: run this AFTER any plain `backfill_nba_*` so playoff rows keep
the series-aware probabilities.
"""

import argparse
import logging
import sys
from collections import defaultdict

from app.repositories.supabase_repo import SupabaseRepository
from app.sports.nba.data import load_games
from app.sports.nba.playoffs import (
    MODEL_VERSION,
    Game,
    compute_elo,
    playoff_game_prob,
    season_net_rating,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-nba-playoffs")

DEFAULT_START = "2026-04-18"  # playoffs proper (after the play-in)


def _games_from_csv() -> list[Game]:
    df = load_games().dropna(subset=["home_score", "away_score"])
    out: list[Game] = []
    for _, r in df.iterrows():
        out.append(
            Game(str(r["date"])[:10], r["home_team"], r["away_team"],
                 float(r["home_score"]), float(r["away_score"]))
        )
    return out


def _db_series_index(
    repo: SupabaseRepository, league_id: str, start: str
) -> dict[frozenset, list[dict]]:
    """frozenset(team pair) -> playoff-era DB matches for that pair, sorted by
    date. Each entry: {id, home, away}. Both this list and the games.csv series
    are in chronological order, so we pair them by ordinal — robust to the UTC
    date offset that makes a per-game date match unreliable."""
    db = repo._db  # noqa: SLF001 — maintenance script
    rows = (
        db.table("matches")
        .select("id,starts_at,home:competitors!matches_home_id_fkey(name),"
                "away:competitors!matches_away_id_fkey(name)")
        .eq("league_id", league_id)
        .gte("starts_at", start)
        .order("starts_at")
        .execute()
        .data
    )
    index: dict[frozenset, list[dict]] = defaultdict(list)
    for r in rows:
        pair = frozenset({r["home"]["name"], r["away"]["name"]})
        index[pair].append({"id": r["id"], "home": r["home"]["name"], "away": r["away"]["name"]})
    return index


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default=DEFAULT_START, help="playoff cutoff date (YYYY-MM-DD)")
    args = parser.parse_args()

    games = _games_from_csv()
    playoffs = sorted((g for g in games if g.date >= args.start), key=lambda g: g.date)
    if not playoffs:
        logger.warning("No playoff games found on/after %s", args.start)
        return 0

    # Group into series by the unordered team pair; order each chronologically.
    series: dict[frozenset, list[Game]] = defaultdict(list)
    for g in playoffs:
        series[frozenset({g.home, g.away})].append(g)

    repo = SupabaseRepository()
    db = repo._db  # noqa: SLF001
    league_id = repo.ensure_league("nba", "nba")
    index = _db_series_index(repo, league_id, start=args.start)

    updated = unmatched = 0
    for pair, series_games in series.items():
        if len(series_games) < 2:
            continue  # play-in straggler, not a real series
        db_matches = index.get(pair, [])
        if len(db_matches) != len(series_games):
            logger.warning(
                "series %s: %d csv games vs %d db matches; skipping",
                set(pair), len(series_games), len(db_matches),
            )
            unmatched += len(series_games)
            continue

        start = series_games[0].date
        elo = compute_elo(games, before=start)
        net = season_net_rating(games, before=start)

        for i, (g, m) in enumerate(zip(series_games, db_matches, strict=True)):
            prior = series_games[:i]  # only games already played in this series
            p = playoff_game_prob(elo, net, g.home, g.away, prior)
            # Orient to the DB row's home/away by team name (defensive: same source,
            # but never write a flipped probability).
            by_team = {g.home: p["home"], g.away: p["away"]}
            probs = {"home": by_team[m["home"]], "away": by_team[m["away"]]}

            db.table("predictions").update(
                {"probs": probs, "model_version": MODEL_VERSION}
            ).eq("match_id", m["id"]).execute()
            updated += 1
            fav = m["home"] if probs["home"] >= 0.5 else m["away"]
            logger.info(
                "  G%d %s vs %s -> %s %.0f%%",
                i + 1, m["home"], m["away"], fav, max(probs.values()) * 100,
            )

    logger.info("Playoff re-prediction complete: %d updated, %d unmatched", updated, unmatched)
    return 0


if __name__ == "__main__":
    sys.exit(main())

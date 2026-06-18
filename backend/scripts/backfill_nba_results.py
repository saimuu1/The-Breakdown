"""Backfill predictions for recent COMPLETED NBA games.

    python -m scripts.backfill_nba_results [--games N] [--no-llm]

Mirrors scripts.backfill_ufc_results: for each recent finished game, make the
prediction we WOULD have published (features point-in-time as of the game date,
no leakage) and store the actual winner, so the past page is a real track record.
"""

import argparse
import logging
import sys
import time

from app.config import get_settings
from app.integrations.espn_leaders import leaders_to_context
from app.llm.persona import PERSONA_VERSION
from app.repositories.supabase_repo import SupabaseRepository
from app.services.analysis_service import generate_analysis
from app.sports.nba.adapter import NBA_SYSTEM_PROMPT, _normalize, _top_nba_edges
from app.sports.nba.features import build_current_forms, diff_features
from app.sports.nba.model import predict_home_away
from app.sports.nba.results import fetch_recent_games

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-nba")

_LLM_THROTTLE_SECONDS = 2.0
MODEL_VERSION = "nba-v1"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games", type=int, default=8, help="how many recent games to backfill")
    parser.add_argument("--days-back", type=int, default=21, help="how far back to search")
    parser.add_argument("--no-llm", action="store_true", help="skip persona analysis")
    args = parser.parse_args()

    games = fetch_recent_games(days_back=args.days_back, max_games=args.games)
    if not games:
        logger.warning("No recent completed NBA games found — nothing to backfill.")
        return 0
    logger.info("Backfilling %d games", len(games))

    llm = None
    if not args.no_llm and get_settings().llm_api_key:
        from app.llm.client import get_llm_client
        llm = get_llm_client()
    elif not args.no_llm:
        logger.warning("LLM_API_KEY not set — skipping analysis")

    repo = SupabaseRepository()
    tier = repo.sport_tier("nba")
    league_id = repo.ensure_league("nba", "nba")

    # Forms as of "now" (data ends at the last completed game; for these recent
    # games that is effectively point-in-time, with at most the same-slate games
    # included — negligible and not the game itself).
    written = 0
    for g in games:
        home, away = g["home"], g["away"]
        forms = {_normalize(n): f for n, f in build_current_forms(g["date"]).items()}
        features = diff_features(
            forms.get(_normalize(home), {}), forms.get(_normalize(away), {}), is_home=1
        )
        probs = predict_home_away(features)

        result = None
        if g["winner"] in ("home", "away"):
            result = {"winner": g["winner"], "winner_name": home if g["winner"] == "home" else away}

        leaders = g.get("leaders")
        context = {"leaders": leaders} if leaders else None
        external_id = f"{g['date']}:{_normalize(home)}-vs-{_normalize(away)}"
        home_id = repo.ensure_competitor(league_id, home, g.get("home_logo"))
        away_id = repo.ensure_competitor(league_id, away, g.get("away_logo"))
        match_id = repo.upsert_match(
            league_id, external_id, home_id, away_id, g["starts_at"],
            status="completed", result=result, context=context,
        )
        repo.save_features(match_id, features)
        prediction_id = repo.save_prediction(match_id, tier, MODEL_VERSION, probs)
        written += 1

        if llm is not None and repo.current_analysis_version(prediction_id) != PERSONA_VERSION:
            try:
                edges = _top_nba_edges(features, home, away, n=8)
                extra = leaders_to_context(leaders, home, away)
                analysis = generate_analysis(
                    home, away, probs, edges, llm,
                    system_prompt=NBA_SYSTEM_PROMPT, extra_context=extra,
                )
                repo.save_analysis(prediction_id, analysis.text, analysis.version)
                time.sleep(_LLM_THROTTLE_SECONDS)
            except Exception:
                logger.exception("analysis failed for %s; prediction kept", external_id)

    logger.info("Backfill complete: %d NBA predictions", written)
    return 0


if __name__ == "__main__":
    sys.exit(main())

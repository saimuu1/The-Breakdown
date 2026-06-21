"""Backfill predictions + real results for COMPLETED World Cup 2026 games.

    python -m scripts.backfill_soccer_results [--days-back N] [--no-llm]

The live soccer pipeline only ingests "pre"-state fixtures, so a game disappears
the moment it kicks off and no result is ever recorded. This pulls finished games
from ESPN and, for each, makes the prediction we WOULD have published — features
computed point-in-time as of the match date (no leakage) — then stores the actual
winner so the past page is a real, graded track record.

External ids match the live adapter's scheme, so games already sitting in the DB
as `scheduled` get upgraded in place to `completed` (no duplicates).

Reuses the same repository, model, and analysis services as live ingestion; only
the fixture source (finished games) and result storage differ.
"""

import argparse
import logging
import sys
import time

from app.config import get_settings
from app.llm.persona import PERSONA_VERSION
from app.repositories.supabase_repo import SupabaseRepository
from app.services.analysis_service import generate_analysis
from app.sports.soccer.adapter import _normalize, _resolve, _top_soccer_edges
from app.sports.soccer.features import build_current_forms, diff_features
from app.sports.soccer.model import predict_match
from app.sports.soccer.results import fetch_completed_matches

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill")

_LLM_THROTTLE_SECONDS = 2.0
MODEL_VERSION = "soccer-v1"

# The shared persona, used so the write-up matches live soccer ingestion.
try:
    from app.sports.soccer.adapter import adapter as _soccer_adapter
    _SYSTEM_PROMPT = getattr(_soccer_adapter, "system_prompt", None)
except Exception:  # pragma: no cover - defensive
    _SYSTEM_PROMPT = None


_FORMS_CACHE: dict[str, dict] = {}


def _forms_as_of(day: str) -> dict[str, dict]:
    """Point-in-time team forms as of `day` (YYYY-MM-DD), cached per day."""
    if day not in _FORMS_CACHE:
        _FORMS_CACHE[day] = {_resolve(n): f for n, f in build_current_forms(day).items()}
    return _FORMS_CACHE[day]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days-back", type=int, default=21, help="how far back to search")
    parser.add_argument("--no-llm", action="store_true", help="skip persona analysis generation")
    args = parser.parse_args()

    matches = fetch_completed_matches(days_back=args.days_back)
    if not matches:
        logger.warning("No completed World Cup matches found — nothing to backfill.")
        return 0
    logger.info("Backfilling %d completed matches", len(matches))

    llm = None
    if not args.no_llm and get_settings().llm_api_key:
        from app.llm.client import get_llm_client
        llm = get_llm_client()
    elif not args.no_llm:
        logger.warning("LLM_API_KEY not set — skipping analysis")

    repo = SupabaseRepository()
    tier = repo.sport_tier("soccer")
    league_id = repo.ensure_league("soccer", "soccer")

    written = 0
    for m in matches:
        home, away = m["home"], m["away"]
        external_id = f"wc2026:{m['date']}:{_normalize(home)}-vs-{_normalize(away)}"

        forms = _forms_as_of(m["date"])
        features = diff_features(
            forms.get(_resolve(home), {}), forms.get(_resolve(away), {}), m["is_neutral"]
        )
        probs = predict_match(features)

        winner = m["winner"]
        winner_name = "Draw" if winner == "draw" else (home if winner == "home" else away)
        result = {"winner": winner, "winner_name": winner_name}

        home_id = repo.ensure_competitor(league_id, home, m.get("home_logo"))
        away_id = repo.ensure_competitor(league_id, away, m.get("away_logo"))
        match_id = repo.upsert_match(
            league_id, external_id, home_id, away_id, m["starts_at"],
            status="completed", result=result,
        )
        repo.save_features(match_id, features)
        prediction_id = repo.save_prediction(match_id, tier, MODEL_VERSION, probs)
        written += 1
        logger.info("  %s %d-%d %s", home, m["home_score"], m["away_score"], away)

        if llm is not None and repo.current_analysis_version(prediction_id) != PERSONA_VERSION:
            try:
                edges = _top_soccer_edges(features, home, away, n=6)
                analysis = generate_analysis(
                    home, away, probs, edges, llm, system_prompt=_SYSTEM_PROMPT,
                )
                repo.save_analysis(prediction_id, analysis.text, analysis.version)
                time.sleep(_LLM_THROTTLE_SECONDS)
            except Exception:
                logger.exception("analysis failed for %s; prediction kept", external_id)

    logger.info("Backfill complete: %d completed matches written", written)
    return 0


if __name__ == "__main__":
    sys.exit(main())

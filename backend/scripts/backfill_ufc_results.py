"""Backfill predictions for recent COMPLETED UFC events.

    python -m scripts.backfill_ufc_results [--events N] [--no-llm]

The live ingestion pipeline only writes upcoming fights, so the "past
predictions" page shows nothing recent. This pulls the last few finished events
from ESPN and, for each bout, makes the prediction we WOULD have published —
features computed point-in-time as of the event date (no leakage) — then stores
the actual winner so the past page is a real track record.

Reuses the same repository, model, and analysis services as live ingestion;
only the fixture source (recent results) and result storage differ.
"""

import argparse
import logging
import sys
import time

from app.config import get_settings
from app.llm.persona import PERSONA_VERSION, top_edges
from app.repositories.supabase_repo import SupabaseRepository
from app.services.analysis_service import generate_analysis
from app.sports.ufc.features import (
    build_current_forms,
    diff_features,
    normalize_name,
    recent_results,
)
from app.sports.ufc.model import predict_home_away
from app.sports.ufc.results import fetch_recent_events

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill")

_LLM_THROTTLE_SECONDS = 2.0
MODEL_VERSION = "ufc-v1"


def _backfill_event(event: dict, repo: SupabaseRepository, tier: str, llm) -> int:
    """Write predictions (+ result, + analysis) for one event. Returns bouts written."""
    # Point-in-time forms + recent results as of the event date (no leakage).
    forms = {normalize_name(n): f for n, f in build_current_forms(event["date"]).items()}
    recent = recent_results(event["date"])
    league_id = repo.ensure_league("ufc", "ufc")
    written = 0

    for bout in event["bouts"]:
        home, away = bout["home"], bout["away"]
        external_id = f"{event['date']}:{home}-vs-{away}"

        home_form = forms.get(normalize_name(home), {})
        away_form = forms.get(normalize_name(away), {})
        features = diff_features(home_form, away_form)
        probs = predict_home_away(features)

        result = None
        if bout["winner"] in ("home", "away"):
            winner_name = home if bout["winner"] == "home" else away
            result = {"winner": bout["winner"], "winner_name": winner_name}

        home_id = repo.ensure_competitor(league_id, home)
        away_id = repo.ensure_competitor(league_id, away)
        match_id = repo.upsert_match(
            league_id, external_id, home_id, away_id, event["starts_at"],
            status="completed", result=result, event_name=event["name"],
        )
        repo.save_features(match_id, features)
        prediction_id = repo.save_prediction(match_id, tier, MODEL_VERSION, probs)
        written += 1

        if llm is not None and repo.current_analysis_version(prediction_id) != PERSONA_VERSION:
            try:
                edges = top_edges(features, home, away)
                extra = [
                    f"{nm} recent fights: " + "; ".join(recent[normalize_name(nm)])
                    for nm in (home, away)
                    if recent.get(normalize_name(nm))
                ]
                analysis = generate_analysis(home, away, probs, edges, llm, extra_context=extra)
                repo.save_analysis(prediction_id, analysis.text, analysis.version)
                time.sleep(_LLM_THROTTLE_SECONDS)
            except Exception:
                logger.exception("analysis failed for %s; prediction kept", external_id)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", type=int, default=3, help="how many recent events to backfill")
    parser.add_argument("--days-back", type=int, default=60, help="how far back to search")
    parser.add_argument("--no-llm", action="store_true", help="skip persona analysis generation")
    args = parser.parse_args()

    events = fetch_recent_events(days_back=args.days_back, max_events=args.events)
    if not events:
        logger.warning("No recent completed events found — nothing to backfill.")
        return 0
    logger.info("Backfilling %d events: %s", len(events), [e["name"] for e in events])

    llm = None
    if not args.no_llm and get_settings().llm_api_key:
        from app.llm.client import get_llm_client
        llm = get_llm_client()
    elif not args.no_llm:
        logger.warning("LLM_API_KEY not set — skipping analysis")

    repo = SupabaseRepository()
    tier = repo.sport_tier("ufc")

    total = 0
    for event in events:
        n = _backfill_event(event, repo, tier, llm)
        logger.info("  %s → %d bouts", event["name"], n)
        total += n

    logger.info("Backfill complete: %d predictions across %d events", total, len(events))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Backfill the last NBA season of past predictions from cached game data.

    python -m scripts.backfill_nba_season [--days 260]

Reuses `nba.features.build_training_frame()` (leak-free point-in-time form +
actual outcome for every game in data/nba/games.csv) to write the prediction we
WOULD have published for each game in the last season, so the past page is
browsable/searchable across the whole season.

No LLM here — the recent playoff games already get write-ups (+ player leaders)
from `backfill_nba_results`; regular-season games show the stat-based breakdown.
"""

import argparse
import logging
import sys
import time
from datetime import date

import httpx
import pandas as pd

from app.repositories.supabase_repo import SupabaseRepository
from app.sports.nba.features import FEATURE_COLUMNS, build_training_frame
from app.sports.nba.model import predict_home_away

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-nba-season")

MODEL_VERSION = "nba-v1"


def _normalize(name: str) -> str:
    return " ".join(name.lower().split())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=300, help="how many days back to backfill")
    args = parser.parse_args()

    X, y, meta = build_training_frame()
    meta = meta.copy()
    meta["date"] = pd.to_datetime(meta["date"])
    cutoff = pd.Timestamp(date.today()) - pd.Timedelta(days=args.days)
    idxs = list(meta.index[meta["date"] >= cutoff])
    logger.info("Backfilling %d NBA games since %s", len(idxs), cutoff.date())

    repo = SupabaseRepository()
    tier = repo.sport_tier("nba")
    league_id = repo.ensure_league("nba", "nba")
    comp_cache: dict[str, str] = {}

    def comp_id(name: str) -> str:
        key = _normalize(name)
        if key not in comp_cache:
            comp_cache[key] = repo.ensure_competitor(league_id, name)
        return comp_cache[key]

    written = 0
    for i in idxs:
        row = meta.loc[i]
        home, away = row["home"], row["away"]
        features = {c: X.loc[i, c] for c in FEATURE_COLUMNS}
        probs = predict_home_away(features)

        home_won = int(y[i]) == 1
        result = {
            "winner": "home" if home_won else "away",
            "winner_name": home if home_won else away,
        }
        starts_at = row["date"].strftime("%Y-%m-%dT%H:%M:%SZ")
        external_id = f"{row['date'].date()}:{_normalize(home)}-vs-{_normalize(away)}"
        for attempt in range(3):
            try:
                match_id = repo.upsert_match(
                    league_id, external_id, comp_id(home), comp_id(away), starts_at,
                    status="completed", result=result,
                )
                repo.save_features(match_id, features)
                repo.save_prediction(match_id, tier, MODEL_VERSION, probs)
                break
            except httpx.ReadTimeout:
                if attempt == 2:
                    raise
                logger.warning("Read timeout on game %s, retrying in 5s…", external_id)
                time.sleep(5)

        written += 1
        if written % 100 == 0:
            logger.info("  …%d games written", written)

    logger.info("NBA season backfill complete: %d games", written)
    return 0


if __name__ == "__main__":
    sys.exit(main())

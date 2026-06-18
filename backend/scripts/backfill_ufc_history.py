"""Backfill years of past UFC predictions from our local UFCStats data.

    python -m scripts.backfill_ufc_history [--years 3]

ESPN only exposes the current UFC season, but our local UFCStats data goes back
to 1994 WITH results — and `build_training_frame()` already yields leak-free
point-in-time features + the actual outcome for every fight. We reuse it to write
the prediction we WOULD have published for each historical bout, grouped by card
(`event_name`), so the past page can browse back years.

No LLM here (thousands of bouts would blow the free tier) — the most recent card
gets its write-up from `backfill_ufc_results`; older cards show the full
stat-based breakdown (head-to-head + key edges) instead.
"""

import argparse
import logging
import sys
import time
from datetime import date

import httpx
import pandas as pd

from app.repositories.supabase_repo import SupabaseRepository
from app.sports.ufc.features import FEATURE_COLUMNS, build_training_frame, normalize_name
from app.sports.ufc.model import predict_home_away

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-ufc-history")

MODEL_VERSION = "ufc-v1"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", type=int, default=1, help="how many years back to backfill")
    args = parser.parse_args()

    logger.info("Building point-in-time features for all historical fights…")
    X, y, meta = build_training_frame()
    meta = meta.copy()
    meta["date"] = pd.to_datetime(meta["date"])
    cutoff = pd.Timestamp(date.today()) - pd.DateOffset(years=args.years)
    mask = meta["date"] >= cutoff
    idxs = list(meta.index[mask])
    logger.info("Backfilling %d fights since %s", len(idxs), cutoff.date())

    repo = SupabaseRepository()
    tier = repo.sport_tier("ufc")
    league_id = repo.ensure_league("ufc", "ufc")

    # Cache competitor ids in-memory to avoid thousands of duplicate lookups.
    comp_cache: dict[str, str] = {}

    def comp_id(name: str) -> str:
        key = normalize_name(name)
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
        winner_name = home if home_won else away
        result = {"winner": "home" if home_won else "away", "winner_name": winner_name}

        starts_at = row["date"].strftime("%Y-%m-%dT%H:%M:%SZ")
        external_id = f"{row['date'].date()}:{normalize_name(home)}-vs-{normalize_name(away)}"

        for attempt in range(3):
            try:
                match_id = repo.upsert_match(
                    league_id, external_id, comp_id(home), comp_id(away), starts_at,
                    status="completed", result=result, event_name=row["event"],
                )
                repo.save_features(match_id, features)
                repo.save_prediction(match_id, tier, MODEL_VERSION, probs)
                break
            except httpx.ReadTimeout:
                if attempt == 2:
                    raise
                logger.warning("Read timeout on fight %s, retrying in 5s…", external_id)
                time.sleep(5)

        written += 1
        if written % 100 == 0:
            logger.info("  …%d fights written", written)

    logger.info("UFC history backfill complete: %d fights across the last %d years",
                written, args.years)
    return 0


if __name__ == "__main__":
    sys.exit(main())

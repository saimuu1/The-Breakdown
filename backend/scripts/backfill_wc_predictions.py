"""Re-predict 2026 World Cup matches with the tournament-aware model.

    python -m scripts.backfill_wc_predictions

The plain soccer model treats each match as an isolated form matchup. The World
Cup is a tournament, so this recomputes every WC 2026 match (upcoming and
completed) with `app.sports.soccer.tournament`: ELO + form + experience frozen
pre-tournament, blended by round with what's happened in the tournament so far
(70/30 in the group stage). Conservative by design — an upset nudges, it doesn't
redefine.

Pre-tournament ELO/form/experience come from the martj42 archive (frozen before
2026-06-11, no leakage); in-tournament performance uses this WC's results that
finished before each match. Predictions are updated IN PLACE so cached analysis
is preserved. No LLM.

Operational note: run this AFTER any plain soccer ingest/backfill so WC rows keep
the tournament-aware probabilities, and re-run as more group/knockout games play.
"""

import logging
import sys
from collections import defaultdict

import pandas as pd

from app.repositories.supabase_repo import SupabaseRepository
from app.sports.soccer.adapter import _resolve
from app.sports.soccer.data import load_results
from app.sports.soccer.features import build_current_forms, diff_features
from app.sports.soccer.model import predict_match
from app.sports.soccer.tournament import (
    MODEL_VERSION,
    TOURNAMENT_START,
    compute_elo,
    wc_experience,
    wc_match_prob,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-wc")


def _wc_matches_by_team(results: pd.DataFrame) -> dict[str, list[dict]]:
    """Each team's 2026 WC results, keyed by resolved name, chronological.
    Entry: {date, team, opp, gf, ga} — opp/team resolved for ELO lookups."""
    wc = results[
        (results["date"] >= pd.Timestamp(TOURNAMENT_START))
        & (results["tournament"].str.lower() == "fifa world cup")
    ].dropna(subset=["home_score", "away_score"]).sort_values("date")
    by_team: dict[str, list[dict]] = defaultdict(list)
    for r in wc.itertuples():
        h, a = _resolve(r.home_team), _resolve(r.away_team)
        d = str(r.date)[:10]
        hs, as_ = float(r.home_score), float(r.away_score)
        by_team[h].append({"date": d, "team": h, "opp": a, "gf": hs, "ga": as_})
        by_team[a].append({"date": d, "team": a, "opp": h, "gf": as_, "ga": hs})
    return by_team


def main() -> int:
    results = load_results()
    elo = {_resolve(k): v for k, v in compute_elo(results).items()}
    experience = {_resolve(k): v for k, v in wc_experience(results).items()}
    forms = {_resolve(k): v for k, v in build_current_forms(TOURNAMENT_START).items()}
    wc_by_team = _wc_matches_by_team(results)

    repo = SupabaseRepository()
    db = repo._db  # noqa: SLF001 — maintenance script
    league_id = repo.ensure_league("soccer", "soccer")
    rows = (
        db.table("matches")
        .select("id,starts_at,home:competitors!matches_home_id_fkey(name),"
                "away:competitors!matches_away_id_fkey(name)")
        .eq("league_id", league_id)
        .order("starts_at")
        .execute()
        .data
    )

    def prior(team_key: str, before: str) -> list[dict]:
        return [m for m in wc_by_team.get(team_key, []) if m["date"] < before]

    updated = 0
    for r in rows:
        home, away = r["home"]["name"], r["away"]["name"]
        hk, ak = _resolve(home), _resolve(away)
        date10 = r["starts_at"][:10]

        form_probs = predict_match(diff_features(forms.get(hk, {}), forms.get(ak, {}), 1))
        probs = wc_match_prob(
            hk, ak, elo, form_probs, experience,
            prior(hk, date10), prior(ak, date10),
        )

        db.table("predictions").update(
            {"probs": probs, "model_version": MODEL_VERSION}
        ).eq("match_id", r["id"]).execute()
        updated += 1
        fav = max(probs, key=probs.get)
        logger.info("  %s vs %s -> %s %.0f%% (D %.0f%%)",
                    home, away, fav, probs[fav] * 100, probs["draw"] * 100)

    logger.info("WC re-prediction complete: %d matches updated", updated)
    return 0


if __name__ == "__main__":
    sys.exit(main())

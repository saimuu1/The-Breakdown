"""Supabase-backed implementation of the Repository protocol.

All DB access for the ingestion/prediction pipeline lives here. Services never
touch the Supabase client directly.
"""

import math

from supabase import Client

from app.db.client import get_service_client


def _json_safe(value):
    """Replace NaN/inf with None so values are valid JSON/jsonb.

    Debut fighters have no prior history, so some feature diffs are NaN — store
    them as SQL null; the model's imputer handles them at prediction time.
    """
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


class SupabaseRepository:
    def __init__(self, client: Client | None = None) -> None:
        self._db = client or get_service_client()

    def sport_tier(self, sport: str) -> str:
        res = self._db.table("sports").select("tier").eq("id", sport).single().execute()
        return res.data["tier"]

    def ensure_league(self, sport: str, name: str) -> str:
        existing = (
            self._db.table("leagues")
            .select("id")
            .eq("sport_id", sport)
            .eq("name", name)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["id"]
        created = (
            self._db.table("leagues")
            .insert({"sport_id": sport, "name": name})
            .execute()
        )
        return created.data[0]["id"]

    def ensure_competitor(self, league_id: str, name: str) -> str:
        existing = (
            self._db.table("competitors")
            .select("id")
            .eq("league_id", league_id)
            .eq("name", name)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["id"]
        created = (
            self._db.table("competitors")
            .insert({"league_id": league_id, "name": name})
            .execute()
        )
        return created.data[0]["id"]

    def upsert_match(
        self,
        league_id: str,
        external_id: str,
        home_id: str,
        away_id: str,
        starts_at: str,
        status: str | None = None,
        result: dict | None = None,
    ) -> str:
        row = {
            "league_id": league_id,
            "external_id": external_id,
            "home_id": home_id,
            "away_id": away_id,
            "starts_at": starts_at,
        }
        # Only set status/result when backfilling completed events, so live
        # upcoming upserts don't clobber an existing result with NULL.
        if status is not None:
            row["status"] = status
        if result is not None:
            row["result"] = _json_safe(result)
        res = (
            self._db.table("matches")
            .upsert(row, on_conflict="league_id,external_id")
            .execute()
        )
        return res.data[0]["id"]

    def save_analysis(self, prediction_id: str, analysis: str, analysis_version: str) -> None:
        self._db.table("predictions").update(
            {"analysis": analysis, "analysis_version": analysis_version}
        ).eq("id", prediction_id).execute()

    def current_analysis_version(self, prediction_id: str) -> str | None:
        res = (
            self._db.table("predictions")
            .select("analysis,analysis_version")
            .eq("id", prediction_id)
            .single()
            .execute()
        )
        row = res.data
        return row["analysis_version"] if row and row.get("analysis") else None

    def save_features(self, match_id: str, data: dict) -> None:
        self._db.table("features").upsert(
            {"match_id": match_id, "data": _json_safe(data)},
            on_conflict="match_id",
        ).execute()

    def save_prediction(
        self,
        match_id: str,
        tier: str,
        model_version: str,
        probs: dict[str, float],
    ) -> str:
        res = (
            self._db.table("predictions")
            .upsert(
                {
                    "match_id": match_id,
                    "tier": tier,
                    "model_version": model_version,
                    "probs": _json_safe(probs),
                },
                on_conflict="match_id,model_version",
            )
            .execute()
        )
        return res.data[0]["id"]

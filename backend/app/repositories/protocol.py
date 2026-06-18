"""The persistence contract the services depend on.

Services depend on this Protocol, not on Supabase directly — so they can be
unit-tested with an in-memory fake, and the real DB is swappable.
"""

from typing import Protocol


class Repository(Protocol):
    def sport_tier(self, sport: str) -> str:
        """Look up the tier ('free'|'pro') for a sport — denormalized onto predictions."""
        ...

    def ensure_league(self, sport: str, name: str) -> str:
        """Get-or-create a league; return its id."""
        ...

    def ensure_competitor(self, league_id: str, name: str, logo_url: str | None = None) -> str:
        """Get-or-create a competitor within a league; return its id.

        `logo_url` (team crest / fighter headshot) is stored on create and
        backfilled if the existing row lacks one.
        """
        ...

    def upsert_match(
        self,
        league_id: str,
        external_id: str,
        home_id: str,
        away_id: str,
        starts_at: str,
        status: str | None = None,
        result: dict | None = None,
        event_name: str | None = None,
        context: dict | None = None,
    ) -> str:
        """Idempotent upsert keyed on (league_id, external_id); return match id.

        `status`/`result` are set only when backfilling completed events.
        `event_name` groups matches (e.g. a UFC card); `context` holds per-match
        display extras (player leaders). Each is only written when provided.
        """
        ...

    def save_features(self, match_id: str, data: dict) -> None:
        """Upsert the feature row for a match."""
        ...

    def save_prediction(
        self,
        match_id: str,
        tier: str,
        model_version: str,
        probs: dict[str, float],
    ) -> str:
        """Idempotent upsert keyed on (match_id, model_version); return prediction id."""
        ...

    def save_analysis(self, prediction_id: str, analysis: str, analysis_version: str) -> None:
        """Store the cached persona write-up on an existing prediction."""
        ...

    def current_analysis_version(self, prediction_id: str) -> str | None:
        """The analysis_version already stored, or None if not yet analyzed."""
        ...

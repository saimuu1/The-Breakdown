"""The UFC SportAdapter — binary outcome, a single 'league'.

Importing this module registers the adapter. fetch_fixtures pulls the live
upcoming card from ESPN and computes each fighter's current form from our own
UFCStats history; build_features just diffs the two (names matched accent-/
case-insensitively).
"""

from datetime import UTC, datetime

from app.llm.persona import top_edges
from app.sports.base import RawMatch, register
from app.sports.ufc.features import (
    build_current_forms,
    diff_features,
    normalize_name,
    recent_results,
)
from app.sports.ufc.model import predict_home_away
from app.sports.ufc.raw import build_fight_log
from app.sports.ufc.upcoming import fetch_upcoming_bouts


class UFCAdapter:
    sport = "ufc"
    outcomes = ["home", "away"]  # home = Red corner, away = Blue corner

    def __init__(self) -> None:
        self._forms: dict[str, dict] = {}  # keyed by normalized fighter name
        self._recent: dict[str, list[str]] = {}  # recent fights, keyed by normalized name

    def fetch_fixtures(self) -> list[RawMatch]:
        bouts = fetch_upcoming_bouts()
        today = datetime.now(UTC).date()
        log = build_fight_log()  # built once, shared by form + recent-results
        forms = build_current_forms(today, log)
        self._forms = {normalize_name(name): form for name, form in forms.items()}
        self._recent = recent_results(today, log)

        fixtures: list[RawMatch] = []
        for b in bouts:
            fixtures.append(
                RawMatch(
                    external_id=f"{b['date']}:{b['home']}-vs-{b['away']}",
                    home=b["home"],
                    away=b["away"],
                    starts_at=b["starts_at"],
                    raw={
                        "home": b["home"],
                        "away": b["away"],
                        "event_name": b.get("event_name"),
                        "home_logo": b.get("home_logo"),
                        "away_logo": b.get("away_logo"),
                    },
                )
            )
        return fixtures

    def build_features(self, m: RawMatch) -> dict:
        home_form = self._forms.get(normalize_name(m.home), {})
        away_form = self._forms.get(normalize_name(m.away), {})
        return diff_features(home_form, away_form)

    def predict(self, features: dict) -> dict[str, float]:
        return predict_home_away(features)

    def edges(self, features: dict, home: str, away: str) -> list[str]:
        """A few key differentials to support (not drive) the narrative analysis."""
        return top_edges(features, home, away, n=5)

    def analysis_context(self, m: RawMatch) -> list[str]:
        """Each fighter's recent results, so the write-up can name real past fights."""
        lines: list[str] = []
        for name in (m.home, m.away):
            history = self._recent.get(normalize_name(name))
            if history:
                lines.append(f"{name} recent fights: " + "; ".join(history))
        return lines


adapter = UFCAdapter()
register(adapter)

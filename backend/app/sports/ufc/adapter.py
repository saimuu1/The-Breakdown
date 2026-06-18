"""The UFC SportAdapter — binary outcome, a single 'league'.

Importing this module registers the adapter. fetch_fixtures pulls the live
upcoming card from ESPN and computes each fighter's current form from our own
UFCStats history; build_features just diffs the two (names matched accent-/
case-insensitively).
"""

from datetime import UTC, datetime

from app.llm.persona import top_edges
from app.sports.base import RawMatch, register
from app.sports.ufc.features import build_current_forms, diff_features, normalize_name
from app.sports.ufc.model import predict_home_away
from app.sports.ufc.upcoming import fetch_upcoming_bouts


class UFCAdapter:
    sport = "ufc"
    outcomes = ["home", "away"]  # home = Red corner, away = Blue corner

    def __init__(self) -> None:
        self._forms: dict[str, dict] = {}  # keyed by normalized fighter name

    def fetch_fixtures(self) -> list[RawMatch]:
        bouts = fetch_upcoming_bouts()
        forms = build_current_forms(datetime.now(UTC).date())
        self._forms = {normalize_name(name): form for name, form in forms.items()}

        fixtures: list[RawMatch] = []
        for b in bouts:
            fixtures.append(
                RawMatch(
                    external_id=f"{b['date']}:{b['home']}-vs-{b['away']}",
                    home=b["home"],
                    away=b["away"],
                    starts_at=b["starts_at"],
                    raw={"home": b["home"], "away": b["away"]},
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
        """Human-readable grounding for the persona — optional adapter capability."""
        return top_edges(features, home, away)


adapter = UFCAdapter()
register(adapter)

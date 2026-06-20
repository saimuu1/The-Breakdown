"""The NBA SportAdapter — binary outcome (home/away), pro tier.

Importing this module self-registers the adapter. Fixtures come from ESPN's
free NBA scoreboard; features are self-computed from cached ESPN game results
(rolling team form, point-in-time). Third sport, same pipeline — UFC is
fighter-based binary, soccer is team-based three-way, NBA is team-based binary
with a strong home-court term. No core, schema, or service changes.
"""

import unicodedata
from datetime import UTC, datetime

from app.llm.persona import SYSTEM_PROMPT
from app.sports.base import RawMatch, register
from app.sports.nba.features import build_current_forms, diff_features
from app.sports.nba.model import predict_home_away
from app.sports.nba.upcoming import fetch_upcoming_games

_NBA_EDGE_META: dict[str, tuple[str, int, float]] = {
    "win_rate_dif": ("recent win rate", 1, 0.3),
    "point_diff_pg_dif": ("point differential per game", 1, 6.0),
    "points_pg_dif": ("points scored per game", 1, 6.0),
    "allowed_pg_dif": ("points allowed per game", -1, 6.0),
    "n_games_dif": ("recent games played", 1, 10.0),
    "is_home": ("home-court advantage", 1, 1.0),
}


def _normalize(name: str) -> str:
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


def _top_nba_edges(features: dict, home: str, away: str, n: int = 3) -> list[str]:
    scored = []
    for col, (label, polarity, scale) in _NBA_EDGE_META.items():
        value = features.get(col)
        if value is None or value != value or value == 0:
            continue
        if col == "is_home":
            scored.append((abs(value) / scale, f"{label}: favors {home}"))
            continue
        favored = home if value * polarity > 0 else away
        scored.append((abs(value) / scale, f"{label}: favors {favored} by {abs(value):.1f}"))
    scored.sort(reverse=True)
    return [text for _, text in scored[:n]]


class NBAAdapter:
    sport = "nba"
    outcomes = ["home", "away"]
    system_prompt = SYSTEM_PROMPT

    def __init__(self) -> None:
        self._forms: dict[str, dict] = {}

    def fetch_fixtures(self) -> list[RawMatch]:
        games = fetch_upcoming_games()
        forms = build_current_forms(datetime.now(UTC).date())
        self._forms = {_normalize(name): form for name, form in forms.items()}

        fixtures: list[RawMatch] = []
        for g in games:
            fixtures.append(
                RawMatch(
                    external_id=f"{g['date']}:{_normalize(g['home'])}-vs-{_normalize(g['away'])}",
                    home=g["home"],
                    away=g["away"],
                    starts_at=g["starts_at"],
                    raw={
                        "is_home": 1,
                        "home_logo": g.get("home_logo"),
                        "away_logo": g.get("away_logo"),
                        "leaders": g.get("leaders"),
                    },
                )
            )
        return fixtures

    def build_features(self, m: RawMatch) -> dict:
        home_form = self._forms.get(_normalize(m.home), {})
        away_form = self._forms.get(_normalize(m.away), {})
        return diff_features(home_form, away_form, is_home=1)

    def predict(self, features: dict) -> dict[str, float]:
        return predict_home_away(features)

    def edges(self, features: dict, home: str, away: str) -> list[str]:
        return _top_nba_edges(features, home, away, n=6)


adapter = NBAAdapter()
register(adapter)

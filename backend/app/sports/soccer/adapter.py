"""The Soccer SportAdapter — three-way outcome (home/draw/away), free tier.

Importing this module self-registers the adapter. Fixtures come from ESPN's
free World Cup 2026 scoreboard (no key). Features are self-computed from the
martj42 international football results archive (~45k matches, 1872–present).

This is the proof the adapter pattern generalises: the pipeline, schema, and
analysis service are UNCHANGED — a second sport with completely different rules
(three-way outcome, neutral venue flag, different persona prompt) dropped in
by adding one new module and one register() call.
"""

import unicodedata
from datetime import UTC, datetime

from app.sports.base import RawMatch, register
from app.sports.soccer.features import build_current_forms, diff_features
from app.sports.soccer.model import predict_match
from app.sports.soccer.upcoming import fetch_upcoming_matches

SOCCER_SYSTEM_PROMPT = """\
You are "The Breakdown," a razor-sharp football analyst calling the match LIVE
-- tactical IQ, heat-of-broadcast energy, the clear-headed read of a top color
commentator mid-game. You're watching this fixture unfold and breaking down
exactly who wins and WHY.

Voice: live, tactical, plain-spoken -- talk recent form, goal threat, defensive
solidity, neutral-venue dynamics, and momentum like someone who knows the
beautiful game cold.

Hard rules:
- Use ONLY the stats provided below. NEVER invent league tables, squad depth,
  injuries, manager quotes, or events that aren't in the data.
- Open by setting the stage (context, form).
- Lead with the single biggest edge, then walk through the key advantages one by
  one -- for EACH, explain how it translates to winning this specific match.
- Call your pick clearly -- home win, draw, or away win -- and say how confident
  the model is and why.
- 180-240 words. Cover the reasoning thoroughly -- this is the analysis,
  not a teaser."""

_SOCCER_EDGE_META: dict[str, tuple[str, int, float]] = {
    "win_rate_dif": ("recent win rate", 1, 0.3),
    "draw_rate_dif": ("recent draw rate", 1, 0.2),
    "goals_pg_dif": ("goals scored per game", 1, 1.0),
    "conceded_pg_dif": ("goals conceded per game", -1, 1.0),
    "goal_diff_pg_dif": ("goal difference per game", 1, 1.5),
    "n_games_dif": ("recent games played", 1, 10.0),
}


def _normalize(name: str) -> str:
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


# ESPN team names → martj42 dataset names (both normalized).
_ALIASES: dict[str, str] = {
    "united states": "usa",
    "us": "usa",
    "republic of ireland": "ireland",
    "korea republic": "south korea",
    "ir iran": "iran",
    "china pr": "china",
    "chinese taipei": "taiwan",
    "cape verde islands": "cape verde",
    "trinidad & tobago": "trinidad and tobago",
    "antigua & barbuda": "antigua and barbuda",
    "st. kitts & nevis": "saint kitts and nevis",
    "st. vincent & the grenadines": "saint vincent and the grenadines",
}


def _resolve(name: str) -> str:
    key = _normalize(name)
    return _ALIASES.get(key, key)


def _top_soccer_edges(features: dict, home: str, away: str, n: int = 3) -> list[str]:
    scored = []
    for col, (label, polarity, scale) in _SOCCER_EDGE_META.items():
        value = features.get(col)
        if value is None or value != value or value == 0:
            continue
        favored = home if value * polarity > 0 else away
        scored.append((abs(value) / scale, f"{label}: favors {favored} by {abs(value):.2f}"))
    scored.sort(reverse=True)
    return [text for _, text in scored[:n]]


class SoccerAdapter:
    sport = "soccer"
    outcomes = ["home", "draw", "away"]
    system_prompt = SOCCER_SYSTEM_PROMPT

    def __init__(self) -> None:
        self._forms: dict[str, dict] = {}

    def fetch_fixtures(self) -> list[RawMatch]:
        matches = fetch_upcoming_matches()
        forms = build_current_forms(datetime.now(UTC).date())
        # Remap form dict to resolved keys so ESPN names hit correctly.
        self._forms = {_resolve(name): form for name, form in forms.items()}

        fixtures: list[RawMatch] = []
        for m in matches:
            fixtures.append(
                RawMatch(
                    external_id=(
                        f"wc2026:{m['date']}:"
                        f"{_normalize(m['home'])}-vs-{_normalize(m['away'])}"
                    ),
                    home=m["home"],
                    away=m["away"],
                    starts_at=m["starts_at"],
                    raw={"is_neutral": m.get("is_neutral", 1)},
                )
            )
        return fixtures

    def build_features(self, m: RawMatch) -> dict:
        home_form = self._forms.get(_resolve(m.home), {})
        away_form = self._forms.get(_resolve(m.away), {})
        is_neutral = m.raw.get("is_neutral", 1)
        return diff_features(home_form, away_form, is_neutral)

    def predict(self, features: dict) -> dict[str, float]:
        return predict_match(features)

    def edges(self, features: dict, home: str, away: str) -> list[str]:
        return _top_soccer_edges(features, home, away)


adapter = SoccerAdapter()
register(adapter)

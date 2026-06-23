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

from app.llm.persona import SYSTEM_PROMPT
from app.sports.base import RawMatch, register
from app.sports.soccer.features import build_current_forms, diff_features
from app.sports.soccer.model import predict_match
from app.sports.soccer.tournament import MODEL_VERSION as WC_MODEL_VERSION
from app.sports.soccer.upcoming import fetch_upcoming_matches

# The narrative persona is shared across sports (see app/llm/persona.py); the
# soccer-specific grounding (form, leaders, neutral venue) flows in via the user
# prompt, so soccer uses the same system prompt.

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
    system_prompt = SYSTEM_PROMPT
    # Pin the prediction row label to the tournament model so ingest UPDATEs the
    # existing WC rows in place instead of inserting a parallel 'soccer-v1' row.
    # backfill_wc_predictions then overwrites the probs with tournament-aware ones.
    model_version = WC_MODEL_VERSION

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
                    raw={
                        "is_neutral": m.get("is_neutral", 1),
                        "home_logo": m.get("home_logo"),
                        "away_logo": m.get("away_logo"),
                    },
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
        return _top_soccer_edges(features, home, away, n=6)


adapter = SoccerAdapter()
register(adapter)

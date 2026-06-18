"""The NBA SportAdapter — binary outcome (home/away), pro tier.

Importing this module self-registers the adapter. Fixtures come from ESPN's
free NBA scoreboard; features are self-computed from cached ESPN game results
(rolling team form, point-in-time). Third sport, same pipeline — UFC is
fighter-based binary, soccer is team-based three-way, NBA is team-based binary
with a strong home-court term. No core, schema, or service changes.
"""

import unicodedata
from datetime import UTC, datetime

from app.sports.base import RawMatch, register
from app.sports.nba.features import build_current_forms, diff_features
from app.sports.nba.model import predict_home_away
from app.sports.nba.upcoming import fetch_upcoming_games

NBA_SYSTEM_PROMPT = """\
You are "The Breakdown," a sharp courtside NBA analyst calling the game LIVE --
the energy, basketball-IQ, and read of a top broadcast color commentator. You're
watching this matchup and breaking down exactly who wins and WHY.

Voice: live, hyped, plain-spoken, genuinely technical -- talk recent form,
scoring, defense, point differential, home-court, and momentum like someone who
knows the league cold. When key players/leaders are given, NAME them and what
they do; quote the actual numbers from the data -- be concrete, not generic.

Structure your breakdown into four short labeled sections, each on its own line,
using EXACTLY these headers:
STAGE: one or two sentences setting up the matchup and what's at stake.
THE EDGE: the single biggest statistical advantage and the team it favors -- cite
  the specific number and explain how it wins the game.
KEY FACTORS: walk through 3-4 more advantages one by one; for EACH cite the real
  stat (and name a key player when provided) and explain how it translates to a win.
THE PICK: call the winner clearly -- home or away -- state the model's confidence
  %, and the one number that makes you most sure.

Hard rules:
- Use ONLY the stats provided below. NEVER invent records, standings, injuries,
  trades, quotes, or events not in the data.
- Be SPECIFIC: reference the actual numbers and named players given.
- ~280-360 words total. This is the full analysis, not a teaser."""

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
    system_prompt = NBA_SYSTEM_PROMPT

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

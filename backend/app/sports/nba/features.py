"""Self-computed, point-in-time NBA features.

Each team's recent form (rolling window of its last games) is computed using
ONLY games before the date in question — no leakage — then taken as
home-minus-away differentials. NBA has no draws, so the outcome is binary
(home win / away win). A home-court flag is included as a direct feature since
home advantage is real and large in the NBA.
"""

import math
import unicodedata
from collections import deque
from collections.abc import Mapping

import numpy as np
import pandas as pd

from app.sports.nba.data import load_games

# Per-team rolling form (last N games).
PER_TEAM_STATS: list[str] = [
    "win_rate",
    "points_pg",
    "allowed_pg",
    "point_diff_pg",
    "n_games",
]
# Differentials + the home-court flag (always 1 for our home team, but kept
# explicit so the schema/feature vector documents the assumption).
FEATURE_COLUMNS: list[str] = [f"{s}_dif" for s in PER_TEAM_STATS] + ["is_home"]

_WINDOW = 20  # rolling form window (~25% of a season)
_MIN_GAMES = 5  # cold-start filter


def normalize_name(name: str) -> str:
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


def _form_from_deque(q: deque) -> dict:
    n = len(q)
    form: dict[str, float] = {s: math.nan for s in PER_TEAM_STATS}
    form["n_games"] = float(n)
    if n == 0:
        return form
    wins = sum(g["won"] for g in q)
    pts = sum(g["pts"] for g in q)
    allowed = sum(g["allowed"] for g in q)
    form["win_rate"] = wins / n
    form["points_pg"] = pts / n
    form["allowed_pg"] = allowed / n
    form["point_diff_pg"] = (pts - allowed) / n
    return form


def diff_features(
    home_form: Mapping[str, float],
    away_form: Mapping[str, float],
    is_home: int = 1,
) -> dict[str, float]:
    diffs = {
        f"{s}_dif": home_form.get(s, math.nan) - away_form.get(s, math.nan)
        for s in PER_TEAM_STATS
    }
    diffs["is_home"] = float(is_home)
    return diffs


def build_training_frame() -> tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    """Return (X features, y home-win, meta[date,home,away]) for games with history.

    Form is computed BEFORE each game is folded into the accumulators (no leakage).
    """
    df = load_games().dropna(subset=["home_score", "away_score"])
    df = df.sort_values("date").reset_index(drop=True)

    team_q: dict[str, deque] = {}
    rows, ys, meta = [], [], []

    for _, row in df.iterrows():
        home, away = row["home_team"], row["away_team"]
        hs, as_ = float(row["home_score"]), float(row["away_score"])

        home_q = team_q.setdefault(home, deque(maxlen=_WINDOW))
        away_q = team_q.setdefault(away, deque(maxlen=_WINDOW))

        home_form = _form_from_deque(home_q)
        away_form = _form_from_deque(away_q)

        if home_form["n_games"] >= _MIN_GAMES and away_form["n_games"] >= _MIN_GAMES:
            rows.append(diff_features(home_form, away_form, is_home=1))
            ys.append(int(hs > as_))
            meta.append({"date": row["date"], "home": home, "away": away})

        # Update AFTER computing form.
        home_q.append({"pts": hs, "allowed": as_, "won": int(hs > as_)})
        away_q.append({"pts": as_, "allowed": hs, "won": int(as_ > hs)})

    return pd.DataFrame(rows), np.array(ys), pd.DataFrame(meta)


def build_current_forms(as_of) -> dict[str, dict]:
    """Each team's current rolling form using all games before `as_of`."""
    df = load_games().dropna(subset=["home_score", "away_score"])
    as_of = pd.Timestamp(as_of)
    df = df[df["date"] < as_of].sort_values("date")

    team_q: dict[str, deque] = {}
    for _, row in df.iterrows():
        home, away = row["home_team"], row["away_team"]
        hs, as_ = float(row["home_score"]), float(row["away_score"])
        team_q.setdefault(home, deque(maxlen=_WINDOW)).append(
            {"pts": hs, "allowed": as_, "won": int(hs > as_)}
        )
        team_q.setdefault(away, deque(maxlen=_WINDOW)).append(
            {"pts": as_, "allowed": hs, "won": int(as_ > hs)}
        )

    return {team: _form_from_deque(q) for team, q in team_q.items()}

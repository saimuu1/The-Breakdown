"""Self-computed, point-in-time soccer features.

For every match we compute each team's recent form using ONLY results that
happened before that date (no leakage), then take home-minus-away differentials.
A rolling window of 30 games keeps the form current without over-weighting
ancient fixtures.
"""

import math
import unicodedata
from collections import deque
from collections.abc import Mapping

import numpy as np
import pandas as pd

from app.sports.soccer.data import load_results

# Per-team rolling form stats (last 30 games).
PER_TEAM_STATS: list[str] = [
    "win_rate",
    "draw_rate",
    "goals_pg",
    "conceded_pg",
    "goal_diff_pg",
    "n_games",
]
# Differentials + one direct feature (venue neutrality).
FEATURE_COLUMNS: list[str] = [f"{s}_dif" for s in PER_TEAM_STATS] + ["is_neutral"]

_WINDOW = 30  # rolling form window


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
    draws = sum(g["drawn"] for g in q)
    goals = sum(g["goals"] for g in q)
    conceded = sum(g["conceded"] for g in q)
    form["win_rate"] = wins / n
    form["draw_rate"] = draws / n
    form["goals_pg"] = goals / n
    form["conceded_pg"] = conceded / n
    form["goal_diff_pg"] = (goals - conceded) / n
    return form


def diff_features(
    home_form: Mapping[str, float],
    away_form: Mapping[str, float],
    is_neutral: int = 0,
) -> dict[str, float]:
    diffs = {
        f"{s}_dif": home_form.get(s, math.nan) - away_form.get(s, math.nan)
        for s in PER_TEAM_STATS
    }
    diffs["is_neutral"] = float(is_neutral)
    return diffs


def build_training_frame() -> tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    """Return (X features, y outcome, meta) for all matches with enough history.

    Outcome encoding: 0 = away win, 1 = draw, 2 = home win.
    Features are computed BEFORE each match is added to the accumulator (no leakage).
    """
    df = load_results()
    df = df.dropna(subset=["home_score", "away_score"]).sort_values("date").reset_index(drop=True)

    team_q: dict[str, deque] = {}
    rows, ys, meta = [], [], []

    for _, row in df.iterrows():
        home, away = row["home_team"], row["away_team"]
        hs, as_ = float(row["home_score"]), float(row["away_score"])

        home_q = team_q.setdefault(home, deque(maxlen=_WINDOW))
        away_q = team_q.setdefault(away, deque(maxlen=_WINDOW))

        home_form = _form_from_deque(home_q)
        away_form = _form_from_deque(away_q)

        # Require minimum history on both sides to avoid cold-start noise.
        if home_form["n_games"] >= 5 and away_form["n_games"] >= 5:
            is_neutral = int(bool(row.get("neutral", False)))
            feats = diff_features(home_form, away_form, is_neutral)

            y = 2 if hs > as_ else (1 if hs == as_ else 0)
            rows.append(feats)
            ys.append(y)
            meta.append({"date": row["date"], "home": home, "away": away})

        # Update AFTER computing form (no leakage).
        home_won = hs > as_
        draw = hs == as_
        home_q.append({"goals": hs, "conceded": as_, "won": int(home_won), "drawn": int(draw)})
        away_q.append({"goals": as_, "conceded": hs, "won": int(as_ > hs), "drawn": int(draw)})

    return pd.DataFrame(rows), np.array(ys), pd.DataFrame(meta)


def build_current_forms(as_of) -> dict[str, dict]:
    """Each team's current rolling form using all results before `as_of`."""
    df = load_results()
    as_of = pd.Timestamp(as_of)
    df = (
        df[df["date"] < as_of]
        .dropna(subset=["home_score", "away_score"])
        .sort_values("date")
    )

    team_q: dict[str, deque] = {}
    for _, row in df.iterrows():
        home, away = row["home_team"], row["away_team"]
        hs, as_ = float(row["home_score"]), float(row["away_score"])
        home_won = hs > as_
        draw = hs == as_

        home_q = team_q.setdefault(home, deque(maxlen=_WINDOW))
        away_q = team_q.setdefault(away, deque(maxlen=_WINDOW))
        home_q.append({"goals": hs, "conceded": as_, "won": int(home_won), "drawn": int(draw)})
        away_q.append({"goals": as_, "conceded": hs, "won": int(as_ > hs), "drawn": int(draw)})

    return {team: _form_from_deque(q) for team, q in team_q.items()}

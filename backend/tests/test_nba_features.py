"""Tests for NBA feature engineering — point-in-time, no leakage, right shape."""

import math
from collections import deque

import pandas as pd

from app.sports.nba.features import (
    FEATURE_COLUMNS,
    PER_TEAM_STATS,
    _form_from_deque,
    build_training_frame,
    diff_features,
    normalize_name,
)


def test_feature_columns_are_diffs_plus_is_home():
    assert "is_home" in FEATURE_COLUMNS
    assert all(c.endswith("_dif") or c == "is_home" for c in FEATURE_COLUMNS)
    assert len(FEATURE_COLUMNS) == len(PER_TEAM_STATS) + 1


def test_empty_team_has_nan_form():
    form = _form_from_deque(deque())
    assert form["n_games"] == 0.0
    assert all(math.isnan(form[s]) for s in PER_TEAM_STATS if s != "n_games")


def test_diff_features_propagate_nan_for_cold_start():
    diffs = diff_features({}, {}, is_home=1)
    for stat in PER_TEAM_STATS:
        assert math.isnan(diffs[f"{stat}_dif"])
    assert diffs["is_home"] == 1.0


def test_no_odds_or_market_columns():
    assert not any("odds" in c or "ev" in c for c in FEATURE_COLUMNS)


def test_normalize_name_is_accent_case_insensitive():
    assert normalize_name("  San Antonio Spurs ") == "san antonio spurs"


def test_point_diff_form_is_correct():
    q = deque([
        {"pts": 110.0, "allowed": 100.0, "won": 1},
        {"pts": 90.0, "allowed": 95.0, "won": 0},
    ])
    form = _form_from_deque(q)
    assert form["n_games"] == 2.0
    assert form["win_rate"] == 0.5
    assert form["points_pg"] == 100.0
    assert form["allowed_pg"] == 97.5
    assert form["point_diff_pg"] == 2.5


def test_training_frame_is_point_in_time_no_leakage(monkeypatch):
    """Build enough history that the final game qualifies; verify no leakage."""
    # Two teams each rack up >=5 games vs filler opponents, then meet.
    rows = []
    for i in range(6):
        rows.append({"date": pd.Timestamp(f"2026-01-0{i + 1}"), "home_team": "Aces",
                     "away_team": f"Filler{i}", "home_score": 120.0, "away_score": 100.0})
        rows.append({"date": pd.Timestamp(f"2026-02-0{i + 1}"), "home_team": "Bolts",
                     "away_team": f"Filler{i}", "home_score": 95.0, "away_score": 110.0})
    rows.append({"date": pd.Timestamp("2026-03-01"), "home_team": "Aces",
                 "away_team": "Bolts", "home_score": 115.0, "away_score": 99.0})
    df = pd.DataFrame(rows)
    monkeypatch.setattr("app.sports.nba.features.load_games", lambda: df)

    X, y, meta = build_training_frame()
    final_idx = meta.index[meta["home"] == "Aces"][-1]
    assert meta.loc[final_idx, "home"] == "Aces"
    assert meta.loc[final_idx, "away"] == "Bolts"
    # Aces won (115 > 99) → home win → y == 1.
    assert y[final_idx] == 1
    # Aces have been dominant at home; their win_rate edge should be positive.
    assert X.loc[final_idx, "win_rate_dif"] > 0
    assert X.loc[final_idx, "is_home"] == 1.0

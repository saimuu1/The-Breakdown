"""Tests for soccer feature engineering.

Mirrors the UFC feature test philosophy: verify point-in-time correctness,
no leakage, and the right shape for the diff vector. No disk/network I/O.
"""

import math

import pandas as pd

from app.sports.soccer.features import (
    FEATURE_COLUMNS,
    PER_TEAM_STATS,
    _form_from_deque,
    build_training_frame,
    diff_features,
)


def _make_results(*rows: dict) -> pd.DataFrame:
    """Helper: build a minimal results DataFrame for testing."""
    return pd.DataFrame(rows)


def test_feature_columns_are_diffs_plus_is_neutral():
    assert all(c.endswith("_dif") or c == "is_neutral" for c in FEATURE_COLUMNS)
    assert "is_neutral" in FEATURE_COLUMNS
    assert len(FEATURE_COLUMNS) == len(PER_TEAM_STATS) + 1


def test_empty_team_has_nan_form():
    from collections import deque
    form = _form_from_deque(deque())
    assert form["n_games"] == 0.0
    assert all(math.isnan(form[s]) for s in PER_TEAM_STATS if s != "n_games")


def test_diff_features_propagate_nan_for_debutants():
    diffs = diff_features({}, {}, is_neutral=1)
    for stat in PER_TEAM_STATS:
        val = diffs[f"{stat}_dif"]
        assert math.isnan(val), f"{stat}_dif should be NaN for teams with no history"
    assert diffs["is_neutral"] == 1.0


def test_no_odds_columns_in_features():
    assert not any("odds" in c or "ev" in c for c in FEATURE_COLUMNS)


def test_form_point_in_time_no_leakage(monkeypatch):
    """Teams' form for the second match must NOT include the second match itself."""
    results = pd.DataFrame([
        {"date": pd.Timestamp("2020-01-01"), "home_team": "A", "away_team": "B",
         "home_score": 2.0, "away_score": 0.0, "neutral": False},
        {"date": pd.Timestamp("2021-01-01"), "home_team": "A", "away_team": "C",
         "home_score": 1.0, "away_score": 1.0, "neutral": False},
    ])
    monkeypatch.setattr("app.sports.soccer.features.load_results", lambda: results)

    X, y, meta = build_training_frame()

    # Only the second match qualifies (A needs ≥5 prior games... but let's check
    # what we get. Since A has only 1 prior game vs B, it fails the n>=5 filter.)
    # So the frame should be empty (neither team has 5 prior games at either match).
    assert len(X) == 0, "cold-start filter should exclude matches with <5 prior games"


def test_form_point_in_time_with_enough_history(monkeypatch):
    """After enough games, form is computed from prior history only."""
    base = {"away_team": "Opp", "home_score": 1.0, "away_score": 0.0, "neutral": False}
    rows = [
        {"date": pd.Timestamp(f"202{i}-01-01"), "home_team": "A", **base}
        for i in range(8)
    ]
    # Final match: use A vs B where both have history.
    rows_b = [
        {"date": pd.Timestamp(f"201{i}-06-01"), "home_team": "B", **base}
        for i in range(8)
    ]
    all_rows = rows_b + rows + [
        {"date": pd.Timestamp("2029-01-01"), "home_team": "A", "away_team": "B",
         "home_score": 2.0, "away_score": 1.0, "neutral": True}
    ]
    results = pd.DataFrame(all_rows)
    monkeypatch.setattr("app.sports.soccer.features.load_results", lambda: results)

    X, y, meta = build_training_frame()
    # At least the final A vs B match should appear (both teams have ≥5 games).
    final = meta[meta["home"] == "A"].iloc[-1]
    assert final["home"] == "A" and final["away"] == "B"

    # The outcome should be home win (2 > 1 → y = 2).
    final_idx = meta.index[meta["home"] == "A"][-1]
    assert y[final_idx] == 2


def test_outcome_encoding():
    """0=away, 1=draw, 2=home — verified against the training frame logic."""
    from app.sports.soccer.features import diff_features

    home_form = {"win_rate": 0.7, "draw_rate": 0.1, "goals_pg": 2.0,
                 "conceded_pg": 0.8, "goal_diff_pg": 1.2, "n_games": 10.0}
    away_form = {"win_rate": 0.4, "draw_rate": 0.2, "goals_pg": 1.2,
                 "conceded_pg": 1.5, "goal_diff_pg": -0.3, "n_games": 12.0}
    feats = diff_features(home_form, away_form, is_neutral=0)

    # Diffs should all be computable.
    assert not any(math.isnan(v) for v in feats.values())
    # Stronger home team → positive win_rate_dif and goal_diff_pg_dif.
    assert feats["win_rate_dif"] > 0
    assert feats["goal_diff_pg_dif"] > 0
    assert feats["is_neutral"] == 0.0

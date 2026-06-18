import math

from app.sports.ufc.features import (
    FEATURE_COLUMNS,
    PER_FIGHTER_STATS,
    diff_features,
)


def test_feature_columns_are_diffs_of_per_fighter_stats():
    assert FEATURE_COLUMNS == [f"{s}_dif" for s in PER_FIGHTER_STATS]


def test_diff_features_subtracts_home_minus_away():
    home = dict.fromkeys(PER_FIGHTER_STATS, 2.0)
    away = dict.fromkeys(PER_FIGHTER_STATS, 0.5)
    diffs = diff_features(home, away)
    assert set(diffs) == set(FEATURE_COLUMNS)
    assert all(abs(v - 1.5) < 1e-9 for v in diffs.values())


def test_missing_form_values_propagate_as_nan():
    diffs = diff_features({}, {})  # debut fighters: no prior stats
    assert all(math.isnan(v) for v in diffs.values())


def test_no_odds_or_market_columns_leak_into_features():
    # Self-computed skill/physical diffs only — the market is the benchmark.
    assert not any("odds" in c or "ev" in c for c in FEATURE_COLUMNS)


def _toy_log():
    import pandas as pd

    common = dict(
        sig_landed=10.0, sig_att=20.0, td_landed=1.0, td_att=2.0, sub_att=0.0,
        kd=0.0, ctrl_sec=60.0, fight_sec=300.0,
        opp_sig_landed=5.0, opp_sig_att=15.0, opp_td_landed=0.0, opp_td_att=1.0,
    )
    return pd.DataFrame(
        [
            {"date": pd.Timestamp("2020-01-01"), "event": "E1", "bout": "A vs. B",
             "fighter": "A", "opponent": "B", "won": 1, "method": "KO/TKO", **common},
            {"date": pd.Timestamp("2021-01-01"), "event": "E2", "bout": "A vs. C",
             "fighter": "A", "opponent": "C", "won": 0, "method": "Decision", **common},
        ]
    )


def test_form_is_point_in_time_no_leakage():
    from app.sports.ufc.features import compute_form_log

    form = compute_form_log(_toy_log())
    by_event = {r["event"]: r for _, r in form.iterrows()}

    # Debut fight: zero prior fights, win_rate undefined.
    assert by_event["E1"]["n_fights"] == 0
    assert math.isnan(by_event["E1"]["win_rate"])

    # Second fight: exactly one prior fight (the win), so win_rate == 1.0 —
    # it must NOT see the second fight's loss (that would be leakage).
    assert by_event["E2"]["n_fights"] == 1
    assert by_event["E2"]["win_rate"] == 1.0

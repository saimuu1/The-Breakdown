import math

from app.ml.evaluate import (
    american_to_prob,
    calibration_curve,
    devig_two_way,
    score,
)


def test_american_to_prob_even_money():
    assert american_to_prob(100) == 0.5


def test_american_to_prob_favorite_and_underdog():
    assert math.isclose(american_to_prob(-200), 200 / 300)
    assert math.isclose(american_to_prob(200), 100 / 300)


def test_devig_removes_margin_and_sums_to_one():
    ph, pa = devig_two_way(-200, 150)
    assert math.isclose(ph + pa, 1.0)
    assert ph > pa  # the favorite (negative odds) gets the higher prob


def test_devig_symmetric_odds():
    ph, pa = devig_two_way(100, 100)
    assert math.isclose(ph, 0.5) and math.isclose(pa, 0.5)


def test_score_rewards_correct_confident_predictions():
    perfect = score([1, 0, 1, 0], [0.99, 0.01, 0.99, 0.01])
    hedged = score([1, 0, 1, 0], [0.5, 0.5, 0.5, 0.5])
    assert perfect.brier < hedged.brier
    assert perfect.log_loss < hedged.log_loss
    assert perfect.n == 4


def test_calibration_curve_reports_observed_frequency():
    # All preds in the 0.0-0.1 bin; half are positive -> frac_pos ~ 0.5.
    bins = calibration_curve([1, 0, 1, 0], [0.05, 0.05, 0.05, 0.05], n_bins=10)
    assert len(bins) == 1
    assert math.isclose(bins[0].frac_pos, 0.5)
    assert bins[0].count == 4

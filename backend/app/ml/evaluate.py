"""Honest evaluation: score the model the same way we score the market.

The point of the project is NOT to beat the closing line — it's to measure
exactly how close we get, and to show calibration honestly. Every function here
is pure and unit-tested so the numbers on the /accuracy page are trustworthy.
"""

from dataclasses import asdict, dataclass

import numpy as np
from sklearn.metrics import brier_score_loss, log_loss


def american_to_prob(odds: float) -> float:
    """American moneyline -> implied probability (still includes the vig)."""
    if odds > 0:
        return 100.0 / (odds + 100.0)
    return -odds / (-odds + 100.0)


def devig_two_way(home_odds: float, away_odds: float) -> tuple[float, float]:
    """Remove the bookmaker margin; return (p_home, p_away) summing to 1."""
    ph = american_to_prob(home_odds)
    pa = american_to_prob(away_odds)
    total = ph + pa
    return ph / total, pa / total


@dataclass
class CalibrationBin:
    p_mean: float  # mean predicted probability in the bin
    frac_pos: float  # observed fraction of positives
    count: int


def calibration_curve(y_true, p_pred, n_bins: int = 10) -> list[CalibrationBin]:
    """Reliability curve: predicted prob vs observed frequency, per bin."""
    y_true = np.asarray(y_true, dtype=float)
    p_pred = np.asarray(p_pred, dtype=float)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    bins: list[CalibrationBin] = []
    for lo, hi in zip(edges[:-1], edges[1:], strict=True):
        # Last bin is inclusive on the right so p == 1.0 is counted.
        mask = (p_pred >= lo) & (p_pred < hi) if hi < 1.0 else (p_pred >= lo) & (p_pred <= hi)
        if not mask.any():
            continue
        bins.append(
            CalibrationBin(
                p_mean=float(p_pred[mask].mean()),
                frac_pos=float(y_true[mask].mean()),
                count=int(mask.sum()),
            )
        )
    return bins


@dataclass
class Scorecard:
    brier: float
    log_loss: float
    n: int

    def as_dict(self) -> dict:
        return asdict(self)


def score(y_true, p_home) -> Scorecard:
    """Brier + log loss for the home-win probability."""
    y_true = np.asarray(y_true, dtype=float)
    p_home = np.clip(np.asarray(p_home, dtype=float), 1e-6, 1 - 1e-6)
    return Scorecard(
        brier=float(brier_score_loss(y_true, p_home)),
        log_loss=float(log_loss(y_true, p_home, labels=[0, 1])),
        n=int(len(y_true)),
    )

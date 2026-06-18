"""Inference wrapper around the trained UFC artifact."""

from functools import lru_cache
from typing import Any

import pandas as pd

from app.ml.registry import load_model
from app.sports.ufc.features import FEATURE_COLUMNS


@lru_cache
def _model() -> Any:
    return load_model("ufc", "v1")


def predict_home_away(features: dict[str, float]) -> dict[str, float]:
    """Map a feature dict to {'home': p, 'away': 1-p} for the Red corner winning."""
    X = pd.DataFrame([[features.get(c) for c in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
    p_home = float(_model().predict_proba(X)[0, 1])
    return {"home": round(p_home, 4), "away": round(1.0 - p_home, 4)}

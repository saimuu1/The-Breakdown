"""Load the trained NBA model and run binary predictions.

The pipeline (imputer → scaler → logistic) is trained by scripts/train_nba.py
and versioned in models/nba-v1.joblib. Outcome is binary: home win / away win.
"""

from functools import lru_cache

import numpy as np
from sklearn.pipeline import Pipeline

from app.ml.registry import load_model
from app.sports.nba.features import FEATURE_COLUMNS

MODEL_VERSION = "v1"


@lru_cache(maxsize=1)
def _load_pipeline() -> Pipeline:
    return load_model("nba", MODEL_VERSION)


def predict_home_away(features: dict) -> dict[str, float]:
    """Return {home: p, away: p} for a single feature dict."""
    pipe = _load_pipeline()
    X = np.array([[features.get(c, float("nan")) for c in FEATURE_COLUMNS]])
    p_home = float(pipe.predict_proba(X)[0][1])  # class 1 = home win
    return {"home": p_home, "away": 1.0 - p_home}

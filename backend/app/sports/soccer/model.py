"""Load the trained soccer model and run 3-way predictions.

The pipeline (imputer → scaler → multinomial logistic) is trained by
scripts/train_soccer.py and versioned in models/soccer-v1.joblib.

Classes: 0 = away win, 1 = draw, 2 = home win (sorted by sklearn).
"""

from functools import lru_cache

import numpy as np
from sklearn.pipeline import Pipeline

from app.ml.registry import load_model
from app.sports.soccer.features import FEATURE_COLUMNS

MODEL_VERSION = "v1"


@lru_cache(maxsize=1)
def _load_pipeline() -> Pipeline:
    return load_model("soccer", MODEL_VERSION)


def predict_match(features: dict) -> dict[str, float]:
    """Return {home: p, draw: p, away: p} for a single feature dict."""
    pipe = _load_pipeline()
    X = np.array([[features.get(c, float("nan")) for c in FEATURE_COLUMNS]])
    probs = pipe.predict_proba(X)[0]
    # Classes are sorted [0, 1, 2] = [away_win, draw, home_win].
    return {
        "away": float(probs[0]),
        "draw": float(probs[1]),
        "home": float(probs[2]),
    }

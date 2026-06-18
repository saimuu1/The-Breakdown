"""Train the soccer multinomial logistic regression.

    python -m scripts.train_soccer

Downloads the martj42 international results CSV on first run, builds point-in-time
features (no leakage), time-splits 80/20, trains, evaluates, and saves:
    models/soccer-v1.joblib
    models/soccer-v1.json
"""

import sys

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.registry import save_model
from app.sports.soccer.features import FEATURE_COLUMNS, build_training_frame


def _multiclass_brier(y_true: np.ndarray, probs: np.ndarray) -> float:
    """Average one-vs-rest Brier score across the three outcome classes."""
    scores = []
    for i in range(probs.shape[1]):
        binary = (y_true == i).astype(float)
        scores.append(float(np.mean((probs[:, i] - binary) ** 2)))
    return float(np.mean(scores))


def main() -> int:
    print("Building features from international results history…")
    X, y, meta = build_training_frame()
    print(f"  {len(X):,} matches | {X.shape[1]} features")

    # Time-based split — never random, to avoid future-leakage in eval.
    meta["date"] = pd.to_datetime(meta["date"])
    cutoff = meta["date"].quantile(0.8)
    train_mask = meta["date"] <= cutoff
    test_mask = ~train_mask

    X_train, y_train = X[train_mask].values, y[train_mask]
    X_test, y_test = X[test_mask].values, y[test_mask]
    print(f"  train={len(X_train):,} | test={len(X_test):,} | cutoff={cutoff.date()}")

    pipe = Pipeline([
        ("imp", SimpleImputer(strategy="mean")),
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(solver="lbfgs", max_iter=1000, C=1.0, random_state=42)),
    ])
    pipe.fit(X_train, y_train)

    probs = pipe.predict_proba(X_test)
    brier = _multiclass_brier(y_test, probs)
    ll = float(log_loss(y_test, probs))

    # Naive baseline: always predict the training-set class proportions.
    baseline_probs = np.tile(np.bincount(y_train, minlength=3) / len(y_train), (len(y_test), 1))
    brier_baseline = _multiclass_brier(y_test, baseline_probs)
    ll_baseline = float(log_loss(y_test, baseline_probs))

    unique, counts = np.unique(y_test, return_counts=True)
    dist = {int(k): int(v) for k, v in zip(unique, counts, strict=True)}

    print(f"\n  Brier  : model={brier:.3f}  baseline={brier_baseline:.3f}")
    print(f"  LogLoss: model={ll:.3f}  baseline={ll_baseline:.3f}")
    print(f"  Outcome dist (0=away, 1=draw, 2=home): {dist}")

    metadata = {
        "brier": brier,
        "brier_baseline": brier_baseline,
        "log_loss": ll,
        "log_loss_baseline": ll_baseline,
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "cutoff": str(cutoff.date()),
        "features": FEATURE_COLUMNS,
        "outcome_dist": {str(k): v for k, v in dist.items()},
    }

    path = save_model(pipe, "soccer", "v1", metadata)
    print(f"\nSaved → {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

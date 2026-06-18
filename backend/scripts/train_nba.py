"""Train the NBA binary logistic regression.

    python -m scripts.train_nba

Downloads recent seasons from ESPN on first run, builds point-in-time features
(no leakage), time-splits 80/20, trains, evaluates vs a home-court baseline, and
saves models/nba-v1.joblib (+ .json metadata).
"""

import sys

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.registry import save_model
from app.sports.nba.features import FEATURE_COLUMNS, build_training_frame


def main() -> int:
    print("Building features from ESPN NBA game history…")
    X, y, meta = build_training_frame()
    print(f"  {len(X):,} games | {X.shape[1]} features")
    if len(X) < 200:
        print("  WARNING: very few training games — model will be weak.")

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

    p = pipe.predict_proba(X_test)[:, 1]
    brier = float(brier_score_loss(y_test, p))
    ll = float(log_loss(y_test, p))

    # Baseline: always predict the train home-win rate (home-court prior).
    home_rate = float(np.mean(y_train))
    base = np.full(len(y_test), home_rate)
    brier_base = float(brier_score_loss(y_test, base))
    ll_base = float(log_loss(y_test, base))

    print(f"\n  Home-win rate (train): {home_rate:.3f}")
    print(f"  Brier  : model={brier:.3f}  baseline={brier_base:.3f}")
    print(f"  LogLoss: model={ll:.3f}  baseline={ll_base:.3f}")

    metadata = {
        "brier": brier,
        "brier_baseline": brier_base,
        "log_loss": ll,
        "log_loss_baseline": ll_base,
        "home_win_rate": home_rate,
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "cutoff": str(cutoff.date()),
        "features": FEATURE_COLUMNS,
    }
    path = save_model(pipe, "nba", "v1", metadata)
    print(f"\nSaved → {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

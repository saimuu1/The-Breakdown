"""Train + honestly evaluate the UFC model on SELF-COMPUTED features.

    python -m app.ml.train

Features are point-in-time differentials we compute ourselves from UFCStats raw
data (see sports/ufc/features.py) — no pre-aggregated file, no odds leakage.

Decisions:
  * TIME-BASED split — train on older fights, test on the most recent ~20%.
  * Logistic-regression baseline vs XGBoost; keep the lower Brier on held-out.
  * Score the held-out set the SAME WAY as the de-vigged market closing line
    (odds joined from a separate dataset, used only as the benchmark).
"""

import sys

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from app.ml.evaluate import calibration_curve, devig_two_way, score
from app.ml.registry import save_model
from app.sports.ufc.data import load_odds
from app.sports.ufc.features import FEATURE_COLUMNS, build_training_frame

TEST_FRACTION = 0.20


def _market_lookup() -> dict:
    """(unordered fighter pair, date) -> (red_fighter, r_odds, b_odds)."""
    odds = load_odds()
    lut: dict = {}
    for r in odds.itertuples(index=False):
        try:
            day = str(pd.to_datetime(r.date).date())
        except Exception:
            continue
        lut[(frozenset({r.R_fighter, r.B_fighter}), day)] = (r.R_fighter, r.R_odds, r.B_odds)
    return lut


def _market_probs(meta: pd.DataFrame) -> np.ndarray:
    """De-vigged P(home win) per fight from the closing line; NaN if no odds."""
    lut = _market_lookup()
    out = np.full(len(meta), np.nan)
    for i, m in enumerate(meta.itertuples(index=False)):
        hit = lut.get((frozenset({m.home, m.away}), str(pd.Timestamp(m.date).date())))
        if not hit:
            continue
        red, r_odds, b_odds = hit
        if pd.isna(r_odds) or pd.isna(b_odds):
            continue
        home_odds, away_odds = (r_odds, b_odds) if red == m.home else (b_odds, r_odds)
        out[i] = devig_two_way(home_odds, away_odds)[0]
    return out


def train_ufc() -> dict:
    X, y, meta = build_training_frame()
    order = meta["date"].argsort(kind="stable").to_numpy()
    X = X.iloc[order].reset_index(drop=True)
    y = y[order]
    meta = meta.iloc[order].reset_index(drop=True)

    cut = int(len(X) * (1 - TEST_FRACTION))
    X_train, X_test = X.iloc[:cut], X.iloc[cut:]
    y_train, y_test = y[:cut], y[cut:]

    models = {
        "logistic": Pipeline(
            [
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
                ("clf", LogisticRegression(max_iter=1000)),
            ]
        ),
        "xgboost": XGBClassifier(
            n_estimators=300, max_depth=3, learning_rate=0.05,
            subsample=0.9, colsample_bytree=0.9, eval_metric="logloss",
        ),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        p_home = model.predict_proba(X_test)[:, 1]
        results[name] = (model, score(y_test, p_home), p_home)

    # Market benchmark on the test fights where odds exist.
    mkt = _market_probs(meta.iloc[cut:])
    has_odds = ~np.isnan(mkt)
    market_sc = score(y_test[has_odds], mkt[has_odds]) if has_odds.any() else None

    best_name = min(results, key=lambda k: results[k][1].brier)
    best_model, best_sc, best_p = results[best_name]

    print(f"\nTrain fights: {len(X_train)}  |  Test fights: {len(X_test)}")
    print(f"Test window: {meta['date'].iloc[cut].date()} -> {meta['date'].iloc[-1].date()}\n")
    print(f"{'model':<12}{'Brier':>10}{'LogLoss':>10}")
    for name, (_, sc, _) in results.items():
        flag = "  <- chosen" if name == best_name else ""
        print(f"{name:<12}{sc.brier:>10.4f}{sc.log_loss:>10.4f}{flag}")
    if market_sc:
        print(f"{'market':<12}{market_sc.brier:>10.4f}{market_sc.log_loss:>10.4f}"
              f"   (de-vigged closing line, n={market_sc.n})")

    metadata = {
        "model_type": best_name,
        "features": FEATURE_COLUMNS,
        "feature_engineering": "self-computed point-in-time differentials from UFCStats raw data",
        "train_n": int(len(X_train)),
        "test_n": int(len(X_test)),
        "test_window": [str(meta["date"].iloc[cut].date()), str(meta["date"].iloc[-1].date())],
        "model": best_sc.as_dict(),
        "market": market_sc.as_dict() if market_sc else None,
        "calibration": [
            {"p_mean": b.p_mean, "frac_pos": b.frac_pos, "count": b.count}
            for b in calibration_curve(y_test, best_p)
        ],
    }
    path = save_model(best_model, sport="ufc", version="v1", metadata=metadata)
    print(f"\nSaved {best_name} -> {path}")
    return metadata


def main() -> int:
    sport = sys.argv[1] if len(sys.argv) > 1 else "ufc"
    if sport != "ufc":
        print(f"No trainer for '{sport}' yet.")
        return 1
    train_ufc()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Publish the model's evaluation metrics for the frontend /accuracy page.

    python -m scripts.export_accuracy

Copies the honest metrics (Brier/log-loss vs the de-vigged market + the
calibration curve) from the trained artifact's metadata into a snapshot the
frontend reads. Re-run after training. (A DB-backed version refreshed by the
cron is a natural Phase 9 upgrade.)
"""

import json
from pathlib import Path

from app.ml.registry import load_metadata

OUT = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "accuracy.json"


def main() -> int:
    meta = load_metadata("ufc", "v1")
    snapshot = {
        "sport": "ufc",
        "model_type": meta["model_type"],
        "feature_engineering": meta.get("feature_engineering"),
        "n_features": len(meta.get("features", [])),
        "train_n": meta["train_n"],
        "test_n": meta["test_n"],
        "test_window": meta["test_window"],
        "model": meta["model"],
        "market": meta["market"],
        "calibration": meta["calibration"],
    }
    OUT.write_text(json.dumps(snapshot, indent=2))
    print(f"Wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

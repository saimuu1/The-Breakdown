"""Load/version model artifacts.

A model is saved as `models/{sport}-{version}.joblib` plus a sibling
`.json` of metadata (metrics, training date, feature list). Keeping the metadata
next to the artifact is what lets the /accuracy page and interviews cite exactly
how each version scored.
"""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"


def _artifact_path(sport: str, version: str) -> Path:
    return MODELS_DIR / f"{sport}-{version}.joblib"


def _meta_path(sport: str, version: str) -> Path:
    return MODELS_DIR / f"{sport}-{version}.json"


def save_model(model: Any, sport: str, version: str, metadata: dict) -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    path = _artifact_path(sport, version)
    joblib.dump(model, path)
    meta = {
        "sport": sport,
        "version": version,
        "saved_at": datetime.now(UTC).isoformat(),
        **metadata,
    }
    _meta_path(sport, version).write_text(json.dumps(meta, indent=2))
    return path


def load_model(sport: str, version: str = "v1") -> Any:
    path = _artifact_path(sport, version)
    if not path.exists():
        raise FileNotFoundError(
            f"No model artifact at {path}. Train it with `python -m app.ml.train {sport}`."
        )
    return joblib.load(path)


def load_metadata(sport: str, version: str = "v1") -> dict:
    return json.loads(_meta_path(sport, version).read_text())

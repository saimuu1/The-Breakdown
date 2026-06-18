import numpy as np

import app.sports.ufc.adapter as adapter_mod
import app.sports.ufc.model as model_mod
from app.sports.base import SportAdapter
from app.sports.ufc.adapter import adapter
from app.sports.ufc.features import FEATURE_COLUMNS, PER_FIGHTER_STATS


class _StubModel:
    def predict_proba(self, X):
        return np.array([[0.3, 0.7]])  # P(away)=0.3, P(home)=0.7


def test_ufc_adapter_satisfies_protocol():
    assert isinstance(adapter, SportAdapter)
    assert adapter.sport == "ufc"
    assert adapter.outcomes == ["home", "away"]


def test_fetch_fixtures_maps_espn_bouts_and_matches_names(monkeypatch):
    monkeypatch.setattr(
        adapter_mod,
        "fetch_upcoming_bouts",
        lambda: [
            {
                "home": "Gaston Bolaños",  # accented — must still match history
                "away": "Bob",
                "starts_at": "2026-06-20T21:00Z",
                "date": "2026-06-20",
            }
        ],
    )
    # Historical form is keyed by the un-accented UFCStats spelling.
    monkeypatch.setattr(
        adapter_mod,
        "build_current_forms",
        lambda as_of: {
            "Gaston Bolanos": dict.fromkeys(PER_FIGHTER_STATS, 2.0),
            "Bob": dict.fromkeys(PER_FIGHTER_STATS, 1.0),
        },
    )

    fixtures = adapter.fetch_fixtures()
    assert len(fixtures) == 1
    m = fixtures[0]
    assert m.home == "Gaston Bolaños" and m.away == "Bob"
    assert m.external_id == "2026-06-20:Gaston Bolaños-vs-Bob"
    assert m.starts_at == "2026-06-20T21:00Z"

    # Accent-insensitive match means the diff is computed (2.0 - 1.0 = 1.0), not NaN.
    feats = adapter.build_features(m)
    assert set(feats) == set(FEATURE_COLUMNS)
    assert all(abs(v - 1.0) < 1e-9 for v in feats.values())


def test_predict_maps_model_output_to_home_away(monkeypatch):
    monkeypatch.setattr(model_mod, "_model", lambda: _StubModel())
    probs = adapter.predict(dict.fromkeys(FEATURE_COLUMNS, 0.0))
    assert probs == {"home": 0.7, "away": 0.3}
    assert abs(probs["home"] + probs["away"] - 1.0) < 1e-9

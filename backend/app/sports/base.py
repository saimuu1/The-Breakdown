"""The pluggable per-sport interface.

The core pipeline (ingestion, prediction write-back) talks ONLY to this
Protocol and the registry below — it never names a sport. Adding a sport is one
adapter module plus one `register(...)` call; no changes to the core.
"""

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class RawMatch:
    """A fixture as pulled from a source, before features/prediction.

    `raw` carries source-specific payload (e.g. a CSV row of fighter stats) so
    `build_features` can transform it without re-fetching. Core code ignores it.
    """

    external_id: str
    home: str
    away: str
    starts_at: str  # ISO 8601
    raw: dict = field(default_factory=dict)


@runtime_checkable
class SportAdapter(Protocol):
    sport: str  # 'ufc', 'soccer', 'nba'
    outcomes: list[str]  # ['home', 'away'] or ['home', 'draw', 'away']

    def fetch_fixtures(self) -> list[RawMatch]:
        """Pull upcoming matches from the sport's source(s)."""
        ...

    def build_features(self, m: RawMatch) -> dict:
        """Turn a raw match into the model's input features."""
        ...

    def predict(self, features: dict) -> dict[str, float]:
        """Return {outcome: probability}; keys must equal `outcomes`."""
        ...


# --- registry -------------------------------------------------------------
_REGISTRY: dict[str, SportAdapter] = {}


def register(adapter: SportAdapter) -> None:
    _REGISTRY[adapter.sport] = adapter


def get_adapter(sport: str) -> SportAdapter:
    return _REGISTRY[sport]


def all_adapters() -> list[SportAdapter]:
    return list(_REGISTRY.values())


def clear_registry() -> None:
    """Test helper — reset registration between tests."""
    _REGISTRY.clear()

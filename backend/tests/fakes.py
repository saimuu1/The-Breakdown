"""In-memory test doubles, so the pipeline is testable without a database."""

from app.sports.base import RawMatch


class FakeRepository:
    """Implements the Repository protocol with in-memory dicts."""

    def __init__(self, tiers: dict[str, str] | None = None) -> None:
        self.tiers = tiers or {}
        self.leagues: dict[tuple[str, str], str] = {}
        self.competitors: dict[tuple[str, str], str] = {}
        self.matches: dict[tuple[str, str], str] = {}
        self.features: dict[str, dict] = {}
        self.predictions: list[dict] = []
        self._n = 0

    def _id(self, prefix: str) -> str:
        self._n += 1
        return f"{prefix}-{self._n}"

    def sport_tier(self, sport: str) -> str:
        return self.tiers.get(sport, "pro")

    def ensure_league(self, sport: str, name: str) -> str:
        return self.leagues.setdefault((sport, name), self._id("league"))

    def ensure_competitor(self, league_id: str, name: str) -> str:
        return self.competitors.setdefault((league_id, name), self._id("comp"))

    def upsert_match(
        self, league_id, external_id, home_id, away_id, starts_at,
        status=None, result=None,
    ) -> str:
        return self.matches.setdefault((league_id, external_id), self._id("match"))

    def save_features(self, match_id: str, data: dict) -> None:
        self.features[match_id] = data

    def save_prediction(self, match_id, tier, model_version, probs) -> str:
        # Upsert semantics matching Postgres: update probs on conflict but PRESERVE
        # existing analysis (it's not in the upsert payload).
        for p in self.predictions:
            if p["match_id"] == match_id and p["model_version"] == model_version:
                p["tier"] = tier
                p["probs"] = probs
                return p["id"]
        pid = self._id("pred")
        self.predictions.append(
            {
                "id": pid,
                "match_id": match_id,
                "tier": tier,
                "model_version": model_version,
                "probs": probs,
                "analysis": None,
                "analysis_version": None,
            }
        )
        return pid

    def save_analysis(self, prediction_id, analysis, analysis_version) -> None:
        for p in self.predictions:
            if p["id"] == prediction_id:
                p["analysis"] = analysis
                p["analysis_version"] = analysis_version
                return

    def current_analysis_version(self, prediction_id) -> str | None:
        for p in self.predictions:
            if p["id"] == prediction_id and p.get("analysis"):
                return p["analysis_version"]
        return None


class FakeLLMClient:
    """Records calls and returns canned text — proves grounding without an API."""

    def __init__(self, reply: str = "What a breakdown! The model likes the home side.") -> None:
        self.reply = reply
        self.calls: list[tuple[str, str]] = []

    def complete(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        return self.reply


class FakeAdapter:
    """A minimal binary-outcome adapter for tests / the vertical-slice demo."""

    sport = "fake"
    outcomes = ["home", "away"]

    def __init__(self, fixtures: list[RawMatch] | None = None) -> None:
        self._fixtures = fixtures or [
            RawMatch("f1", "Alice", "Bob", "2026-07-01T00:00:00Z"),
            RawMatch("f2", "Carol", "Dave", "2026-07-02T00:00:00Z"),
        ]

    def fetch_fixtures(self) -> list[RawMatch]:
        return self._fixtures

    def build_features(self, m: RawMatch) -> dict:
        return {"home_edge": 0.2}

    def predict(self, features: dict) -> dict[str, float]:
        return {"home": 0.6, "away": 0.4}


class ExplodingAdapter(FakeAdapter):
    """Predicts fine for most matches but blows up on one — tests resilience."""

    sport = "boom"

    def predict(self, features: dict) -> dict[str, float]:
        if features.get("explode"):
            raise RuntimeError("simulated source/parse failure")
        return {"home": 0.5, "away": 0.5}

    def build_features(self, m: RawMatch) -> dict:
        return {"explode": m.external_id == "f2"}

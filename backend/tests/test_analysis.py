from app.llm.persona import PERSONA_VERSION, SYSTEM_PROMPT, build_user_prompt, top_edges
from app.services.analysis_service import generate_analysis
from app.services.ingestion_service import run_ingestion
from app.sports.base import RawMatch

from .fakes import FakeLLMClient, FakeRepository


def test_top_edges_picks_largest_and_attributes_correctly():
    feats = {
        "reach_cm_dif": 12.0,  # 12/8 = 1.5 (scaled) -> largest, favors home
        "age_dif": 5.0,  # home older -> polarity -1 -> favors away; 5/5 = 1.0
        "win_rate_dif": 0.1,  # 0.1/0.3 = 0.33
        "win_streak_dif": 0.0,  # zero -> skipped
    }
    edges = top_edges(feats, home="Alice", away="Bob", n=2)
    assert len(edges) == 2
    assert edges[0].startswith("reach (cm): favors Alice by 12.0")  # largest scaled edge
    assert "favors Bob" in edges[1]  # age favors the away fighter
    assert all("win streak" not in e for e in edges)  # zero edge excluded


def test_prompt_contains_only_provided_fields():
    probs = {"home": 0.62, "away": 0.38}
    edges = ["reach (cm): favors Alice by 12.0"]
    prompt = build_user_prompt("Alice", "Bob", probs, edges)
    assert "Alice" in prompt and "Bob" in prompt
    assert "62%" in prompt and "38%" in prompt
    assert "reach (cm): favors Alice by 12.0" in prompt


def test_generate_analysis_grounds_prompt_and_returns_version():
    llm = FakeLLMClient(reply="Boom! Alice by reach.")
    result = generate_analysis(
        "Alice", "Bob", {"home": 0.62, "away": 0.38}, ["reach (cm): favors Alice by 12.0"], llm
    )
    assert result.text == "Boom! Alice by reach."
    assert result.version == PERSONA_VERSION

    # The model received the persona system prompt and a grounded user prompt.
    system, user = llm.calls[0]
    assert system == SYSTEM_PROMPT
    assert "Alice" in user and "62%" in user


class _EdgeAdapter:
    """Adapter that opts into analysis via an edges() capability."""

    sport = "fake"
    outcomes = ["home", "away"]

    def fetch_fixtures(self):
        return [RawMatch("m1", "Alice", "Bob", "2026-07-01T00:00:00Z", raw={})]

    def build_features(self, m):
        return {"reach_cm_dif": 10.0}

    def predict(self, features):
        return {"home": 0.6, "away": 0.4}

    def edges(self, features, home, away):
        return top_edges(features, home, away)


def test_ingestion_writes_cached_analysis_when_llm_present():
    repo = FakeRepository(tiers={"fake": "pro"})
    llm = FakeLLMClient(reply="The Breakdown says Alice.")
    run_ingestion(repo, adapters=[_EdgeAdapter()], llm=llm)

    pred = repo.predictions[0]
    assert pred["analysis"] == "The Breakdown says Alice."
    assert pred["analysis_version"] == PERSONA_VERSION
    assert len(llm.calls) == 1


def test_ingestion_skips_analysis_without_llm():
    repo = FakeRepository(tiers={"fake": "pro"})
    run_ingestion(repo, adapters=[_EdgeAdapter()], llm=None)
    assert repo.predictions[0]["analysis"] is None


def test_analysis_generated_once_and_cached_across_reruns():
    repo = FakeRepository(tiers={"fake": "pro"})
    llm = FakeLLMClient(reply="cached take")
    run_ingestion(repo, adapters=[_EdgeAdapter()], llm=llm)
    assert len(llm.calls) == 1

    # Re-run: prediction upserts but the current-version write-up is reused.
    run_ingestion(repo, adapters=[_EdgeAdapter()], llm=llm)
    assert len(llm.calls) == 1  # NOT regenerated
    assert repo.predictions[0]["analysis"] == "cached take"

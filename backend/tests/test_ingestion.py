from app.services.ingestion_service import run_ingestion
from app.sports.base import RawMatch

from .fakes import ExplodingAdapter, FakeAdapter, FakeRepository


def test_ingestion_writes_predictions_with_correct_tier():
    repo = FakeRepository(tiers={"fake": "pro"})
    summary = run_ingestion(repo, adapters=[FakeAdapter()])

    assert summary.processed == 2
    assert summary.failed == 0
    assert summary.by_sport == {"fake": 2}
    assert len(repo.predictions) == 2
    assert all(p["tier"] == "pro" for p in repo.predictions)
    assert all(p["model_version"] == "fake-v1" for p in repo.predictions)
    assert repo.predictions[0]["probs"] == {"home": 0.6, "away": 0.4}


def test_ingestion_is_idempotent_on_rerun():
    repo = FakeRepository(tiers={"fake": "pro"})
    run_ingestion(repo, adapters=[FakeAdapter()])
    run_ingestion(repo, adapters=[FakeAdapter()])

    # Same matches reused (no duplicates) and predictions upserted, not appended.
    assert len(repo.matches) == 2
    assert len(repo.predictions) == 2


def test_one_bad_match_does_not_abort_the_run():
    repo = FakeRepository(tiers={"boom": "free"})
    # f2 is rigged to explode in predict(); f1 should still succeed.
    summary = run_ingestion(repo, adapters=[ExplodingAdapter()])

    assert summary.processed == 1
    assert summary.failed == 1
    assert len(repo.predictions) == 1
    assert repo.predictions[0]["tier"] == "free"


def test_tier_is_denormalized_from_the_sport_not_the_adapter():
    # The adapter knows nothing about tier; the repo/sports table is the source.
    repo = FakeRepository(tiers={"fake": "free"})
    fixtures = [RawMatch("only", "X", "Y", "2026-07-01T00:00:00Z")]
    run_ingestion(repo, adapters=[FakeAdapter(fixtures)])
    assert repo.predictions[0]["tier"] == "free"

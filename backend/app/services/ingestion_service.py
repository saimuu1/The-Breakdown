"""Sport-agnostic ingestion orchestration.

This is the core of the pipeline and it NEVER names a sport — it loops over the
adapter registry. Adding a sport changes nothing here.

Resilience: one bad adapter or one bad match never aborts the run. Failures are
logged and the loop continues, so a flaky source degrades coverage instead of
taking the whole pipeline down. (Network-level retries/backoff live inside each
adapter's fetch code; this is the orchestration-level safety net.)
"""

import logging
import time
from dataclasses import dataclass

from app.integrations.espn_leaders import leaders_to_context
from app.llm.client import LLMClient
from app.llm.persona import PERSONA_VERSION
from app.repositories.protocol import Repository
from app.services.analysis_service import generate_analysis
from app.sports.base import RawMatch, SportAdapter, all_adapters

logger = logging.getLogger(__name__)

# Gentle pacing between LLM calls so free-tier rate limits aren't tripped.
_LLM_THROTTLE_SECONDS = 2.0


@dataclass
class IngestionSummary:
    processed: int = 0
    failed: int = 0
    by_sport: dict[str, int] | None = None

    def __post_init__(self) -> None:
        if self.by_sport is None:
            self.by_sport = {}


def _ingest_match(
    adapter: SportAdapter,
    raw: RawMatch,
    tier: str,
    repo: Repository,
    llm: LLMClient | None,
) -> None:
    league_id = repo.ensure_league(adapter.sport, adapter.sport)
    home_id = repo.ensure_competitor(league_id, raw.home, raw.raw.get("home_logo"))
    away_id = repo.ensure_competitor(league_id, raw.away, raw.raw.get("away_logo"))

    leaders = raw.raw.get("leaders")
    context = {"leaders": leaders} if leaders else None
    match_id = repo.upsert_match(
        league_id, raw.external_id, home_id, away_id, raw.starts_at, context=context
    )

    features = adapter.build_features(raw)
    repo.save_features(match_id, features)

    probs = adapter.predict(features)
    prediction_id = repo.save_prediction(
        match_id, tier, model_version=adapter.sport + "-v1", probs=probs
    )

    # Optional, cached LLM write-up. Adapters opt in by exposing `edges(...)`.
    # Generate ONCE: skip if a current-version write-up already exists, so
    # re-runs only fill gaps. A failure here must not lose the prediction.
    if llm is not None and hasattr(adapter, "edges"):
        if repo.current_analysis_version(prediction_id) == PERSONA_VERSION:
            return  # already cached with the current persona
        try:
            edges = adapter.edges(features, raw.home, raw.away)
            system_prompt = getattr(adapter, "system_prompt", None)
            extra = leaders_to_context(leaders, raw.home, raw.away)
            analysis = generate_analysis(
                raw.home, raw.away, probs, edges, llm,
                system_prompt=system_prompt, extra_context=extra,
            )
            repo.save_analysis(prediction_id, analysis.text, analysis.version)
            time.sleep(_LLM_THROTTLE_SECONDS)
        except Exception:
            logger.exception("analysis generation failed for %s; prediction kept", raw.external_id)


def run_ingestion(
    repo: Repository,
    adapters: list[SportAdapter] | None = None,
    llm: LLMClient | None = None,
) -> IngestionSummary:
    """Run every registered adapter end-to-end, writing predictions to the repo.

    If `llm` is provided, a cached persona write-up is generated per prediction.
    """
    adapters = adapters if adapters is not None else all_adapters()
    summary = IngestionSummary()

    for adapter in adapters:
        try:
            tier = repo.sport_tier(adapter.sport)
            fixtures = adapter.fetch_fixtures()
        except Exception:
            logger.exception("adapter %s failed to fetch; skipping", adapter.sport)
            summary.failed += 1
            continue

        for raw in fixtures:
            try:
                _ingest_match(adapter, raw, tier, repo, llm)
                summary.processed += 1
                summary.by_sport[adapter.sport] = summary.by_sport.get(adapter.sport, 0) + 1
            except Exception:
                logger.exception(
                    "failed to ingest %s match %s; continuing",
                    adapter.sport,
                    raw.external_id,
                )
                summary.failed += 1

    logger.info(
        "ingestion complete: processed=%d failed=%d by_sport=%s",
        summary.processed,
        summary.failed,
        summary.by_sport,
    )
    return summary

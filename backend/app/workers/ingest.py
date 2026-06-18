"""Cron entrypoint, run by GitHub Actions on a schedule.

    python -m app.workers.ingest

Imports the sport adapters (which self-register on import), then runs the
sport-agnostic ingestion pipeline against Supabase.
"""

import logging
import sys

from app.config import get_settings
from app.repositories.supabase_repo import SupabaseRepository
from app.services.ingestion_service import run_ingestion

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ingest")


def _register_adapters() -> None:
    """Import adapters so they register themselves. Added per phase."""
    import app.sports.nba.adapter  # noqa: F401  (registers NBAAdapter)
    import app.sports.soccer.adapter  # noqa: F401  (registers SoccerAdapter)
    import app.sports.ufc.adapter  # noqa: F401  (registers UFCAdapter)


def main() -> int:
    _register_adapters()

    # Generate persona write-ups only if an LLM key is configured.
    llm = None
    if get_settings().llm_api_key:
        from app.llm.client import get_llm_client

        llm = get_llm_client()
    else:
        logger.warning("LLM_API_KEY not set — skipping analysis generation")

    summary = run_ingestion(SupabaseRepository(), llm=llm)
    logger.info("done: %s", summary)
    return 0 if summary.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

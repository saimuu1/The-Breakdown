from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, get_current_user
from app.repositories.supabase_repo import SupabaseRepository
from app.services.ingestion_service import run_ingestion

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/ingest")
def trigger_ingestion(_: CurrentUser = Depends(get_current_user)) -> dict:
    """Run the ingestion pipeline on demand — same entrypoint as the cron worker."""
    summary = run_ingestion(SupabaseRepository())
    return {
        "processed": summary.processed,
        "failed": summary.failed,
        "by_sport": summary.by_sport,
    }

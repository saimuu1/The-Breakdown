"""Supabase client factory for the backend.

The backend uses the SERVICE_ROLE key, which bypasses RLS — it is the trusted
writer of predictions/analysis. RLS still governs every read the frontend makes
with the anon/authenticated key. Keep the service key server-side only.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_service_client() -> Client:
    settings = get_settings()
    if not settings.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY is not set — backend cannot write to Supabase."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)

"""Backfill fighter headshots for UFC competitors that don't have one.

    python -m scripts.backfill_fighter_headshots

Upcoming fighters get a headshot during live ingestion (ESPN core API), but
fighters pulled only from our local UFCStats history have none, so past cards
show initials. ESPN's search endpoint resolves a name to an athlete id, which
yields a headshot URL. We match strictly by normalized name so nobody gets the
wrong face, and skip anyone we can't confidently resolve (they keep initials).
"""

import logging
import re
import sys
import time

import httpx

from app.repositories.supabase_repo import SupabaseRepository
from app.sports.ufc.features import normalize_name

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-headshots")

_SEARCH = "https://site.web.api.espn.com/apis/search/v2"
_HEADSHOT = "https://a.espncdn.com/i/headshots/mma/players/full/{aid}.png"
_UID_ATHLETE = re.compile(r"a:(\d+)")


def _resolve_headshot(name: str) -> str | None:
    """ESPN headshot URL for a fighter, or None if not confidently matched."""
    try:
        resp = httpx.get(
            _SEARCH,
            params={"query": name, "limit": 8},
            headers={"User-Agent": "the-breakdown/1.0"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    target = normalize_name(name)
    for group in data.get("results", []):
        for item in group.get("contents", []):
            if item.get("type") != "player":
                continue
            if normalize_name(item.get("displayName", "")) != target:
                continue
            m = _UID_ATHLETE.search(item.get("uid", ""))
            if m:
                return _HEADSHOT.format(aid=m.group(1))
    return None


def main() -> int:
    repo = SupabaseRepository()
    db = repo._db  # noqa: SLF001 — one-off maintenance script
    league_id = repo.ensure_league("ufc", "ufc")

    # Competitors that actually appear in a match and have no logo yet.
    match_rows = db.table("matches").select("home_id,away_id").eq("league_id", league_id).execute()
    active: set[str] = set()
    for r in match_rows.data:
        active.add(r["home_id"])
        active.add(r["away_id"])

    comps = (
        db.table("competitors").select("id,name,logo_url").eq("league_id", league_id).execute().data
    )
    todo = [c for c in comps if c["id"] in active and not c["logo_url"]]
    logger.info("Resolving headshots for %d fighters…", len(todo))

    found = 0
    for i, c in enumerate(todo, 1):
        url = _resolve_headshot(c["name"])
        if url:
            db.table("competitors").update({"logo_url": url}).eq("id", c["id"]).execute()
            found += 1
        time.sleep(0.25)
        if i % 25 == 0:
            logger.info("  …%d/%d checked, %d matched", i, len(todo), found)

    logger.info("Headshot backfill complete: %d/%d fighters matched", found, len(todo))
    return 0


if __name__ == "__main__":
    sys.exit(main())

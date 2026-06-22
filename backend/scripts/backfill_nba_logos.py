"""Backfill NBA team logos from ESPN's teams API.

    python -m scripts.backfill_nba_logos

The season backfill writes games from a cached CSV that has no logo column, so
most NBA teams land with a null logo_url. ESPN's free teams endpoint lists all
30 teams with clean logos; we match by display name and fill any blanks. Safe to
re-run — only updates rows whose logo_url is missing.
"""

import logging
import sys

import httpx

from app.repositories.supabase_repo import SupabaseRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backfill-nba-logos")

TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"


def fetch_team_logos() -> dict[str, str]:
    """ESPN display name -> primary logo URL for every NBA team."""
    data = httpx.get(TEAMS_URL, timeout=25, headers={"User-Agent": "the-breakdown/1.0"}).json()
    teams = data["sports"][0]["leagues"][0]["teams"]
    out: dict[str, str] = {}
    for entry in teams:
        t = entry["team"]
        logos = t.get("logos") or []
        if logos:
            out[t["displayName"]] = logos[0]["href"]
    return out


def main() -> int:
    logos = fetch_team_logos()
    logger.info("ESPN returned %d team logos", len(logos))

    repo = SupabaseRepository()
    db = repo._db  # noqa: SLF001 — one-off maintenance script
    league_id = repo.ensure_league("nba", "nba")

    rows = (
        db.table("competitors")
        .select("id,name,logo_url")
        .eq("league_id", league_id)
        .execute()
        .data
    )

    updated = unmatched = 0
    for row in rows:
        if row.get("logo_url"):
            continue
        href = logos.get(row["name"])
        if not href:
            logger.warning("no ESPN logo match for %r", row["name"])
            unmatched += 1
            continue
        db.table("competitors").update({"logo_url": href}).eq("id", row["id"]).execute()
        updated += 1

    logger.info("NBA logos backfilled: %d updated, %d unmatched", updated, unmatched)
    return 0


if __name__ == "__main__":
    sys.exit(main())

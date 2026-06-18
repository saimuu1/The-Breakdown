"""Live upcoming UFC fixtures from ESPN's public API.

The static dataset's "upcoming" card goes stale fast, so we pull the genuinely
next card from ESPN's free scoreboard endpoint (no key). We only take the
matchups (names + date); features are still computed ourselves from UFCStats
history. Resilient: retries with backoff, and a parse failure degrades to an
empty list rather than crashing the run.
"""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"


def _get(url: str, retries: int = 4, timeout: float = 15.0) -> dict:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            resp = httpx.get(url, timeout=timeout, headers={"User-Agent": "the-breakdown/1.0"})
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            last = exc
            if attempt < retries - 1:
                time.sleep(2**attempt)
    raise last  # type: ignore[misc]


def fetch_upcoming_bouts() -> list[dict]:
    """Return upcoming bouts as [{home, away, starts_at, date}] (only not-yet-started)."""
    try:
        data = _get(ESPN_SCOREBOARD)
    except Exception:
        logger.exception("ESPN upcoming fetch failed; no upcoming fixtures this run")
        return []

    bouts: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")  # e.g. 2026-06-20T21:00Z
        day = event_date.split("T")[0]
        event_name = event.get("name")  # e.g. "UFC Freedom 250: Topuria vs. Gaethje"
        for comp in event.get("competitions", []):
            state = comp.get("status", {}).get("type", {}).get("state")
            if state and state != "pre":
                continue  # already started/finished
            competitors = comp.get("competitors", [])
            names = [c.get("athlete", {}).get("displayName") for c in competitors]
            names = [n for n in names if n]
            if len(names) != 2:
                continue
            bouts.append(
                {
                    "home": names[0],
                    "away": names[1],
                    "starts_at": event_date or f"{day}T00:00:00Z",
                    "date": day,
                    "event_name": event_name,
                }
            )
    return bouts

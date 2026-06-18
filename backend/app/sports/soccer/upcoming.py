"""Live upcoming World Cup 2026 fixtures from ESPN's free API (no key).

Only "pre"-state matches are returned. Looks ahead up to `_LOOKAHEAD_DAYS`
days so the pipeline always has something to write even when today's matches
are already in-progress or finished. A parse failure degrades to an empty list
rather than crashing the run.
"""

import logging
import time
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

ESPN_WC_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
_LOOKAHEAD_DAYS = 3


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


def _team_name(competitor: dict) -> str | None:
    return (
        competitor.get("team", {}).get("displayName")
        or competitor.get("athlete", {}).get("displayName")
    )


def _parse_pre_matches(data: dict) -> list[dict]:
    matches: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")
        day = event_date.split("T")[0]

        for comp in event.get("competitions", []):
            state = comp.get("status", {}).get("type", {}).get("state")
            if state and state != "pre":
                continue

            competitors = comp.get("competitors", [])
            home_name = away_name = None

            for c in competitors:
                name = _team_name(c)
                if not name:
                    continue
                if c.get("homeAway") == "home":
                    home_name = name
                elif c.get("homeAway") == "away":
                    away_name = name

            # Fallback: take first two if homeAway flag not present.
            if not home_name or not away_name:
                names = [_team_name(c) for c in competitors if _team_name(c)]
                if len(names) >= 2:
                    home_name, away_name = names[0], names[1]
                else:
                    continue

            matches.append({
                "home": home_name,
                "away": away_name,
                "starts_at": event_date or f"{day}T00:00:00Z",
                "date": day,
                "is_neutral": 1,  # World Cup = always neutral venue
            })
    return matches


def fetch_upcoming_matches(lookahead: int = _LOOKAHEAD_DAYS) -> list[dict]:
    """Return upcoming World Cup matches across today + next `lookahead` days."""
    seen: set[str] = set()
    all_matches: list[dict] = []

    for delta in range(lookahead + 1):
        day = (date.today() + timedelta(days=delta)).strftime("%Y%m%d")
        url = f"{ESPN_WC_BASE}?dates={day}"
        try:
            data = _get(url)
        except Exception:
            logger.warning("ESPN soccer fetch failed for %s; skipping day", day)
            continue

        for m in _parse_pre_matches(data):
            key = f"{m['date']}:{m['home']}:{m['away']}"
            if key not in seen:
                seen.add(key)
                all_matches.append(m)

        if all_matches:
            # Stop as soon as we have at least one day of upcoming fixtures.
            break

    if not all_matches:
        logger.info("No upcoming World Cup fixtures found in the next %d days", lookahead)
    return all_matches

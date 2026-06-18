"""Live upcoming NBA games from ESPN's free API (no key).

Looks ahead up to `_LOOKAHEAD_DAYS` days so the pipeline has fixtures even when
today's slate is finished. A parse failure degrades to an empty list. In the
offseason this returns nothing — by design.
"""

import logging
import time
from datetime import date, timedelta

import httpx

from app.integrations.espn_leaders import leaders_from_competition

logger = logging.getLogger(__name__)

SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
_LOOKAHEAD_DAYS = 5


def _get(url: str, retries: int = 4, timeout: float = 25.0) -> dict:
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


def _parse_pre_games(data: dict) -> list[dict]:
    games: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")
        day = event_date.split("T")[0]
        for comp in event.get("competitions", []):
            state = comp.get("status", {}).get("type", {}).get("state")
            if state and state != "pre":
                continue
            home = away = None
            home_logo = away_logo = None
            for c in comp.get("competitors", []):
                t = c.get("team", {})
                team = t.get("displayName")
                if not team:
                    continue
                if c.get("homeAway") == "home":
                    home, home_logo = team, t.get("logo")
                elif c.get("homeAway") == "away":
                    away, away_logo = team, t.get("logo")
            if not home or not away:
                continue
            games.append({
                "home": home,
                "away": away,
                "home_logo": home_logo,
                "away_logo": away_logo,
                "leaders": leaders_from_competition(comp),
                "starts_at": event_date or f"{day}T00:00:00Z",
                "date": day,
            })
    return games


def fetch_upcoming_games(lookahead: int = _LOOKAHEAD_DAYS) -> list[dict]:
    """Return upcoming NBA games across today + next `lookahead` days."""
    seen: set[str] = set()
    out: list[dict] = []
    for delta in range(lookahead + 1):
        day = (date.today() + timedelta(days=delta)).strftime("%Y%m%d")
        try:
            data = _get(f"{SCOREBOARD}?dates={day}")
        except Exception:
            logger.warning("ESPN NBA fetch failed for %s; skipping day", day)
            continue
        for g in _parse_pre_games(data):
            key = f"{g['date']}:{g['home']}:{g['away']}"
            if key not in seen:
                seen.add(key)
                out.append(g)
        if out:
            break
    if not out:
        logger.info("No upcoming NBA games in the next %d days (offseason?)", lookahead)
    return out

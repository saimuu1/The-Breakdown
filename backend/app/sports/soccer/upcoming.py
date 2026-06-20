"""Live upcoming World Cup 2026 fixtures from ESPN's free API (no key).

Only "pre"-state matches are returned. Looks ahead up to `_LOOKAHEAD_DAYS`
days so the pipeline always has something to write even when today's matches
are already in-progress or finished. A parse failure degrades to an empty list
rather than crashing the run.
"""

import logging
import re
import time
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

ESPN_WC_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
_LOOKAHEAD_DAYS = 30

# Knockout fixtures list placeholder "teams" until the bracket resolves
# (e.g. "Group C Winner", "Third Place Group A/B/C/D/F"). Don't show those.
_PLACEHOLDER = re.compile(r"\b(group|winner|runner|place|2nd|3rd|third)\b", re.IGNORECASE)


def _is_placeholder(name: str | None) -> bool:
    return not name or bool(_PLACEHOLDER.search(name))


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
            home_logo = away_logo = None

            for c in competitors:
                name = _team_name(c)
                if not name:
                    continue
                logo = c.get("team", {}).get("logo")
                if c.get("homeAway") == "home":
                    home_name, home_logo = name, logo
                elif c.get("homeAway") == "away":
                    away_name, away_logo = name, logo

            # Fallback: take first two if homeAway flag not present.
            if not home_name or not away_name:
                pairs = [
                    (_team_name(c), c.get("team", {}).get("logo"))
                    for c in competitors
                    if _team_name(c)
                ]
                if len(pairs) >= 2:
                    (home_name, home_logo), (away_name, away_logo) = pairs[0], pairs[1]
                else:
                    continue

            if _is_placeholder(home_name) or _is_placeholder(away_name):
                continue  # knockout placeholder — not a decided matchup yet

            matches.append({
                "home": home_name,
                "away": away_name,
                "home_logo": home_logo,
                "away_logo": away_logo,
                "starts_at": event_date or f"{day}T00:00:00Z",
                "date": day,
                "is_neutral": 1,  # World Cup = always neutral venue
            })
    return matches


def fetch_upcoming_matches(lookahead: int = _LOOKAHEAD_DAYS) -> list[dict]:
    """Return all upcoming World Cup matches across today + next `lookahead` days.

    Unlike a single next-card pull, we sweep the whole window so every announced
    matchday shows on the board (knockout placeholders are filtered upstream).
    """
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

    if not all_matches:
        logger.info("No upcoming World Cup fixtures found in the next %d days", lookahead)
    else:
        logger.info("World Cup upcoming: %d matches over %d days", len(all_matches), lookahead)
    return all_matches

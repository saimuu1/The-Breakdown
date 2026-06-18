"""Recent COMPLETED NBA games from ESPN's free API (no key).

Backfills the past-predictions page with real recent games and their actual
winners, so the page is a track record rather than just aged-out upcoming picks.
Walks backwards day-by-day from today and stops once `max_games` are collected.
"""

import logging
import time
from datetime import date, timedelta

import httpx

from app.integrations.espn_leaders import leaders_from_competition

logger = logging.getLogger(__name__)

SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"


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


def _parse_completed(data: dict) -> list[dict]:
    games: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")
        day = event_date.split("T")[0]
        for comp in event.get("competitions", []):
            if comp.get("status", {}).get("type", {}).get("state") != "post":
                continue
            home = away = None
            for c in comp.get("competitors", []):
                t = c.get("team", {})
                team = t.get("displayName")
                if not team:
                    continue
                rec = {"team": team, "won": bool(c.get("winner")), "logo": t.get("logo")}
                if c.get("homeAway") == "home":
                    home = rec
                elif c.get("homeAway") == "away":
                    away = rec
            if not home or not away:
                continue
            winner = "home" if home["won"] else ("away" if away["won"] else None)
            games.append({
                "home": home["team"],
                "away": away["team"],
                "home_logo": home["logo"],
                "away_logo": away["logo"],
                "winner": winner,
                "leaders": leaders_from_competition(comp),
                "date": day,
                "starts_at": event_date or f"{day}T00:00:00Z",
            })
    return games


def fetch_recent_games(days_back: int = 14, max_games: int = 10) -> list[dict]:
    """Return recent completed games, most recent first."""
    out: list[dict] = []
    seen: set[str] = set()
    for delta in range(1, days_back + 1):
        if len(out) >= max_games:
            break
        day = (date.today() - timedelta(days=delta)).strftime("%Y%m%d")
        try:
            data = _get(f"{SCOREBOARD}?dates={day}")
        except Exception:
            logger.warning("ESPN NBA results fetch failed for %s; skipping", day)
            continue
        for g in _parse_completed(data):
            key = f"{g['date']}:{g['home']}:{g['away']}"
            if key not in seen:
                seen.add(key)
                out.append(g)
    if not out:
        logger.info("No recent completed NBA games in the last %d days", days_back)
    return out[:max_games]

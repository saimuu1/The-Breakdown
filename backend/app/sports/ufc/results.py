"""Recent COMPLETED UFC events from ESPN's free API (no key).

The live pipeline only writes genuinely upcoming fights, so the "past
predictions" page would otherwise show nothing but whatever upcoming card has
since aged into the past. This backfills the most recent finished events —
matchups, dates, and actual winners — so the past page reflects real recent
fights and can be graded against what happened.

We walk backwards day-by-day from today (ESPN's scoreboard takes a ?dates=
parameter), dedupe events by id, and stop once we have `max_events` events.
"""

import logging
import time
from datetime import date, timedelta

import httpx

from app.sports.ufc.cards import fetch_event_card_meta, is_womens_bout, select_main_card

logger = logging.getLogger(__name__)

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"


def _get(url: str, retries: int = 4, timeout: float = 30.0) -> dict:
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


def _parse_completed_bouts(comp: dict) -> dict | None:
    """One competition → {home, away, winner} or None if not a finished 2-fighter bout."""
    state = comp.get("status", {}).get("type", {}).get("state")
    if state != "post":
        return None
    if is_womens_bout(comp):
        return None  # women's fights are not displayed

    competitors = comp.get("competitors", [])
    parsed = []
    for c in competitors:
        name = c.get("athlete", {}).get("displayName")
        if name:
            parsed.append((name, bool(c.get("winner"))))
    if len(parsed) != 2:
        return None

    (home, home_won), (away, away_won) = parsed[0], parsed[1]
    winner = "home" if home_won else ("away" if away_won else None)
    return {"home": home, "away": away, "winner": winner}


def fetch_recent_events(days_back: int = 45, max_events: int = 3) -> list[dict]:
    """Return recent completed events, most recent first:

        [{name, date, starts_at, bouts: [{home, away, winner}]}]
    """
    seen_event_ids: set[str] = set()
    events: list[dict] = []

    for delta in range(1, days_back + 1):
        if len(events) >= max_events:
            break
        day = (date.today() - timedelta(days=delta)).strftime("%Y%m%d")
        try:
            data = _get(f"{ESPN_SCOREBOARD}?dates={day}")
        except Exception:
            logger.warning("ESPN results fetch failed for %s; skipping day", day)
            continue

        for event in data.get("events", []):
            event_id = str(event.get("id", ""))
            if event_id in seen_event_ids:
                continue

            meta = fetch_event_card_meta(event.get("id"))
            bouts = [
                b for c in select_main_card(event.get("competitions", []), meta)
                if (b := _parse_completed_bouts(c)) is not None
            ]
            if not bouts:
                continue

            seen_event_ids.add(event_id)
            event_date = event.get("date", "")
            events.append({
                "name": event.get("name", "UFC Event"),
                "date": event_date.split("T")[0],
                "starts_at": event_date or f"{day[:4]}-{day[4:6]}-{day[6:]}T00:00:00Z",
                "bouts": bouts,
            })

    if not events:
        logger.info("No recent completed UFC events found in the last %d days", days_back)
    return events

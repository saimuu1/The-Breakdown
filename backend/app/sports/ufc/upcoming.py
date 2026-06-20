"""Live upcoming UFC fixtures from ESPN's public API.

The static dataset's "upcoming" card goes stale fast, so we pull the genuinely
upcoming cards from ESPN's free scoreboard endpoint (no key). The default
scoreboard only returns the next event, so we read the season `calendar` and
query every future card's date, collecting each event's MAIN-CARD bouts (prelims
are dropped — see `select_main_card`). We only take the matchups (names + date);
features are still computed ourselves from UFCStats history. Resilient: retries
with backoff, and a parse failure degrades to an empty list rather than crashing.
"""

import logging
import re
import time
from datetime import date, timedelta

import httpx

from app.sports.ufc.cards import (
    fetch_event_card_meta,
    headshot_url,
    is_womens_bout,
    select_main_card,
)

logger = logging.getLogger(__name__)

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard"

# A bout with a placeholder fighter ("TBA", "Opponent TBD") isn't finalized yet.
_TBD = re.compile(r"\b(tba|tbd|opponent)\b", re.IGNORECASE)


def _is_tbd(name: str | None) -> bool:
    return not name or bool(_TBD.search(name))


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


def _future_query_dates(calendar: list[dict]) -> list[str]:
    """ESPN-style YYYYMMDD dates to query for every upcoming card.

    Each calendar entry's local date can sit a day off from the scoreboard's UTC
    bucket, so we query the event date and the day before, then dedupe.
    """
    today = date.today()
    dates: set[str] = set()
    for entry in calendar:
        raw = (entry.get("startDate") or "")[:10]
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        if d < today:
            continue
        dates.add(d.strftime("%Y%m%d"))
        dates.add((d - timedelta(days=1)).strftime("%Y%m%d"))
    return sorted(dates)


def _parse_event_bouts(event: dict) -> list[dict]:
    event_date = event.get("date", "")  # e.g. 2026-06-20T21:00Z
    day = event_date.split("T")[0]
    event_name = event.get("name")
    meta = fetch_event_card_meta(event.get("id"))  # card segment + athlete ids

    bouts: list[dict] = []
    for comp in select_main_card(event.get("competitions", []), meta):
        state = comp.get("status", {}).get("type", {}).get("state")
        if state and state != "pre":
            continue  # already started/finished
        if is_womens_bout(comp):
            continue  # women's fights are not displayed
        competitors = comp.get("competitors", [])
        names = [c.get("athlete", {}).get("displayName") for c in competitors]
        if len(names) != 2 or any(_is_tbd(n) for n in names):
            continue  # not a finalized two-fighter bout (skip TBA/TBD)

        # Headshots: athlete ids are in competitor order (see cards.py).
        athlete_ids = (meta or {}).get(str(comp.get("id")), {}).get("athlete_ids", [])
        home_logo = headshot_url(athlete_ids[0]) if len(athlete_ids) > 0 else None
        away_logo = headshot_url(athlete_ids[1]) if len(athlete_ids) > 1 else None

        start = comp.get("startDate") or comp.get("date") or event_date
        bouts.append(
            {
                "home": names[0],
                "away": names[1],
                "home_logo": home_logo,
                "away_logo": away_logo,
                "starts_at": start or f"{day}T00:00:00Z",
                "date": day,
                "event_name": event_name,
            }
        )
    return bouts


def fetch_upcoming_bouts() -> list[dict]:
    """Return upcoming main-card bouts across ALL announced future cards."""
    try:
        scoreboard = _get(ESPN_SCOREBOARD)
    except Exception:
        logger.exception("ESPN upcoming fetch failed; no upcoming fixtures this run")
        return []

    calendar = (scoreboard.get("leagues") or [{}])[0].get("calendar") or []

    # Collect every announced future event (default scoreboard + each card's date).
    events_by_id: dict[str, dict] = {}
    for event in scoreboard.get("events", []):
        events_by_id.setdefault(str(event.get("id")), event)
    for qdate in _future_query_dates(calendar):
        try:
            data = _get(f"{ESPN_SCOREBOARD}?dates={qdate}")
        except Exception:
            logger.warning("ESPN upcoming fetch failed for %s; skipping", qdate)
            continue
        for event in data.get("events", []):
            events_by_id.setdefault(str(event.get("id")), event)

    bouts: list[dict] = []
    for event in events_by_id.values():
        bouts.extend(_parse_event_bouts(event))

    bouts.sort(key=lambda b: b["starts_at"])
    logger.info("UFC upcoming: %d main-card bouts across %d cards", len(bouts), len(events_by_id))
    return bouts

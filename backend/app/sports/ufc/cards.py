"""Main-card detection and fighter headshots for UFC events, via ESPN.

ESPN's free *scoreboard* feed lists every bout (early prelims, prelims, main
card) with inline fighter names but no segment flag and no headshots. ESPN's
*core* API tags each competition with an explicit `cardSegment` ("Main Card" vs
"Prelims") — the same split the ESPN site shows — and links each competitor to an
athlete whose id yields a headshot URL. The two feeds share competition ids and
competitor order, so we read the authoritative segment + athlete ids from the
core API and join them to the scoreboard competitions.

If the core API is unavailable, `select_main_card` falls back to inferring the
main card from start time (it starts after the prelims) or the last
`MAIN_CARD_SIZE` bouts in listing order (ESPN lists main-event-last).
"""

import logging
import re
import time

import httpx

logger = logging.getLogger(__name__)

MAIN_CARD_SIZE = 5
_CORE_COMPETITIONS = (
    "https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{eid}/competitions?limit=30"
)
_HEADSHOT = "https://a.espncdn.com/i/headshots/mma/players/full/{aid}.png"
_ATHLETE_ID = re.compile(r"/athletes/(\d+)")


def _get(url: str, retries: int = 3, timeout: float = 15.0) -> dict:
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


def headshot_url(athlete_id: str | None) -> str | None:
    """ESPN headshot URL for an athlete id (None if unknown)."""
    return _HEADSHOT.format(aid=athlete_id) if athlete_id else None


def is_womens_bout(competition: dict) -> bool:
    """True for a women's bout. ESPN abbreviates women's weight classes with a
    "W " prefix (e.g. "W Bantamweight"); men's are plain ("Welterweight")."""
    t = competition.get("type") or {}
    abbr = t.get("abbreviation") or ""
    text = t.get("text") or t.get("displayName") or ""
    return abbr.startswith("W ") or "women" in text.lower()


def fetch_event_card_meta(event_id: str | None) -> dict[str, dict] | None:
    """Per-competition metadata from the core API, keyed by competition id:

        {comp_id: {"segment": "main"|"prelims1"|…, "athlete_ids": [id, id]}}

    Athlete ids are in competitor order, matching the scoreboard's order. Returns
    None if the core API has nothing usable.
    """
    if not event_id:
        return None
    try:
        data = _get(_CORE_COMPETITIONS.format(eid=event_id))
    except Exception:
        logger.warning("core API card metadata unavailable for event %s", event_id)
        return None

    meta: dict[str, dict] = {}
    for item in data.get("items", []):
        cid = str(item.get("id"))
        segment = (item.get("cardSegment") or {}).get("name")
        athlete_ids: list[str | None] = []
        for c in item.get("competitors", []):
            ref = (c.get("athlete") or {}).get("$ref") or ""
            m = _ATHLETE_ID.search(ref)
            athlete_ids.append(m.group(1) if m else None)
        meta[cid] = {"segment": segment, "athlete_ids": athlete_ids}
    return meta or None


def select_main_card(competitions: list[dict], meta: dict[str, dict] | None = None) -> list[dict]:
    """Return only the main-card competitions from an ESPN event's bouts.

    Prefers ESPN's authoritative `cardSegment` (via `meta`); falls back to
    start-time grouping (latest batch) and finally the last `MAIN_CARD_SIZE`
    bouts in listing order.
    """
    if not competitions:
        return []

    if meta:
        main = [c for c in competitions if meta.get(str(c.get("id")), {}).get("segment") == "main"]
        if main:
            return main

    starts = [c.get("startDate") or c.get("date") for c in competitions]
    distinct = {s for s in starts if s}
    if len(distinct) > 1:
        latest = max(distinct)
        return [c for c, s in zip(competitions, starts, strict=True) if s == latest]
    return competitions[-MAIN_CARD_SIZE:]

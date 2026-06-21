"""Completed World Cup 2026 results from ESPN's free API (no key).

The upcoming feed (`upcoming.py`) only returns "pre"-state fixtures, so a game
vanishes from ingestion the moment it kicks off. This module is the mirror: it
sweeps a date window and returns FINISHED ("post"-state) games with their final
scores, so the backfill can grade predictions against what actually happened.
"""

import logging
from datetime import date, timedelta

from app.sports.soccer.upcoming import ESPN_WC_BASE, _get, _is_placeholder, _team_name

logger = logging.getLogger(__name__)


def _winner(home_score: int, away_score: int) -> str:
    """Three-way outcome key from the final score."""
    if home_score > away_score:
        return "home"
    if home_score < away_score:
        return "away"
    return "draw"


def _parse_completed(data: dict) -> list[dict]:
    out: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")
        day = event_date.split("T")[0]

        for comp in event.get("competitions", []):
            state = comp.get("status", {}).get("type", {}).get("state")
            if state != "post":
                continue  # only finished games carry a final result

            home = away = None
            for c in comp.get("competitors", []):
                name = _team_name(c)
                if not name:
                    continue
                rec = {
                    "name": name,
                    "logo": c.get("team", {}).get("logo"),
                    "score": c.get("score"),
                }
                if c.get("homeAway") == "home":
                    home = rec
                elif c.get("homeAway") == "away":
                    away = rec

            if not home or not away:
                continue
            if _is_placeholder(home["name"]) or _is_placeholder(away["name"]):
                continue

            try:
                hs, as_ = int(home["score"]), int(away["score"])
            except (TypeError, ValueError):
                continue  # no usable final score

            out.append({
                "home": home["name"],
                "away": away["name"],
                "home_logo": home["logo"],
                "away_logo": away["logo"],
                "home_score": hs,
                "away_score": as_,
                "winner": _winner(hs, as_),
                "starts_at": event_date or f"{day}T00:00:00Z",
                "date": day,
                "is_neutral": 1,  # World Cup = always neutral venue
            })
    return out


def fetch_completed_matches(days_back: int = 21) -> list[dict]:
    """Every finished World Cup game over the last `days_back` days.

    Sweeps one ESPN scoreboard call per day (the feed is date-scoped) and dedupes
    by (date, home, away) so timezone-straddling events aren't double-counted.
    """
    seen: set[tuple[str, str, str]] = set()
    all_matches: list[dict] = []
    today = date.today()

    for offset in range(days_back + 1):
        day = today - timedelta(days=offset)
        url = f"{ESPN_WC_BASE}?dates={day.strftime('%Y%m%d')}"
        try:
            data = _get(url)
        except Exception:
            logger.warning("soccer results fetch failed for %s; skipping day", day)
            continue
        for m in _parse_completed(data):
            key = (m["date"], m["home"], m["away"])
            if key in seen:
                continue
            seen.add(key)
            all_matches.append(m)

    logger.info("fetched %d completed World Cup matches", len(all_matches))
    return all_matches

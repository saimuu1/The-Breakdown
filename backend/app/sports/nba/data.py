"""NBA game-results data from ESPN's free API (no key), cached to CSV.

Unlike UFC/soccer there's no maintained public CSV that stays current, so we
build our own from ESPN's scoreboard. ESPN exposes a per-season `calendar` of
game dates; we discover the calendar for the last few seasons, fetch each date's
completed games, and cache the lot to data/nba/games.csv (gitignored, rebuilt on
demand). Features are still self-computed from these raw results.
"""

import logging
import time
from datetime import date, timedelta
from pathlib import Path

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "nba"
GAMES_PATH = DATA_DIR / "games.csv"
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


def _calendar_dates(anchor: str) -> list[str]:
    """The YYYYMMDD game dates of the season containing `anchor` (YYYYMMDD)."""
    data = _get(f"{SCOREBOARD}?dates={anchor}")
    cal = data.get("leagues", [{}])[0].get("calendar", [])
    out: list[str] = []
    for c in cal:
        val = c.get("startDate") if isinstance(c, dict) else c
        if val:
            out.append(val[:10].replace("-", ""))
    return out


def _parse_day(data: dict) -> list[dict]:
    games: list[dict] = []
    for event in data.get("events", []):
        event_date = event.get("date", "")
        for comp in event.get("competitions", []):
            if comp.get("status", {}).get("type", {}).get("state") != "post":
                continue
            home = away = None
            for c in comp.get("competitors", []):
                team = c.get("team", {}).get("displayName")
                score = c.get("score")
                if not team or score is None:
                    continue
                rec = {"team": team, "score": float(score), "won": bool(c.get("winner"))}
                if c.get("homeAway") == "home":
                    home = rec
                elif c.get("homeAway") == "away":
                    away = rec
            if not home or not away:
                continue
            games.append({
                "date": event_date.split("T")[0],
                "home_team": home["team"],
                "away_team": away["team"],
                "home_score": home["score"],
                "away_score": away["score"],
                "home_win": int(home["won"]),
            })
    return games


def download_games(seasons: int = 2, force: bool = False) -> None:
    """Fetch the last `seasons` seasons of completed games into data/nba/games.csv."""
    if GAMES_PATH.exists() and not force:
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Discover each season's calendar from an anchor date ~one year apart.
    all_dates: set[str] = set()
    for offset in range(seasons):
        anchor = (date.today() - timedelta(days=365 * offset)).strftime("%Y%m%d")
        try:
            all_dates.update(_calendar_dates(anchor))
        except Exception:
            logger.warning("NBA calendar discovery failed for anchor %s", anchor)

    rows: list[dict] = []
    for ds in sorted(all_dates):
        try:
            rows.extend(_parse_day(_get(f"{SCOREBOARD}?dates={ds}")))
        except Exception:
            logger.warning("NBA fetch failed for %s; skipping", ds)

    df = pd.DataFrame(rows).drop_duplicates(subset=["date", "home_team", "away_team"])
    df.to_csv(GAMES_PATH, index=False)
    logger.info("Saved %d NBA games to %s", len(df), GAMES_PATH)


def load_games() -> pd.DataFrame:
    download_games()
    return pd.read_csv(GAMES_PATH, parse_dates=["date"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    download_games(force=True)
    print(f"NBA games cached at {GAMES_PATH}")

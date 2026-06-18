"""UFC raw data access.

Source = UFCStats.com data. UFCStats now serves a JavaScript proof-of-work
anti-bot challenge to plain HTTP clients, so we consume the canonical daily
mirror of that data rather than a brittle PoW bypass. The schema is exactly
UFCStats' own (per-round stats, results, events, tale-of-the-tape), so the
feature engineering we build on top is independent of how the bytes arrive.

A headless-browser scraper for incremental upcoming fights is a hardening task
tracked separately.
"""

import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[3] / "data"

EVENTS_CSV = DATA_DIR / "ufc_event_details.csv"
RESULTS_CSV = DATA_DIR / "ufc_fight_results.csv"
STATS_CSV = DATA_DIR / "ufc_fight_stats.csv"
TOTT_CSV = DATA_DIR / "ufc_fighter_tott.csv"

# Odds-bearing dataset, used ONLY as the market benchmark in evaluation — never
# as a model feature. Joined to our self-computed features by fighter + date.
ODDS_CSV = DATA_DIR / "ufc-master.csv"

# Upcoming fixtures (fighter names + date only). UFCStats' upcoming page is
# behind the JS challenge, so we take the fixture list from here and compute our
# OWN features for each fighter from the historical raw data.
UPCOMING_CSV = DATA_DIR / "upcoming.csv"

_BASE = "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main"
_ODDS_BASE = "https://raw.githubusercontent.com/shortlikeafox/ultimate_ufc_dataset/main"
_SOURCES = {
    EVENTS_CSV: f"{_BASE}/ufc_event_details.csv",
    RESULTS_CSV: f"{_BASE}/ufc_fight_results.csv",
    STATS_CSV: f"{_BASE}/ufc_fight_stats.csv",
    TOTT_CSV: f"{_BASE}/ufc_fighter_tott.csv",
    ODDS_CSV: f"{_ODDS_BASE}/ufc-master.csv",
    UPCOMING_CSV: f"{_ODDS_BASE}/upcoming.csv",
}


def fetch(force: bool = False) -> None:
    """Download the raw UFCStats CSVs (and the odds benchmark) into data/."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for path, url in _SOURCES.items():
        if force or not path.exists():
            urllib.request.urlretrieve(url, path)  # noqa: S310 (trusted public URLs)


def _load(path: Path):
    import pandas as pd

    if not path.exists():
        fetch()
    return pd.read_csv(path)


def load_events():
    return _load(EVENTS_CSV)


def load_results():
    return _load(RESULTS_CSV)


def load_stats():
    return _load(STATS_CSV)


def load_tott():
    return _load(TOTT_CSV)


def load_odds():
    return _load(ODDS_CSV)


def load_upcoming():
    return _load(UPCOMING_CSV)


if __name__ == "__main__":
    fetch(force=True)
    print(f"Downloaded raw UFC data into {DATA_DIR}")

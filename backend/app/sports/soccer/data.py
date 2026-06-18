"""Download international football results from the martj42 public mirror.

Source: https://github.com/martj42/international_results
One CSV: results.csv (~45k matches, 1872–present).
Gitignored; downloaded on first use.
"""

from pathlib import Path

import httpx
import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "soccer"
RESULTS_URL = (
    "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
)
RESULTS_PATH = DATA_DIR / "results.csv"


def download_results(force: bool = False) -> None:
    if RESULTS_PATH.exists() and not force:
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    resp = httpx.get(RESULTS_URL, timeout=60, follow_redirects=True,
                     headers={"User-Agent": "the-breakdown/1.0"})
    resp.raise_for_status()
    RESULTS_PATH.write_bytes(resp.content)


def load_results() -> pd.DataFrame:
    download_results()
    df = pd.read_csv(RESULTS_PATH, parse_dates=["date"])
    df["neutral"] = df["neutral"].map({"True": True, "False": False, True: True, False: False})
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")
    return df

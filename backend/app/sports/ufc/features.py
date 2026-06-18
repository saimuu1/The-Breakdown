"""Self-computed, point-in-time UFC features.

For every fight we compute each fighter's career form using ONLY fights that
happened before that date (no leakage), then take Red(home)-minus-Blue(away)
differentials. The same per-fighter computation produces the form for an
upcoming fight, so training and inference share one code path.

We deliberately use no betting odds as inputs — the market line is the benchmark
we score against, not a feature.
"""

import math
import re
import unicodedata
from collections.abc import Mapping

import numpy as np
import pandas as pd

from app.sports.ufc.data import load_tott
from app.sports.ufc.raw import build_fight_log

# Per-fighter pre-fight form. The model features are the home-minus-away diffs.
PER_FIGHTER_STATS: list[str] = [
    "win_rate",
    "win_streak",
    "loss_streak",
    "n_fights",
    "finish_rate",
    "sig_pm",  # significant strikes landed per minute
    "sig_absorbed_pm",  # significant strikes absorbed per minute
    "sig_acc",  # striking accuracy
    "sig_def",  # striking defense (1 - opp accuracy)
    "td_per15",  # takedowns landed per 15 min
    "td_acc",
    "sub_per15",  # submission attempts per 15 min
    "ctrl_frac",  # fraction of fight time in control
    "age",
    "height_cm",
    "reach_cm",
    "days_since_last",
]

FEATURE_COLUMNS: list[str] = [f"{s}_dif" for s in PER_FIGHTER_STATS]


def normalize_name(name: str) -> str:
    """Accent/case-insensitive key so ESPN names match UFCStats names."""
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


# --------------------------------------------------------------------------- #
# Tale-of-the-tape (static physical attributes)
# --------------------------------------------------------------------------- #
def _height_to_cm(value: str) -> float:
    m = re.match(r"(\d+)'\s*(\d+)", str(value))
    return (int(m[1]) * 12 + int(m[2])) * 2.54 if m else math.nan


def _reach_to_cm(value: str) -> float:
    m = re.match(r"([\d.]+)", str(value).replace('"', ""))
    return float(m[1]) * 2.54 if m and value != "--" else math.nan


def _load_tott_map() -> dict[str, dict]:
    tott = load_tott()
    tott["FIGHTER"] = tott["FIGHTER"].astype(str).str.strip()
    out: dict[str, dict] = {}
    for r in tott.itertuples(index=False):
        out[r.FIGHTER] = {
            "height_cm": _height_to_cm(r.HEIGHT),
            "reach_cm": _reach_to_cm(r.REACH),
            "dob": pd.to_datetime(r.DOB, errors="coerce"),
        }
    return out


# --------------------------------------------------------------------------- #
# Pre-fight form per (fight, fighter)
# --------------------------------------------------------------------------- #
def _empty_form() -> dict:
    return dict.fromkeys(PER_FIGHTER_STATS, math.nan)


def _form_from_accumulator(acc: dict, date, tott: dict) -> dict:
    """Build the pre-fight feature row from running totals (before this fight)."""
    n = acc["n_fights"]
    form = _empty_form()
    form["n_fights"] = float(n)
    if n > 0:
        mins = acc["fight_sec"] / 60.0 or math.nan
        form["win_rate"] = acc["wins"] / n
        form["finish_rate"] = acc["finishes"] / n
        form["win_streak"] = float(acc["win_streak"])
        form["loss_streak"] = float(acc["loss_streak"])
        form["sig_pm"] = acc["sig_landed"] / mins
        form["sig_absorbed_pm"] = acc["opp_sig_landed"] / mins
        form["sig_acc"] = acc["sig_landed"] / acc["sig_att"] if acc["sig_att"] else math.nan
        form["sig_def"] = (
            1 - acc["opp_sig_landed"] / acc["opp_sig_att"] if acc["opp_sig_att"] else math.nan
        )
        form["td_per15"] = acc["td_landed"] / mins * 15
        form["td_acc"] = acc["td_landed"] / acc["td_att"] if acc["td_att"] else math.nan
        form["sub_per15"] = acc["sub_att"] / mins * 15
        form["ctrl_frac"] = acc["ctrl_sec"] / acc["fight_sec"] if acc["fight_sec"] else math.nan
        if acc["last_date"] is not None:
            form["days_since_last"] = float((date - acc["last_date"]).days)
    if tott:
        form["height_cm"] = tott["height_cm"]
        form["reach_cm"] = tott["reach_cm"]
        if tott["dob"] is not None and not pd.isna(tott["dob"]):
            form["age"] = (date - tott["dob"]).days / 365.25
    return form


def _update_accumulator(acc: dict, row) -> None:
    acc["n_fights"] += 1
    acc["wins"] += row.won
    acc["finishes"] += int(row.won and "Decision" not in str(row.method))
    if row.won:
        acc["win_streak"] += 1
        acc["loss_streak"] = 0
    else:
        acc["loss_streak"] += 1
        acc["win_streak"] = 0
    acc["sig_landed"] += row.sig_landed
    acc["sig_att"] += row.sig_att
    acc["opp_sig_landed"] += row.opp_sig_landed
    acc["opp_sig_att"] += row.opp_sig_att
    acc["td_landed"] += row.td_landed
    acc["td_att"] += row.td_att
    acc["sub_att"] += row.sub_att
    acc["ctrl_sec"] += row.ctrl_sec
    acc["fight_sec"] += row.fight_sec
    acc["last_date"] = row.date


def _new_accumulator() -> dict:
    return {
        "n_fights": 0, "wins": 0, "finishes": 0, "win_streak": 0, "loss_streak": 0,
        "sig_landed": 0.0, "sig_att": 0.0, "opp_sig_landed": 0.0, "opp_sig_att": 0.0,
        "td_landed": 0.0, "td_att": 0.0, "sub_att": 0.0, "ctrl_sec": 0.0,
        "fight_sec": 0.0, "last_date": None,
    }


def compute_form_log(log: pd.DataFrame | None = None) -> pd.DataFrame:
    """Pre-fight form for every (fight, fighter), keyed for joining back to fights."""
    log = build_fight_log() if log is None else log
    tott_map = _load_tott_map()

    records = []
    for fighter, group in log.groupby("fighter", sort=False):
        acc = _new_accumulator()
        for row in group.sort_values("date").itertuples(index=False):
            form = _form_from_accumulator(acc, row.date, tott_map.get(fighter, {}))
            records.append({"event": row.event, "bout": row.bout, "fighter": fighter, **form})
            _update_accumulator(acc, row)
    return pd.DataFrame(records)


def _diff_from_rows(home_row, away_row) -> dict[str, float]:
    return {f"{s}_dif": getattr(home_row, s) - getattr(away_row, s) for s in PER_FIGHTER_STATS}


def build_training_frame() -> tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    """Return (X diffs, y home-win, meta[date,home,away]) for all decisive fights.

    UFCStats tends to list the winner first, so we RANDOMIZE (seeded) which
    fighter is 'home' per fight. That strips the position artifact — the model
    must learn from the stat differentials, not from who was listed first — and
    drives the base home-win rate to ~50%.
    """
    log = build_fight_log()
    form = compute_form_log(log)
    form_by_key = {(r.event, r.bout, r.fighter): r for r in form.itertuples(index=False)}
    rng = np.random.default_rng(42)

    rows, ys, meta = [], [], []
    seen = set()
    for r in log.itertuples(index=False):
        key = (r.event, r.bout)
        if key in seen:
            continue  # one row per fight; derive both sides from the bout
        seen.add(key)
        f1, f2 = r.bout.split(" vs. ") if " vs. " in r.bout else (None, None)
        if f1 is None:
            continue
        form1 = form_by_key.get((r.event, r.bout, f1))
        form2 = form_by_key.get((r.event, r.bout, f2))
        if form1 is None or form2 is None:
            continue
        f1_won = (r.fighter == f1 and r.won == 1) or (r.opponent == f1 and r.won == 0)

        if rng.random() < 0.5:
            home, away, hrow, arow, home_won = f1, f2, form1, form2, f1_won
        else:
            home, away, hrow, arow, home_won = f2, f1, form2, form1, not f1_won

        rows.append(_diff_from_rows(hrow, arow))
        ys.append(int(home_won))
        meta.append({"date": r.date, "home": home, "away": away})

    return pd.DataFrame(rows), np.array(ys), pd.DataFrame(meta)


def build_current_forms(as_of, log: pd.DataFrame | None = None) -> dict[str, dict]:
    """Each fighter's latest career form as of `as_of` — for predicting upcoming fights."""
    log = build_fight_log() if log is None else log
    tott_map = _load_tott_map()
    as_of = pd.Timestamp(as_of)

    forms: dict[str, dict] = {}
    for fighter, group in log.groupby("fighter", sort=False):
        acc = _new_accumulator()
        for row in group.sort_values("date").itertuples(index=False):
            _update_accumulator(acc, row)
        forms[fighter] = _form_from_accumulator(acc, as_of, tott_map.get(fighter, {}))
    return forms


def diff_features(
    home_form: Mapping[str, float], away_form: Mapping[str, float]
) -> dict[str, float]:
    """Home-minus-away differentials from two pre-fight form dicts."""
    return {
        f"{s}_dif": home_form.get(s, math.nan) - away_form.get(s, math.nan)
        for s in PER_FIGHTER_STATS
    }

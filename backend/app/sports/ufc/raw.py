"""Turn UFCStats' raw round-by-round CSVs into a tidy per-fighter fight log.

Output: one row per (fight, fighter), chronological, with that fighter's totals
AND the opponent's totals (so we can derive strikes absorbed / defense later).
No rolling/career stats here — that's features.py. This module only cleans and
reshapes the raw data.
"""

import re

import numpy as np
import pandas as pd

from app.sports.ufc.data import load_events, load_results, load_stats


def _parse_of(series: pd.Series) -> tuple[pd.Series, pd.Series]:
    """'23 of 38' -> (23, 38). Missing -> (0, 0)."""
    extracted = series.astype(str).str.extract(r"(\d+)\s+of\s+(\d+)")
    landed = pd.to_numeric(extracted[0], errors="coerce").fillna(0)
    attempted = pd.to_numeric(extracted[1], errors="coerce").fillna(0)
    return landed, attempted


def _ctrl_to_seconds(value: str) -> float:
    if not isinstance(value, str) or ":" not in value:
        return 0.0
    m, s = value.split(":")
    return int(m) * 60 + int(s)


def _fight_seconds(round_num, time_str: str) -> float:
    """Total fight length: completed rounds + time into the final round (5-min rounds)."""
    try:
        final_round = int(round_num)
    except (TypeError, ValueError):
        return np.nan
    secs = 0.0
    if isinstance(time_str, str) and ":" in time_str:
        m, s = time_str.split(":")
        secs = int(m) * 60 + int(s)
    return (final_round - 1) * 300 + secs


def _split_bout(bout: str) -> tuple[str, str]:
    parts = re.split(r"\s+vs\.?\s+", str(bout))
    if len(parts) != 2:
        return ("", "")
    return parts[0].strip(), parts[1].strip()


def build_fight_log() -> pd.DataFrame:
    """One chronological row per (fight, fighter) with self + opponent totals."""
    stats = load_stats().copy()
    results = load_results().copy()
    events = load_events()[["EVENT", "DATE"]].copy()

    # The source has inconsistent trailing whitespace on EVENT/BOUT/FIGHTER,
    # which silently breaks joins. Normalize all join keys up front.
    for df, cols in (
        (stats, ["EVENT", "BOUT", "FIGHTER"]),
        (results, ["EVENT", "BOUT"]),
        (events, ["EVENT"]),
    ):
        for c in cols:
            df[c] = df[c].astype(str).str.strip()

    # --- aggregate per-round stats up to per (fight, fighter) totals ----------
    stats["sig_landed"], stats["sig_att"] = _parse_of(stats["SIG.STR."])
    stats["td_landed"], stats["td_att"] = _parse_of(stats["TD"])
    stats["sub_att"] = pd.to_numeric(stats["SUB.ATT"], errors="coerce").fillna(0)
    stats["kd"] = pd.to_numeric(stats["KD"], errors="coerce").fillna(0)
    stats["ctrl_sec"] = stats["CTRL"].map(_ctrl_to_seconds)

    agg = (
        stats.groupby(["EVENT", "BOUT", "FIGHTER"], as_index=False)
        .agg(
            sig_landed=("sig_landed", "sum"),
            sig_att=("sig_att", "sum"),
            td_landed=("td_landed", "sum"),
            td_att=("td_att", "sum"),
            sub_att=("sub_att", "sum"),
            kd=("kd", "sum"),
            ctrl_sec=("ctrl_sec", "sum"),
        )
    )

    # --- results: winner, method, fight length, date -------------------------
    results = results[results["OUTCOME"].isin(["W/L", "L/W"])].copy()
    results[["f1", "f2"]] = results["BOUT"].map(_split_bout).apply(pd.Series)
    results["winner"] = np.where(results["OUTCOME"] == "W/L", results["f1"], results["f2"])
    results["fight_sec"] = [
        _fight_seconds(r, t) for r, t in zip(results["ROUND"], results["TIME"], strict=True)
    ]
    results = results.merge(events, on="EVENT", how="left")
    results["date"] = pd.to_datetime(results["DATE"], errors="coerce")
    results = results.dropna(subset=["date"])

    # --- assemble per-(fight, fighter) rows, attaching the opponent ----------
    rows = []
    keep = ["EVENT", "BOUT", "f1", "f2", "winner", "METHOD", "fight_sec", "date"]
    by_fight = {(e, b): g for (e, b), g in agg.groupby(["EVENT", "BOUT"])}
    for r in results[keep].itertuples(index=False):
        fight_stats = by_fight.get((r.EVENT, r.BOUT))
        if fight_stats is None:
            continue
        by_name = {row["FIGHTER"]: row for _, row in fight_stats.iterrows()}
        for me, opp in ((r.f1, r.f2), (r.f2, r.f1)):
            s, o = by_name.get(me), by_name.get(opp)
            if s is None or o is None:
                continue
            rows.append(
                {
                    "date": r.date,
                    "event": r.EVENT,
                    "bout": r.BOUT,
                    "fighter": me,
                    "opponent": opp,
                    "won": int(me == r.winner),
                    "method": r.METHOD,
                    "fight_sec": r.fight_sec,
                    "sig_landed": s["sig_landed"],
                    "sig_att": s["sig_att"],
                    "td_landed": s["td_landed"],
                    "td_att": s["td_att"],
                    "sub_att": s["sub_att"],
                    "kd": s["kd"],
                    "ctrl_sec": s["ctrl_sec"],
                    "opp_sig_landed": o["sig_landed"],
                    "opp_sig_att": o["sig_att"],
                    "opp_td_landed": o["td_landed"],
                    "opp_td_att": o["td_att"],
                }
            )

    log = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    return log

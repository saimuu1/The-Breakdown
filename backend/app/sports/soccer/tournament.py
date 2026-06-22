"""Tournament-aware World Cup match model.

Same philosophy as the NBA playoff model, adapted to international football and a
three-way outcome. It balances long-term team quality with what's actually
happened in the tournament, and — crucially — stays conservative: a single upset
should nudge, not redefine, a team's strength.

  PRE-TOURNAMENT STRENGTH (frozen before the first WC match)
    - international ELO (importance- and margin-weighted, 1872->now)
    - recent form / offensive / defensive  (the trained soccer model)
    - tournament experience (career World Cup appearances)

  IN-TOURNAMENT FORM (from this WC's results so far)
    - performance vs pre-tournament expectation (folds in quality of opposition)
    - goal difference

  BLEND by round, so results matter more the deeper the tournament goes:
    Group 70/30 · R16 60/40 · QF 50/50 · SF 40/60 · Final 35/65.

Spec factors with no data in our scores-only dataset — squad quality, manager
rating, expected goals, injuries/suspensions, key-player form, tactical
effectiveness — are omitted rather than fabricated, and weights re-normalised.
Three-way {home, draw, away}, point-in-time (a match uses only earlier matches).
"""

import math
from collections.abc import Mapping

import pandas as pd

MODEL_VERSION = "wc2026-v1"
TOURNAMENT_START = "2026-06-11"  # first 2026 World Cup match; ELO frozen before it

ELO_BASE = 1500.0
ELO_HOME_ADV = 65.0  # non-neutral home edge, in ELO points
DRAW_BASE = 0.28     # peak draw rate (evenly matched)
DRAW_SCALE = 300.0   # ELO gap at which draw rate falls to ~37% of peak

# Pre-tournament convex weights, re-normalised over computable factors
# (ELO 25 / form+off+def 35 / experience 10  ->  .36 / .50 / .14).
W_ELO, W_FORM, W_EXP = 0.36, 0.50, 0.14

# In-tournament performance -> ELO-point rating.
PERF_PTS_SCALE = 80.0   # ELO per point above expectation, per game
PERF_GD_SCALE = 25.0    # ELO per goal of differential, per game
EXP_TO_ELO = 1.5        # ELO per extra World Cup appearance

# Round -> (pre-tournament weight, in-tournament weight).
ROUND_BLEND = {
    "group": (0.70, 0.30),
    "r16": (0.60, 0.40),
    "qf": (0.50, 0.50),
    "sf": (0.40, 0.60),
    "final": (0.35, 0.65),
}

# Match importance -> ELO K factor (World-Football-Elo style).
_FRIENDLY_K = 20.0
_QUAL_K = 40.0
_CONTINENTAL_K = 50.0
_WORLD_CUP_K = 60.0


def _importance_k(tournament: str) -> float:
    t = (tournament or "").lower()
    if "friendly" in t:
        return _FRIENDLY_K
    if "qualification" in t or "qualifying" in t:
        return _QUAL_K
    if "world cup" in t:
        return _WORLD_CUP_K
    if any(x in t for x in ("euro", "copa américa", "copa america", "cup of nations", "asian cup")):
        return _CONTINENTAL_K
    return _QUAL_K


def _mov_multiplier(margin: int) -> float:
    """Goal-difference index — bigger wins move ratings more, with diminishing returns."""
    if margin <= 1:
        return 1.0
    if margin == 2:
        return 1.5
    return (11 + margin) / 8.0


def _expected(rating_diff: float) -> float:
    return 1.0 / (1.0 + 10 ** (-rating_diff / 400.0))


def compute_elo(results: pd.DataFrame, before: str = TOURNAMENT_START) -> dict[str, float]:
    """International ELO for every team using matches that finished before `before`."""
    df = (
        results[results["date"] < pd.Timestamp(before)]
        .dropna(subset=["home_score", "away_score"])
        .sort_values("date")
    )
    elo: dict[str, float] = {}
    for r in df.itertuples():
        h, a = r.home_team, r.away_team
        eh = elo.get(h, ELO_BASE)
        ea = elo.get(a, ELO_BASE)
        adv = 0.0 if bool(getattr(r, "neutral", False)) else ELO_HOME_ADV
        exp_home = _expected(eh + adv - ea)
        hs, as_ = float(r.home_score), float(r.away_score)
        result_home = 1.0 if hs > as_ else (0.5 if hs == as_ else 0.0)
        k = _importance_k(getattr(r, "tournament", "")) * _mov_multiplier(int(abs(hs - as_)))
        delta = k * (result_home - exp_home)
        elo[h] = eh + delta
        elo[a] = ea - delta
    return elo


def wc_experience(results: pd.DataFrame, before: str = TOURNAMENT_START) -> dict[str, int]:
    """Career World Cup (finals) appearances per team before `before`."""
    df = results[
        (results["date"] < pd.Timestamp(before))
        & (results["tournament"].str.lower() == "fifa world cup")
    ]
    counts: dict[str, int] = {}
    for r in df.itertuples():
        counts[r.home_team] = counts.get(r.home_team, 0) + 1
        counts[r.away_team] = counts.get(r.away_team, 0) + 1
    return counts


def elo_to_3way(rating_diff: float) -> dict[str, float]:
    """Map a home-minus-away rating gap to {home, draw, away}. Draw probability
    peaks when the teams are level and decays as the gap grows."""
    p_home_core = _expected(rating_diff)
    draw = DRAW_BASE * math.exp(-((rating_diff / DRAW_SCALE) ** 2))
    home = (1 - draw) * p_home_core
    away = (1 - draw) * (1 - p_home_core)
    return {"home": home, "draw": draw, "away": away}


def _blend3(a: Mapping[str, float], b: Mapping[str, float], wa: float) -> dict[str, float]:
    """Convex blend of two outcome distributions (wa on `a`)."""
    wb = 1 - wa
    return {k: wa * a[k] + wb * b[k] for k in ("home", "draw", "away")}


def round_for(prior_wc_matches: int) -> str:
    """Round of a team's (prior_wc_matches + 1)-th match: 1-3 group, then knockouts."""
    n = prior_wc_matches + 1
    if n <= 3:
        return "group"
    return {4: "r16", 5: "qf", 6: "sf", 7: "final"}.get(n, "final")


def pre_tournament_3way(
    home: str,
    away: str,
    elo: Mapping[str, float],
    form_probs: Mapping[str, float],
    experience: Mapping[str, int],
) -> dict[str, float]:
    """Baseline expectation: ELO + the trained form model + experience."""
    p_elo = elo_to_3way(elo.get(home, ELO_BASE) - elo.get(away, ELO_BASE))
    exp_diff = (experience.get(home, 0) - experience.get(away, 0)) * EXP_TO_ELO
    p_exp = elo_to_3way(exp_diff)
    blended = {
        k: W_ELO * p_elo[k] + W_FORM * form_probs[k] + W_EXP * p_exp[k]
        for k in ("home", "draw", "away")
    }
    total = sum(blended.values())
    return {k: v / total for k, v in blended.items()}


def performance_rating(
    matches: list[dict], elo: Mapping[str, float]
) -> float | None:
    """A team's in-tournament rating (ELO points) from its WC results so far.

    Each match contributes (actual points - points expected from pre-tournament
    ELO) — so beating strong opponents counts more than beating weak ones — plus
    a goal-difference term. None if the team hasn't played yet.
    """
    if not matches:
        return None
    perf = 0.0
    for m in matches:
        gf, ga, opp = m["gf"], m["ga"], m["opp"]
        actual = 3.0 if gf > ga else (1.0 if gf == ga else 0.0)
        expected_pts = 3.0 * _expected(elo.get(m["team"], ELO_BASE) - elo.get(opp, ELO_BASE))
        perf += PERF_PTS_SCALE * (actual - expected_pts) + PERF_GD_SCALE * (gf - ga)
    return perf / len(matches)


def wc_match_prob(
    home: str,
    away: str,
    elo: Mapping[str, float],
    form_probs: Mapping[str, float],
    experience: Mapping[str, int],
    home_wc_matches: list[dict],
    away_wc_matches: list[dict],
) -> dict[str, float]:
    """Three-way {home, draw, away} for one World Cup match.

    `*_wc_matches` are this team's earlier WC results (each {team, opp, gf, ga}).
    Round (hence the blend weight) is set by how many matches the teams have
    already played. With no tournament games yet, it's pure pre-tournament.
    """
    p_pre = pre_tournament_3way(home, away, elo, form_probs, experience)

    perf_home = performance_rating(home_wc_matches, elo)
    perf_away = performance_rating(away_wc_matches, elo)
    if perf_home is None and perf_away is None:
        return p_pre

    p_perf = elo_to_3way((perf_home or 0.0) - (perf_away or 0.0))
    rnd = round_for(max(len(home_wc_matches), len(away_wc_matches)))
    w_pre, _ = ROUND_BLEND[rnd]
    return _blend3(p_pre, p_perf, w_pre)

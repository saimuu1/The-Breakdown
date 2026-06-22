"""Series-aware NBA playoff game-rating model.

Built from game results only (the data we have). It captures the core idea that a
playoff series teaches you about the matchup: Game 5 is not Game 1.

Each game's win probability blends two views, in log-odds space:

  PRE-SERIES STRENGTH (what we expected before the series)
    - ELO / power rating (replayed over the season, frozen at series start)
    - season net rating (avg point differential)
    - home court (this game's venue)

  IN-SERIES FORM (what has actually happened so far in THIS series)
    - series record (wins so far)
    - series net rating / avg point differential
    - home court (this game's venue)

  FINAL = Game 1: 100% pre-series; Game >=2: 40% pre-series + 60% in-series.

Factors from the fuller spec that our dataset can't support — individual star
ratings, team health/injuries, coaching grades, rotation, multi-year playoff
experience — are intentionally omitted rather than fabricated, and the remaining
weights are re-normalised. Everything here is point-in-time (a game's inputs use
only games that finished before it), so the probabilities are honest hindsight-
free predictions.
"""

import math
from collections import defaultdict
from collections.abc import Iterable, Mapping

MODEL_VERSION = "nba-playoff-v1"

# ELO
ELO_BASE = 1500.0
ELO_K = 20.0
ELO_HOME_ADV = 100.0  # home-court worth in ELO points, used during updates

# Logistic scales (points / games -> win-prob steepness)
NET_SCALE = 6.0      # season net-rating differential
MARGIN_SCALE = 7.0   # in-series avg point differential
RECORD_SCALE = 1.2   # in-series wins differential
HOME_P = 0.60        # standalone home-court win prob

# Pre-series weights, re-normalised over the factors we can compute
# (ELO 30% / net 15% / home 5% -> 0.60 / 0.30 / 0.10).
W_PRE = {"elo": 0.60, "net": 0.30, "home": 0.10}

# In-series weights, re-normalised (record 15% / series-net 20% / avg-diff 10% /
# home-remaining 10% -> 0.27 / 0.36 / 0.18 / 0.18). Series-net and avg point diff
# are the same signal given our data, so they're merged onto the margin term.
W_SERIES = {"record": 0.27, "margin": 0.55, "home": 0.18}

# Blend of the two views once a series is underway.
PRE_WEIGHT = 0.40
SERIES_WEIGHT = 0.60


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _logit(p: float) -> float:
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def _elo_expected(diff: float) -> float:
    """Win prob for a rating advantage of `diff` ELO points."""
    return 1.0 / (1.0 + 10 ** (-diff / 400.0))


class Game:
    """A finished game: the minimum we need from a results row."""

    __slots__ = ("date", "home", "away", "home_score", "away_score")

    def __init__(self, date: str, home: str, away: str, hs: float, as_: float) -> None:
        self.date = date
        self.home = home
        self.away = away
        self.home_score = hs
        self.away_score = as_


def compute_elo(games: Iterable[Game], before: str) -> dict[str, float]:
    """ELO for every team using only games that finished before `before` (ISO date)."""
    elo: dict[str, float] = defaultdict(lambda: ELO_BASE)
    for g in sorted((x for x in games if x.date < before), key=lambda x: x.date):
        eh, ea = elo[g.home], elo[g.away]
        exp_home = _elo_expected(eh + ELO_HOME_ADV - ea)
        actual_home = 1.0 if g.home_score > g.away_score else 0.0
        delta = ELO_K * (actual_home - exp_home)
        elo[g.home] = eh + delta
        elo[g.away] = ea - delta
    return dict(elo)


def season_net_rating(games: Iterable[Game], before: str) -> dict[str, float]:
    """Each team's average point differential over games before `before`."""
    totals: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)
    for g in (x for x in games if x.date < before):
        totals[g.home] += g.home_score - g.away_score
        counts[g.home] += 1
        totals[g.away] += g.away_score - g.home_score
        counts[g.away] += 1
    return {t: totals[t] / counts[t] for t in totals if counts[t]}


def pre_series_prob(
    elo: Mapping[str, float], net: Mapping[str, float], home: str, away: str
) -> float:
    """P(home win) from frozen pre-series strength."""
    p_elo = _elo_expected(elo.get(home, ELO_BASE) - elo.get(away, ELO_BASE))
    p_net = _sigmoid((net.get(home, 0.0) - net.get(away, 0.0)) / NET_SCALE)
    logit = (
        W_PRE["elo"] * _logit(p_elo)
        + W_PRE["net"] * _logit(p_net)
        + W_PRE["home"] * _logit(HOME_P)
    )
    return _sigmoid(logit)


def series_state(prior: list[Game], home: str, away: str) -> tuple[int, float]:
    """From the series games already played, return (home_wins - away_wins,
    home's average point differential), oriented to the CURRENT home team."""
    record = 0
    margins: list[float] = []
    for g in prior:
        if g.home == home:
            hp, ap = g.home_score, g.away_score
        else:  # current home team was the away side in that game
            hp, ap = g.away_score, g.home_score
        margins.append(hp - ap)
        record += 1 if hp > ap else -1
    avg_margin = sum(margins) / len(margins) if margins else 0.0
    return record, avg_margin


def in_series_prob(record_diff: int, avg_margin: float) -> float:
    """P(home win) from in-series form (current home team's perspective)."""
    p_record = _sigmoid(record_diff / RECORD_SCALE)
    p_margin = _sigmoid(avg_margin / MARGIN_SCALE)
    logit = (
        W_SERIES["record"] * _logit(p_record)
        + W_SERIES["margin"] * _logit(p_margin)
        + W_SERIES["home"] * _logit(HOME_P)
    )
    return _sigmoid(logit)


def playoff_game_prob(
    elo: Mapping[str, float],
    net: Mapping[str, float],
    home: str,
    away: str,
    prior_series_games: list[Game],
) -> dict[str, float]:
    """Blended {home, away} win probabilities for a single playoff game.

    `prior_series_games` are the games of THIS series that finished before this
    one. Empty (Game 1) -> pure pre-series strength; otherwise 40/60 pre/in-series.
    """
    p_pre = pre_series_prob(elo, net, home, away)
    if not prior_series_games:
        p_home = p_pre
    else:
        record, margin = series_state(prior_series_games, home, away)
        p_series = in_series_prob(record, margin)
        p_home = _sigmoid(PRE_WEIGHT * _logit(p_pre) + SERIES_WEIGHT * _logit(p_series))
    return {"home": p_home, "away": 1.0 - p_home}

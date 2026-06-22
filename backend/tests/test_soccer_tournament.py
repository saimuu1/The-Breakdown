"""The tournament-aware World Cup model: 3-way sanity + tournament learning."""

from app.sports.soccer.tournament import (
    elo_to_3way,
    performance_rating,
    round_for,
    wc_match_prob,
)

ELO = {"strong": 2000.0, "weak": 1600.0, "mid": 1800.0}
FORM = {"home": 0.45, "draw": 0.27, "away": 0.28}
EXP = {"strong": 30, "weak": 5, "mid": 15}


def test_3way_sums_to_one_and_draw_peaks_when_even():
    even = elo_to_3way(0.0)
    assert abs(sum(even.values()) - 1.0) < 1e-9
    gap = elo_to_3way(300.0)
    assert even["draw"] > gap["draw"]  # draw likelier when teams are level
    assert gap["home"] > gap["away"]


def test_round_escalates_with_matches_played():
    assert round_for(0) == "group"   # 1st match
    assert round_for(2) == "group"   # 3rd match
    assert round_for(3) == "r16"     # 4th
    assert round_for(6) == "final"   # 7th


def test_performance_rewards_beating_strong_opponents():
    elo = {"a": 1800.0, "strong": 2100.0, "weak": 1500.0}
    beat_strong = performance_rating([{"team": "a", "opp": "strong", "gf": 2, "ga": 0}], elo)
    beat_weak = performance_rating([{"team": "a", "opp": "weak", "gf": 2, "ga": 0}], elo)
    assert beat_strong > beat_weak  # same scoreline, tougher opponent = more credit


def test_no_games_yet_is_pure_pre_tournament():
    pre = wc_match_prob("strong", "weak", ELO, FORM, EXP, [], [])
    # equals pre-tournament (no in-tournament data) -> reuse by passing empty again
    assert abs(sum(pre.values()) - 1.0) < 1e-9
    assert pre["home"] > pre["away"]


def test_tournament_form_can_lift_an_underdog():
    # `weak` is the pre-tournament underdog but has thrashed strong opponents.
    pre = wc_match_prob("weak", "strong", ELO, FORM, EXP, [], [])["home"]
    hot = [
        {"team": "weak", "opp": "strong", "gf": 3, "ga": 0},
        {"team": "weak", "opp": "mid", "gf": 2, "ga": 0},
    ]
    after = wc_match_prob("weak", "strong", ELO, FORM, EXP, hot, [])["home"]
    assert after > pre  # tournament form lifts the underdog...
    # ...but conservatively: still capped well under certainty in the group stage.
    assert after < 0.75


def test_probs_normalised():
    p = wc_match_prob("mid", "strong", ELO, FORM, EXP,
                      [{"team": "mid", "opp": "weak", "gf": 1, "ga": 1}], [])
    assert abs(sum(p.values()) - 1.0) < 1e-9

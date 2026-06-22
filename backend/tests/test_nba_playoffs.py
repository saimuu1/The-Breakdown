"""The series-aware playoff model: ELO sanity + game-by-game learning."""

from app.sports.nba.playoffs import (
    Game,
    compute_elo,
    playoff_game_prob,
    pre_series_prob,
    season_net_rating,
)


def _season(winner: str, loser: str, n: int = 30) -> list[Game]:
    """`winner` beats `loser` n times across a fake season (distinct dates)."""
    return [Game(f"2026-01-{(i % 27) + 1:02d}", winner, loser, 110, 100) for i in range(n)]


def test_elo_rewards_winning():
    games = _season("A", "B")
    elo = compute_elo(games, before="2026-04-18")
    assert elo["A"] > elo["B"]


def test_net_rating_tracks_margin():
    games = _season("A", "B")
    net = season_net_rating(games, before="2026-04-18")
    assert net["A"] > 0 > net["B"]


def test_game1_is_pure_pre_series():
    games = _season("A", "B")
    elo = compute_elo(games, before="2026-04-18")
    net = season_net_rating(games, before="2026-04-18")
    blended = playoff_game_prob(elo, net, "A", "B", prior_series_games=[])["home"]
    assert abs(blended - pre_series_prob(elo, net, "A", "B")) < 1e-9


def test_series_form_overrides_pre_series():
    # B was the weaker team all season, but is now up 2-0 with big wins.
    games = _season("A", "B")
    elo = compute_elo(games, before="2026-04-18")
    net = season_net_rating(games, before="2026-04-18")

    pre = playoff_game_prob(elo, net, "B", "A", [])["home"]  # B at home, no series yet
    prior = [
        Game("2026-04-18", "B", "A", 120, 100),
        Game("2026-04-20", "B", "A", 118, 99),
    ]
    after = playoff_game_prob(elo, net, "B", "A", prior)["home"]
    # Going 2-0 with +19 margins should lift B's game-3 probability above the
    # pre-series number that had B as the underdog.
    assert after > pre


def test_probs_sum_to_one():
    games = _season("A", "B")
    elo = compute_elo(games, before="2026-04-18")
    net = season_net_rating(games, before="2026-04-18")
    p = playoff_game_prob(elo, net, "A", "B", [Game("2026-04-18", "A", "B", 110, 90)])
    assert abs(p["home"] + p["away"] - 1.0) < 1e-9

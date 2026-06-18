"""Tests for ESPN scoreboard leaders extraction (no network)."""

from app.integrations.espn_leaders import (
    leaders_from_competition,
    leaders_to_context,
)


def _competition() -> dict:
    def comp(side, athlete, pts):
        return {
            "homeAway": side,
            "leaders": [
                {"name": "points", "displayName": "Points",
                 "leaders": [{"displayValue": pts, "athlete": {"displayName": athlete}}]},
                {"name": "rating", "displayName": "Rating",
                 "leaders": [{"displayValue": "30.1", "athlete": {"displayName": athlete}}]},
            ],
        }

    return {"competitors": [
        comp("home", "Dylan Harper", "25"),
        comp("away", "Jalen Brunson", "31"),
    ]}


def test_extracts_named_leaders_and_skips_rating():
    leaders = leaders_from_competition(_competition())
    assert leaders is not None
    assert leaders["home"] == ["Dylan Harper (25 points)"]
    assert leaders["away"] == ["Jalen Brunson (31 points)"]
    # 'rating' is intentionally excluded.
    assert all("rating" not in s for s in leaders["home"])


def test_none_when_no_leaders():
    assert leaders_from_competition({"competitors": [{"homeAway": "home"}]}) is None


def test_context_lines_name_the_teams():
    leaders = {"home": ["Dylan Harper (25 points)"], "away": ["Jalen Brunson (31 points)"]}
    lines = leaders_to_context(leaders, "Spurs", "Knicks")
    assert lines == [
        "Spurs key players: Dylan Harper (25 points)",
        "Knicks key players: Jalen Brunson (31 points)",
    ]
    assert leaders_to_context(None, "A", "B") == []

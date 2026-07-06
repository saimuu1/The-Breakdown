"""Real current-squad rosters for World Cup national teams, from ESPN.

The persona names players, but ESPN's international scoreboard carries no per-team
leaders — so without grounding the model invents names from stale training data
(e.g. naming a coach who left years ago). Here we pull each team's actual current
squad from ESPN's teams/roster endpoints so a write-up can name only real,
currently-selected players.

Note: ESPN's `coach` field for national teams is unreliable (it returns historical
names — Argentina's came back as Sabella/Maradona), so we deliberately ignore it
and the persona is told not to name coaches at all.
"""

import logging
import unicodedata

import httpx

logger = logging.getLogger(__name__)

_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams"
_ROSTER_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/{id}/roster"
_HEADERS = {"User-Agent": "the-breakdown/1.0"}

# Surface attackers first — an analyst names strikers and creators, not the
# third-choice goalkeeper.
_POS_RANK = {"F": 0, "M": 1, "D": 2, "G": 3}

_team_ids: dict[str, str] | None = None  # normalized team name -> ESPN id (cached)
_squad_cache: dict[str, list[str]] = {}  # normalized team name -> player names (cached)


def _norm(name: str) -> str:
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


def _get(url: str) -> dict | None:
    try:
        r = httpx.get(url, headers=_HEADERS, timeout=15, follow_redirects=True)
        r.raise_for_status()
        return r.json()
    except (httpx.HTTPError, ValueError):
        logger.warning("ESPN roster fetch failed: %s", url)
        return None


def _load_team_ids() -> dict[str, str]:
    """{normalized team name -> ESPN team id} for the 48 WC teams (fetched once)."""
    global _team_ids
    if _team_ids is not None:
        return _team_ids
    _team_ids = {}
    data = _get(_TEAMS_URL)
    try:
        for t in data["sports"][0]["leagues"][0]["teams"]:  # type: ignore[index]
            tm = t.get("team", {})
            if tm.get("id") and tm.get("displayName"):
                _team_ids[_norm(tm["displayName"])] = str(tm["id"])
    except (KeyError, IndexError, TypeError):
        if data is not None:
            logger.warning("unexpected ESPN teams payload shape")
    return _team_ids


def squad(team_name: str, limit: int = 10) -> list[str]:
    """Real current-squad player names for a WC team, attackers first.

    Returns [] for a team we can't resolve (e.g. a bracket placeholder like
    'Winner Group A') or if ESPN is unavailable — the persona then speaks in
    general terms rather than naming anyone.
    """
    key = _norm(team_name)
    if key in _squad_cache:
        return _squad_cache[key][:limit]
    tid = _load_team_ids().get(key)
    if not tid:
        _squad_cache[key] = []
        return []
    data = _get(_ROSTER_URL.format(id=tid))
    ranked: list[tuple[int, str]] = []
    for a in (data or {}).get("athletes", []) or []:
        name = a.get("displayName") or a.get("fullName")
        if not name:
            continue
        pos = (a.get("position") or {}).get("abbreviation") or ""
        ranked.append((_POS_RANK.get(pos, 2), name))
    ranked.sort(key=lambda x: x[0])
    names = [n for _, n in ranked]
    _squad_cache[key] = names
    return names[:limit]


def squads_context(home: str, away: str) -> list[str]:
    """Prompt lines listing each side's real current squad, so the persona names
    only real, currently-selected players (never invented ones)."""
    lines: list[str] = []
    for team in (home, away):
        players = squad(team)
        if players:
            lines.append(
                f"{team} current squad (name ONLY these real players, never others): "
                + ", ".join(players)
            )
    return lines

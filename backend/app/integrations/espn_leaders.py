"""Extract per-team statistical leaders from an ESPN scoreboard competition.

ESPN already embeds a `leaders` array on each competitor in the scoreboard
payload we fetch (NBA: points/rebounds/assists with the player + value), so we
get named key players for free without an extra request. Soccer's free feed
often omits these — we simply return what's present and the persona omits the
rest. This is what lets the write-up say "Harper dropped 25" instead of staying
generic.
"""

# Categories worth surfacing, in priority order; "rating" etc. are skipped.
_KEEP = ("points", "goals", "assists", "rebounds", "goalAssists")


def _competitor_leaders(competitor: dict, limit: int = 3) -> list[str]:
    out: list[str] = []
    cats = {c.get("name"): c for c in competitor.get("leaders", []) if c.get("name")}
    for key in _KEEP:
        cat = cats.get(key)
        if not cat:
            continue
        entries = cat.get("leaders") or []
        if not entries:
            continue
        e0 = entries[0]
        athlete = (e0.get("athlete") or {}).get("displayName")
        value = e0.get("displayValue")
        label = (cat.get("displayName") or key).lower()
        if athlete and value:
            out.append(f"{athlete} ({value} {label})")
        if len(out) >= limit:
            break
    return out


def leaders_from_competition(comp: dict) -> dict | None:
    """Return {"home": [...], "away": [...]} of "Player (value stat)" strings, or None."""
    home: list[str] = []
    away: list[str] = []
    for c in comp.get("competitors", []):
        entries = _competitor_leaders(c)
        if c.get("homeAway") == "home":
            home = entries
        elif c.get("homeAway") == "away":
            away = entries
    if not home and not away:
        return None
    return {"home": home, "away": away}


def leaders_to_context(
    leaders: dict | None, home_name: str, away_name: str
) -> list[str]:
    """Flatten a leaders blob into prompt lines the persona can name players from."""
    if not leaders:
        return []
    lines: list[str] = []
    if leaders.get("home"):
        lines.append(f"{home_name} key players: " + ", ".join(leaders["home"]))
    if leaders.get("away"):
        lines.append(f"{away_name} key players: " + ", ".join(leaders["away"]))
    return lines

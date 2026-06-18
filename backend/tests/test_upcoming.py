import app.sports.ufc.upcoming as upcoming_mod
from app.sports.ufc.upcoming import fetch_upcoming_bouts

SAMPLE = {
    "events": [
        {
            "date": "2026-06-20T21:00Z",
            "name": "UFC Fight Night",
            "competitions": [
                {
                    "status": {"type": {"state": "pre"}},
                    "competitors": [
                        {"athlete": {"displayName": "Manel Kape"}},
                        {"athlete": {"displayName": "Kyoji Horiguchi"}},
                    ],
                },
                {
                    # Already started — must be excluded.
                    "status": {"type": {"state": "in"}},
                    "competitors": [
                        {"athlete": {"displayName": "X"}},
                        {"athlete": {"displayName": "Y"}},
                    ],
                },
                {
                    # Malformed (one competitor) — skipped, not a crash.
                    "status": {"type": {"state": "pre"}},
                    "competitors": [{"athlete": {"displayName": "Solo"}}],
                },
            ],
        }
    ]
}


def test_parses_only_upcoming_valid_bouts(monkeypatch):
    monkeypatch.setattr(upcoming_mod, "_get", lambda url: SAMPLE)
    bouts = fetch_upcoming_bouts()
    assert len(bouts) == 1
    b = bouts[0]
    assert b["home"] == "Manel Kape" and b["away"] == "Kyoji Horiguchi"
    assert b["date"] == "2026-06-20"
    assert b["starts_at"] == "2026-06-20T21:00Z"


def test_fetch_failure_degrades_to_empty(monkeypatch):
    def boom(url):
        raise RuntimeError("network down")

    monkeypatch.setattr(upcoming_mod, "_get", boom)
    assert fetch_upcoming_bouts() == []  # resilient: no crash, empty result

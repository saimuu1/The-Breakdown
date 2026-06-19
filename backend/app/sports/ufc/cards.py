"""Identify the UFC main card from an ESPN event's competitions.

ESPN groups every bout on a card (early prelims, prelims, main card) under one
event, and the free scoreboard feed carries no explicit segment flag. We infer
the main card two ways, in order of reliability:

1. Start time — the main card always starts after the prelims. When the bouts
   carry more than one distinct start time (typical for *upcoming* cards), the
   main card is the latest-starting batch.
2. Listing order — ESPN lists bouts prelims-first, main-event-last. For
   *completed* cards ESPN collapses every bout to a single start time, so we fall
   back to the last `MAIN_CARD_SIZE` bouts (the modern main-card size).
"""

MAIN_CARD_SIZE = 5


def select_main_card(competitions: list[dict]) -> list[dict]:
    """Return only the main-card competitions from an ESPN event's bouts."""
    if not competitions:
        return []
    starts = [c.get("startDate") or c.get("date") for c in competitions]
    distinct = {s for s in starts if s}
    if len(distinct) > 1:
        latest = max(distinct)
        return [c for c, s in zip(competitions, starts, strict=True) if s == latest]
    return competitions[-MAIN_CARD_SIZE:]

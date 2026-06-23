"""Regenerate cached persona write-ups IN PLACE to the current PERSONA_VERSION.

    python -m scripts.regenerate_analysis [--sport soccer|ufc|nba]
                                          [--timeframe upcoming|past|all]
                                          [--limit N] [--dry-run]

Unlike `app.workers.ingest`, this NEVER re-predicts, never creates rows, and
never changes `model_version` — it only fills/refreshes `analysis` +
`analysis_version` on existing prediction rows. That matters for soccer, whose
rows are `wc2026-v1` (the tournament model); ingest would write a second
`soccer-v1` row and duplicate the match. Here we reuse each row's stored probs.

Idempotent: rows already at PERSONA_VERSION are skipped, so re-runs only fill
gaps. Upcoming is processed before past (that's what users see first), and
`--limit` bounds how many LLM calls a single run makes — handy against the Groq
free-tier daily quota. On the first unrecoverable LLM error (e.g. quota
exhausted after the client's own retries) the run stops cleanly and reports how
far it got; everything written so far is durable.
"""

import argparse
import logging
import sys
import time

from app.config import get_settings
from app.integrations.espn_leaders import leaders_to_context
from app.llm.client import get_llm_client
from app.llm.persona import PERSONA_VERSION
from app.repositories.supabase_repo import SupabaseRepository
from app.services.analysis_service import generate_analysis
from app.sports.base import RawMatch, all_adapters

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("regen-analysis")

_THROTTLE_SECONDS = 2.0


def _register_adapters() -> dict:
    import app.sports.nba.adapter  # noqa: F401
    import app.sports.soccer.adapter  # noqa: F401
    import app.sports.ufc.adapter  # noqa: F401

    return {a.sport: a for a in all_adapters()}


def _paginate(query_fn) -> list[dict]:
    """Collect every row from a PostgREST query, past the 1000-row cap."""
    rows: list[dict] = []
    start = 0
    while True:
        batch = query_fn(start, start + 999)
        rows += batch
        if len(batch) < 1000:
            return rows
        start += 1000


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sport", choices=["soccer", "ufc", "nba"], help="limit to one sport")
    parser.add_argument(
        "--timeframe", choices=["upcoming", "past", "all"], default="all",
        help="which matches to regenerate (default: all, upcoming first)",
    )
    parser.add_argument("--limit", type=int, default=0, help="max LLM calls this run (0 = no cap)")
    parser.add_argument("--dry-run", action="store_true", help="list what would regenerate, no LLM")
    args = parser.parse_args()

    if not get_settings().llm_api_key:
        logger.error("LLM_API_KEY not set — nothing to do")
        return 1

    adapters = _register_adapters()
    repo = SupabaseRepository()
    db = repo._db  # noqa: SLF001 — maintenance script
    nowiso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())

    # Map league_id -> sport so we can attribute each prediction to an adapter.
    leagues = db.table("leagues").select("id, sport_id").execute().data
    league_sport = {row["id"]: row["sport_id"] for row in leagues}

    # Pull predictions that still need work (not yet at the current persona).
    preds = _paginate(
        lambda lo, hi: db.table("predictions")
        .select("id, match_id, probs, analysis_version")
        .neq("analysis_version", PERSONA_VERSION)
        .range(lo, hi)
        .execute()
        .data
    )

    # Match metadata + features for those rows.
    matches = _paginate(
        lambda lo, hi: db.table("matches")
        .select(
            "id, league_id, starts_at, context,"
            "home:competitors!matches_home_id_fkey(name),"
            "away:competitors!matches_away_id_fkey(name)"
        )
        .range(lo, hi)
        .execute()
        .data
    )
    mmap = {m["id"]: m for m in matches}
    feats = _paginate(
        lambda lo, hi: db.table("features").select("match_id, data").range(lo, hi).execute().data
    )
    fmap = {f["match_id"]: (f.get("data") or {}) for f in feats}

    # Build the work list, attributing sport + timeframe.
    work: list[dict] = []
    for p in preds:
        m = mmap.get(p["match_id"])
        if not m:
            continue
        sport = league_sport.get(m["league_id"])
        if sport is None or sport not in adapters:
            continue
        if args.sport and sport != args.sport:
            continue
        tf = "upcoming" if m["starts_at"] >= nowiso else "past"
        if args.timeframe != "all" and tf != args.timeframe:
            continue
        work.append({"pred": p, "match": m, "sport": sport, "tf": tf})

    # Upcoming first (soonest first), then past (most recent first) — the order
    # users actually browse.
    tf_rank = {"upcoming": 0, "past": 1}

    def _sort_key(w: dict) -> tuple[int, float]:
        ts = _epoch(w["match"]["starts_at"])
        return (tf_rank[w["tf"]], ts if w["tf"] == "upcoming" else -ts)

    work.sort(key=_sort_key)

    total = len(work)
    logger.info("%d predictions below %s%s", total, PERSONA_VERSION,
                f" (sport={args.sport})" if args.sport else "")
    if args.dry_run:
        from collections import Counter
        c = Counter((w["sport"], w["tf"]) for w in work)
        for k in sorted(c):
            logger.info("  would regenerate: %-7s %-9s %d", k[0], k[1], c[k])
        return 0

    llm = get_llm_client()
    done = 0
    for w in work:
        if args.limit and done >= args.limit:
            logger.info("hit --limit %d; stopping", args.limit)
            break
        m, p, sport = w["match"], w["pred"], w["sport"]
        home, away = m["home"]["name"], m["away"]["name"]
        adapter = adapters[sport]
        features = fmap.get(p["match_id"], {})
        leaders = (m.get("context") or {}).get("leaders")
        try:
            edges = adapter.edges(features, home, away)
            extra = list(leaders_to_context(leaders, home, away) or [])
            if hasattr(adapter, "analysis_context"):
                raw = RawMatch(external_id="", home=home, away=away, starts_at=m["starts_at"])
                extra += adapter.analysis_context(raw)
            analysis = generate_analysis(
                home, away, p["probs"], edges, llm,
                system_prompt=getattr(adapter, "system_prompt", None),
                extra_context=extra,
            )
            db.table("predictions").update(
                {"analysis": analysis.text, "analysis_version": analysis.version}
            ).eq("id", p["id"]).execute()
            done += 1
            logger.info("  [%d/%d] %-7s %-9s %s vs %s", done, total, sport, w["tf"], home, away)
            time.sleep(_THROTTLE_SECONDS)
        except Exception as e:
            logger.error("LLM call failed (%s vs %s): %s", home, away, str(e)[:200])
            logger.info("stopping — likely quota/rate limit. Regenerated %d this run.", done)
            break

    logger.info("regeneration complete: %d updated (of %d eligible)", done, total)
    return 0


def _epoch(iso: str) -> float:
    """Epoch seconds for an ISO timestamp (0.0 if unparseable)."""
    import datetime as _dt

    try:
        return _dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


if __name__ == "__main__":
    sys.exit(main())

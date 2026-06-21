# Sports Predict — multi-tenant prediction SaaS

Generates and displays outcome predictions for **soccer (free tier)** and
**UFC + NBA (pro tier)**. Every prediction ships with a branded, AI-written
analysis ("The Breakdown"), and accuracy is benchmarked honestly against the
betting market.

This is a **systems project**. The model is a black box behind a clean
interface; what it demonstrates is service-boundary design, a fault-tolerant
data pipeline, database-enforced multi-tenancy (RLS), an LLM feature grounded in
real data, testing, and deployment.

## The service boundary

- **Supabase** owns auth, CRUD, and reads. The frontend reads predictions (and
  their cached analysis text) **directly** from Supabase, with **RLS** enforcing
  who sees what. Most reads never touch the backend.
- **FastAPI** owns only what a BaaS can't: ML inference, the resilient ingestion
  pipeline, LLM analysis generation, and the Stripe webhook. It writes finished
  predictions + analysis into Supabase; the frontend reads them out.

> "I kept a Python backend for ML, ingestion, and LLM generation because those
> don't belong in a BaaS, and let Supabase handle auth and CRUD so I wasn't
> reinventing them."

## Layout

```
backend/    FastAPI — ML, ingestion, LLM, webhook. Adapter pattern per sport.
frontend/   Next.js (App Router) + TS + Tailwind. Reads Supabase directly.
supabase/   SQL migrations = source of truth for schema + RLS.
```

## Local setup

```bash
# 1. Database (requires Docker Desktop running)
supabase start

# 2. Backend
cd backend && uv sync --extra dev && cp .env.example .env
uv run uvicorn app.main:app --reload    # http://127.0.0.1:8000/health

# 3. Frontend
cd frontend && npm install && cp .env.local.example .env.local
npm run dev                             # http://localhost:3000
```

Fill `.env` / `.env.local` with the keys printed by `supabase start`.

## Status

- [x] **Phase 0** — wired skeleton: backend boots, `/health` 200, frontend
  landing renders, CI defined.
- [x] **Phase 1** — schema + RLS applied to Supabase cloud. Tier gating
  **verified end-to-end** (`scripts/verify_rls.py`): anon & free users see 0 pro
  predictions, pro users see all — enforced by Postgres, not the app.
- [x] **Phase 2** — layered backend (routes → services → repositories), Supabase
  JWT auth, the `SportAdapter` Protocol + registry, sport-agnostic ingestion
  service, cron worker entrypoint. 12 tests green (registry, ingestion
  resilience/idempotency, auth).
- [~] **Phase 3** — UFC vertical slice: **self-computed point-in-time features**
  from raw UFCStats data (per-fighter career form as of each fight date — no
  leakage; randomized home/away to kill the position artifact; odds excluded from
  features). Time-split training (logistic vs XGBoost), honest eval vs de-vigged
  market, versioned artifact, `UFCAdapter`. Held-out: model Brier **0.233** vs
  market **0.200** (n=1,374). Ingestion writes all 13 upcoming fights' predictions
  to Supabase (NaN→null for debut fighters).
- [x] **Phase 4** — LLM persona ("The Breakdown", live-commentator voice via
  Groq): provider-agnostic `LLMClient` with retry/backoff, grounding logic (top
  stat edges → prompt), **generate-once-and-cache** (skips current write-ups on
  re-run). All 13 UFC predictions have cached analysis in the DB. Tests assert
  the prompt only receives real model fields + cover retry/skip behavior.
- [~] **Phase 5** — frontend (Next.js, dark broadcast theme): Supabase email auth
  + SSR session middleware; **Upcoming** and separate **Past** pages, each with
  **per-sport tabs** (UFC live; NBA/Soccer "soon"); RLS-gated prediction cards;
  **match detail** (full "The Breakdown" write-up + key statistical edges);
  **/accuracy** (Brier/log-loss vs market + Recharts calibration). Upcoming
  fixtures now pulled **live from ESPN's free API** (no key), features still
  self-computed; names matched accent-insensitively. **Favorites** (star fights,
  per-user RLS-enforced, dedicated page) and **Realtime** (live refresh on new
  picks — wired; activate via the realtime migration) complete the phase. Demo
  pro login: `demo@thebreakdown.app` / `breakdown123`.
- [x] **Phase 5 complete** (see above) — auth, upcoming/past, sport tabs, match
  detail, accuracy, favorites, realtime.
- [ ] Phase 6 — soccer (free tier)
- [ ] Phase 7 — tier gating + Stripe
- [ ] Phase 8 — NBA
- [ ] Phase 9 — harden & ship

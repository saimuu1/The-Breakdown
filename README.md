<div align="center">

# 🥊 The Breakdown

### Every matchup, called before the first bell — and explained like a broadcast analyst would.

A full-stack sports prediction platform that forecasts **World Cup soccer, UFC fights, and NBA games**, ships every pick with an AI-written breakdown grounded in real stats, and grades itself honestly against the betting market.

[Architecture](#-architecture-the-part-im-proud-of) · [ML approach](#-the-models-honest-by-design) · [Who it's for](#who-its-for)

`Next.js 16` · `React 19` · `TypeScript` · `FastAPI` · `Python` · `Supabase/Postgres` · `scikit-learn` · `XGBoost` · `Stripe` · `GitHub Actions`

</div>

---

## Why I built this

I love sports, and I love the moment right before a fight or a match when everyone has an opinion but nobody actually *knows*. I wanted to build the thing I always wished existed: not a sportsbook, but a place that makes an honest, data-backed call on every matchup — and then **explains itself** in plain language, like a commentator breaking down the tape.

So I built it end to end. Not a toy, not a tutorial clone — a real product with accounts, a machine-learning pipeline, an AI analysis layer, a database that enforces its own security rules, automated data updates, billing, and legal pages. Everything you'd need to actually put in front of users. This README is the tour.

> **The honest part I care about most:** the app benchmarks its own accuracy against the de-vigged betting market and shows the numbers — wins *and* losses. No cherry-picking. If the model is worse than Vegas on a sport, the `/accuracy` page says so.

## Who it's for

Sports fans who want a sharper read on a matchup, anyone who likes the data behind the drama — and **bettors**, who can use The Breakdown as one research input alongside their own judgment.

A few things I want to be upfront about:

- **These are probabilities, not promises.** A 64% favorite still loses roughly one time in three. The model is frequently beaten by the betting market — the `/accuracy` page shows exactly where and when.
- **It is not betting or financial advice.** It doesn't tell you what to wager or guarantee any outcome. It's a model's opinion; you bring your own.
- **You know things the model doesn't** — a late injury, locker-room news, your own gut feel. Treat the breakdown as a starting point for your own thinking, never the final word.
- **If you do bet, bet responsibly.** 18+, entertainment only. If gambling stops being fun, step away or get help — [ncpgambling.org](https://www.ncpgambling.org/) · 1-800-GAMBLER.

---

## What it does

- **🔮 Predictions for three sports** — group-stage-to-final World Cup matches, UFC fight cards, and NBA games, each with win probabilities computed from a trained model.
- **🎙️ "The Breakdown" — AI analysis on every pick.** An LLM writes a broadcast-style breakdown of each matchup, but it's **grounded**: the prompt only ever sees real model features and stat edges, so it names the actual factors driving the prediction instead of hallucinating.
- **⭐ A personalized feed.** Follow any team or fighter and get an **importance-ranked feed** — a final weighs heavier than a group game, a playoff heavier than a regular-season night.
- **📊 An honest track record.** A dedicated accuracy page scores the model with **Brier score and log-loss vs. the betting market**, plus calibration charts.
- **🔐 Real accounts + tiered access.** Email auth, an age gate, and database-enforced multi-tenancy — the paywall lives in Postgres, not just the UI.
- **💳 Subscription billing.** A complete Stripe checkout → webhook → customer-portal flow (in test mode), gated so only the webhook can grant access.
- **🔄 It keeps itself current.** A scheduled job pulls new fixtures, records finished games, and re-runs predictions twice a day — no human in the loop.

---

## 🏗 Architecture (the part I'm proud of)

The core decision: **let each tool do what it's best at, and define a clean boundary between them.**

```
                        ┌─────────────────────────────────────┐
   Browser  ──reads──▶  │  Supabase (Postgres + Auth + RLS)    │
                        │  auth · CRUD · prediction reads      │
                        └─────────────────────────────────────┘
                                     ▲ writes
                                     │
                        ┌─────────────────────────────────────┐
   GitHub Actions ───▶  │  FastAPI backend (Python)            │
   (twice-daily cron)   │  ML inference · ingestion pipeline   │
                        │  LLM analysis · Stripe webhook       │
                        └─────────────────────────────────────┘
```

**The frontend reads predictions directly from Supabase** — most page loads never touch the backend. Postgres **Row-Level Security** decides who sees what, so access control can't be bypassed by hitting an API differently.

**The Python backend owns only what a managed backend can't:** ML inference, a fault-tolerant data pipeline, LLM generation, and the Stripe webhook. It writes finished predictions into Supabase; the frontend reads them out. No reinventing auth or CRUD.

### Engineering highlights

- **🧩 A sport-agnostic pipeline via the adapter pattern.** The ingestion service never names a sport — it loops over a registry of `SportAdapter`s. Adding a sport means writing one module and calling `register()`; the pipeline, schema, and analysis layer don't change. Soccer (three-way outcomes, neutral venues), UFC (binary, per-fighter tale-of-the-tape), and NBA (binary, team form) all plug into the same machinery.
- **🛡️ Multi-tenancy enforced by the database.** Tier gating and per-user data (follows, plan) are RLS policies, verified end-to-end by a script: anonymous users see nothing, free users see the free tier, pro users see everything — enforced by Postgres, not trusted client code. A security fix mid-build: I removed a policy that let users self-upgrade their own plan, so **only the Stripe webhook (service role) can grant access.**
- **🚫 No data leakage in features.** Every model feature is computed **point-in-time** — a fighter's form is built only from bouts *before* the fight date; World Cup ELO is frozen before the tournament starts. Home/away is randomized to kill positional artifacts, and betting odds are deliberately excluded from inputs so the market stays an independent benchmark.
- **♻️ Idempotent by design.** Re-running the pipeline updates rows in place instead of duplicating them — I hunted down and fixed a subtle bug where one sport's predictions were keyed differently and silently double-writing.
- **🤖 Grounded LLM generation.** A provider-agnostic client with retry/backoff and generate-once-and-cache (re-runs skip existing write-ups), plus tests that assert the prompt receives *only* real model fields — no fabricated stats.
- **⚙️ Shipped like production.** CI runs lint + type-check + tests + build on every push (backend and frontend); a separate scheduled workflow keeps the live data fresh.

---

## 🎯 The models (honest by design)

Each sport has its own trained, versioned model:

| Sport | Approach |
|---|---|
| **UFC** | Logistic regression / XGBoost on self-computed per-fighter career form from raw UFCStats data (1994–present), time-split for training. |
| **Soccer** | A **tournament-aware** World Cup model: pre-tournament ELO + form + experience, blended by round with what's actually happened in the bracket so far. Conservative — an upset nudges the odds, it doesn't rewrite them. |
| **NBA** | Team-form model, series-aware for the playoffs (Game 5 of a series ≠ Game 1). |

Held-out UFC example: model **Brier 0.233** vs. de-vigged market **0.200** (n ≈ 1,374). The market is sharp and hard to beat — and rather than hide that, the app **shows** it. That honesty is the point.

---

## 🛠 Tech stack

**Frontend** — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts, SSR Supabase auth.
**Backend** — Python, FastAPI, scikit-learn, XGBoost, pandas, Pydantic; managed with `uv`.
**Data & auth** — Supabase (Postgres, Row-Level Security, Realtime, Auth). SQL migrations are the source of truth for schema + policies.
**AI** — Provider-agnostic LLM client (OpenAI-compatible) for the "Breakdown" analysis.
**Payments** — Stripe (Checkout, webhooks, Customer Portal).
**Infra** — Vercel (frontend), GitHub Actions (CI + scheduled data refresh).

By the numbers: ~6,100 lines of Python, ~4,700 lines of TypeScript/TSX, 5 SQL migrations, 65 passing backend tests.

---

## 📁 Project structure

```
backend/     FastAPI — ML, ingestion, LLM, Stripe webhook. Adapter pattern per sport.
  app/
    sports/          one self-registering adapter per sport (ufc, soccer, nba)
    services/        sport-agnostic ingestion orchestration
    repositories/    Supabase data access
    llm/             persona + grounded prompt building
    ml/              model registry (train / load / version)
  scripts/           backfills, results, accuracy export
  tests/             65 tests — registry, ingestion, auth, LLM behavior

frontend/    Next.js App Router + TypeScript + Tailwind. Reads Supabase directly.
  app/               dashboard, past, match detail, accuracy, pricing, legal
  components/        prediction cards, follow buttons, the feed, billing UI
  lib/               Supabase clients, queries, the importance-ranked feed

supabase/    SQL migrations — schema + RLS policies (source of truth)

.github/workflows/   ci.yml (lint/test/build) · refresh-data.yml (twice-daily updates)
```

---

## 🚀 Running it locally

```bash
# 1. Database (requires Docker Desktop running)
supabase start

# 2. Backend
cd backend
uv sync --extra dev
cp .env.example .env          # fill with keys from `supabase start`
uv run uvicorn app.main:app --reload      # http://127.0.0.1:8000/health

# 3. Frontend
cd frontend
npm install
cp .env.local.example .env.local          # fill with keys from `supabase start`
npm run dev                               # http://localhost:3000
```

**Quality gates** (the same checks CI runs):

```bash
# backend
cd backend && uv run ruff check . && uv run pytest

# frontend
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

---

## 🗺 Status & roadmap

**Live now:** all three sports end to end · grounded AI analysis · personalized following feed · honest accuracy tracking · auth + RLS multi-tenancy · Stripe billing (test mode) · automated twice-daily data refresh · CI on every push.

**Next up:** club soccer leagues (Premier League / La Liga / Champions League), richer per-player stat context in the analysis, and flipping billing live.

---

<div align="center">

*Built because I wanted it to exist. The Breakdown is a data tool for fans and bettors alike — a model's opinion, not betting advice, and never a guarantee. 18+.*

</div>

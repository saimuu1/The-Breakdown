# Backend — Sports Predict API

FastAPI service that owns only what a BaaS can't: **ML inference, the resilient
ingestion pipeline, LLM analysis generation, and the Stripe webhook.** It writes
finished predictions + analysis into Supabase; the frontend reads them out.
Auth and CRUD stay in Supabase.

## Local dev

```bash
uv sync --extra dev
cp .env.example .env        # fill in values
uv run uvicorn app.main:app --reload
# -> http://127.0.0.1:8000/health  and  /docs
```

## Quality gates

```bash
uv run ruff check .
uv run pytest
```

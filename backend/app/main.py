from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, users
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Sports Predict API",
    description="ML inference, resilient ingestion, LLM analysis, and billing webhook. "
    "Auth and CRUD live in Supabase; this backend owns only what a BaaS can't do.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten per-environment before public deploy
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.include_router(users.router)
app.include_router(admin.router)

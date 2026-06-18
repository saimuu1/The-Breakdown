"""Create (or refresh) a confirmed demo PRO user for local development.

    python -m scripts.seed_demo_user

Lets you log in and see the pro-tier (UFC) predictions the RLS policy gates.
"""

from supabase import create_client

from app.config import get_settings

DEMO_EMAIL = "demo@thebreakdown.app"
DEMO_PASSWORD = "breakdown123"


def main() -> int:
    s = get_settings()
    db = create_client(s.supabase_url, s.supabase_service_key)

    # Find existing demo user, if any.
    existing = next(
        (u for u in db.auth.admin.list_users() if u.email == DEMO_EMAIL),
        None,
    )
    if existing:
        user_id = existing.id
        print(f"Demo user already exists ({user_id}).")
    else:
        user = db.auth.admin.create_user(
            {"email": DEMO_EMAIL, "password": DEMO_PASSWORD, "email_confirm": True}
        ).user
        user_id = user.id
        print(f"Created demo user ({user_id}).")

    db.table("profiles").update({"plan": "pro"}).eq("id", user_id).execute()
    print(f"Plan set to PRO.\n  email:    {DEMO_EMAIL}\n  password: {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

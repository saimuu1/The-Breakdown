"""Prove RLS tier gating end-to-end against the live database.

    python -m scripts.verify_rls

The whole SaaS-correctness claim rests on this: the DATABASE, not the frontend,
decides who sees paid predictions. We check three identities:
  * service_role (backend)   -> sees everything (RLS bypassed)
  * anonymous / free user    -> sees only 'free' predictions, never 'pro'
  * pro user                 -> sees everything

Run after ingestion has written some 'pro' (UFC) predictions.
"""

import os
import sys
import uuid
from pathlib import Path

from supabase import create_client

from app.config import get_settings


def _anon_key() -> str:
    # The anon (public) key lives in the frontend env file.
    env = Path(__file__).resolve().parents[2] / "frontend" / ".env.local"
    for line in env.read_text().splitlines():
        if line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("anon key not found in frontend/.env.local")


def main() -> int:
    s = get_settings()
    anon_key = os.environ.get("SUPABASE_ANON_KEY") or _anon_key()
    service = create_client(s.supabase_url, s.supabase_service_key)

    # service_role bypasses RLS -> ground truth.
    all_preds = service.table("predictions").select("tier", count="exact").execute()
    n_total = all_preds.count
    n_free = sum(1 for p in all_preds.data if p["tier"] == "free")
    n_pro = n_total - n_free
    print(f"\nGround truth (service_role): {n_total} predictions  ({n_free} free, {n_pro} pro)")

    ok = True

    # 1) Anonymous user.
    anon = create_client(s.supabase_url, anon_key)
    anon_seen = anon.table("predictions").select("tier").execute().data
    anon_pro = sum(1 for p in anon_seen if p["tier"] == "pro")
    print(f"\n[anon]  sees {len(anon_seen)} predictions, {anon_pro} of them pro")
    print("        expected: only free, 0 pro", "-> PASS" if anon_pro == 0 else "-> FAIL")
    ok &= anon_pro == 0

    # 2) Free + pro users (created, promoted, then cleaned up).
    email_free = f"free-{uuid.uuid4().hex[:8]}@example.com"
    email_pro = f"pro-{uuid.uuid4().hex[:8]}@example.com"
    pw = "Test-Passw0rd!"
    u_free = service.auth.admin.create_user(
        {"email": email_free, "password": pw, "email_confirm": True}
    ).user
    u_pro = service.auth.admin.create_user(
        {"email": email_pro, "password": pw, "email_confirm": True}
    ).user
    # Promote one to pro (trigger created both as 'free').
    service.table("profiles").update({"plan": "pro"}).eq("id", u_pro.id).execute()

    try:
        for label, email, expect_pro in (
            ("free user", email_free, 0),
            ("pro user", email_pro, n_pro),
        ):
            client = create_client(s.supabase_url, anon_key)
            client.auth.sign_in_with_password({"email": email, "password": pw})
            seen = client.table("predictions").select("tier").execute().data
            seen_pro = sum(1 for p in seen if p["tier"] == "pro")
            verdict = "PASS" if seen_pro == expect_pro else "FAIL"
            print(f"[{label}] sees {len(seen)} predictions, {seen_pro} pro "
                  f"(expected {expect_pro} pro) -> {verdict}")
            ok &= seen_pro == expect_pro
    finally:
        service.auth.admin.delete_user(u_free.id)
        service.auth.admin.delete_user(u_pro.id)

    print("\n" + ("ALL RLS CHECKS PASSED ✅" if ok else "RLS CHECKS FAILED ❌"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

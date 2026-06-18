import pytest
from fastapi.testclient import TestClient
from jose import jwt

import app.api.deps as deps
from app.config import Settings
from app.main import app

SECRET = "unit-test-jwt-secret"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(deps, "get_settings", lambda: Settings(supabase_jwt_secret=SECRET))
    return TestClient(app)


def _token(sub="user-123", email="a@b.com", aud="authenticated", secret=SECRET):
    return jwt.encode({"sub": sub, "email": email, "aud": aud}, secret, algorithm="HS256")


def test_valid_token_resolves_user(client):
    resp = client.get("/me", headers={"Authorization": f"Bearer {_token()}"})
    assert resp.status_code == 200
    assert resp.json() == {"id": "user-123", "email": "a@b.com"}


def test_no_token_is_rejected(client):
    assert client.get("/me").status_code in (401, 403)


def test_garbage_token_is_401(client):
    resp = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_token_signed_with_wrong_secret_is_401(client):
    bad = _token(secret="attacker-secret")
    resp = client.get("/me", headers={"Authorization": f"Bearer {bad}"})
    assert resp.status_code == 401


def test_wrong_audience_is_401(client):
    bad = _token(aud="some-other-aud")
    resp = client.get("/me", headers={"Authorization": f"Bearer {bad}"})
    assert resp.status_code == 401

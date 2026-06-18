"""Request dependencies — primarily verifying the Supabase user JWT.

Supabase signs user access tokens with the project's JWT secret (HS256) and sets
`aud = "authenticated"`. We verify the signature and audience, then resolve the
current user from the `sub` claim. Routes depend on `get_current_user`.
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings

_bearer = HTTPBearer(auto_error=True)


@dataclass
class CurrentUser:
    id: str
    email: str | None = None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured",
        )
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    return CurrentUser(id=payload["sub"], email=payload.get("email"))

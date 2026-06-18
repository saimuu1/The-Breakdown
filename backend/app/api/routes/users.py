from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, get_current_user

router = APIRouter(tags=["users"])


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict[str, str | None]:
    """Echo the authenticated user — proves Supabase JWT verification works."""
    return {"id": user.id, "email": user.email}

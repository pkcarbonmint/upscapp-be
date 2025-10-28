from typing import Any
from fastapi import APIRouter, Depends, Response, BackgroundTasks, Header
from fastapi_async_sqlalchemy import db

from src.constants import APP
from .schemas import *
from .models import RefreshToken
from src.users.models import User
from .service import AuthService
from . import utils
from .deps import valid_refresh_token, valid_refresh_token_user
from .security import create_access_token, get_jwt_token, verify_id_token
from src.users.exceptions import *

router = APIRouter(prefix="/auth", tags=["Auth"])

auth_service = AuthService(RefreshToken, db)


@router.post("/token", response_model=TokenResponse)
async def get_token(
    *,
    provider: AuthProvider | None = None,
    user_info: dict[str, Any] = Depends(verify_id_token),
    response: Response
):
    user = await auth_service.authenticate_oauth2user(
        auth_data=user_info, provider=provider, db_session=db.session
    )
    if not user:
        raise UserNotFound()

    if not user.is_active:
        raise UserDeactivated()

    refresh_token_value = await auth_service.create_refresh_token(user_id=user.id,db_session=db.session)

    response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))

    return TokenResponse(
        access_token=create_access_token(user=user),
        refresh_token=refresh_token_value,
    )


@router.put("/token", response_model=TokenResponse)
async def refresh_token(
    worker: BackgroundTasks,
    response: Response,
    refresh_token: RefreshToken = Depends(valid_refresh_token),
    user: User = Depends(valid_refresh_token_user),
) -> TokenResponse:
    refresh_token_value = await auth_service.create_refresh_token(
        user_id=refresh_token.user_id,db_session=db.session
    )
    response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))

    worker.add_task(auth_service.expire_refresh_token, refresh_token_uuid=refresh_token.uuid)
    return TokenResponse(
        access_token=create_access_token(user=user),
        refresh_token=refresh_token_value,
    )


@router.delete("/token")
async def logout_user(
    response: Response,
    refresh_token: RefreshToken = Depends(valid_refresh_token),
) -> None:
    await auth_service.expire_refresh_token(refresh_token.uuid)

    response.delete_cookie(
        **utils.get_refresh_token_settings(refresh_token.refresh_token, expired=True)
    )
    return {"success": True}

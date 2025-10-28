from typing import Any
from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks, Header
from fastapi_async_sqlalchemy import db
from src.auth.exceptions import AuthenticationFailed

from src.constants import APP
from src.modules.eventlogs.deps import log_event
from src.modules.eventlogs.schemas import EVENT_TYPE
from src.users.service import UserService
from .schemas import *
from .models import RefreshToken
from src.users.models import User
from .service import AuthService
from . import utils
from .deps import valid_refresh_token, valid_refresh_token_user, valid_token_user
from .security import check_password, create_access_token, get_jwt_token, verify_id_token
from src.users.exceptions import *

auth_router_v2 = APIRouter(prefix="/v2/auth", tags=["Auth v2"])

auth_service = AuthService(RefreshToken, db)
user_service = UserService(User, db)


@auth_router_v2.post("/token", response_model=TokenResponse)
async def get_token(
    *,
    user_info: UserLogin,
    request: Request,
    response: Response
):
    user = await user_service.get_by_field(value=user_info.phone_number,field="phone_number",db_session=db.session)
    if not user:
        raise UserNotFound()
    if not user.password:
        raise UserPwdNotFound()

    if not user.is_active:
        raise UserDeactivated()
    
    pwd_check = check_password(user_info.password,user.password)
    if not pwd_check:
        raise AuthenticationFailed()

    refresh_token_value = await auth_service.create_refresh_token(user_id=user.id,db_session=db.session)

    response.set_cookie(**utils.get_refresh_token_settings(refresh_token_value))
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.LOGIN,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"logged_in_user":user.id})

    return TokenResponse(
        access_token=create_access_token(user=user),
        refresh_token=refresh_token_value,
    )


@auth_router_v2.put("/token", response_model=TokenResponse)
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


@auth_router_v2.delete("/token")
async def logout_user(
    response: Response,request: Request,
    user: User = Depends(valid_token_user),
    refresh_token: RefreshToken = Depends(valid_refresh_token),
) -> None:
    await auth_service.expire_refresh_token(refresh_token.uuid)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.LOGOUT,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"logout_user":user.id})

    response.delete_cookie(
        **utils.get_refresh_token_settings(refresh_token.refresh_token, expired=True)
    )
    return {"success": True}

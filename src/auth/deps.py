from datetime import datetime

from fastapi import Cookie, Depends, Header

from src.auth.exceptions import RefreshTokenNotValid, InvalidToken,UserNotActive
from .service import AuthService
from .schemas import *
from .models import RefreshToken
from .security import parse_jwt_token, get_jwt_token, parse_jwt_token_admin
from fastapi_async_sqlalchemy import db
from src.users.models import User
from src.users.service import UserService

auth_service = AuthService(RefreshToken, db)
user_service = UserService(User, db)


async def valid_refresh_token(
    refresh_token: str | None = Header(..., alias="refreshToken")
) -> RefreshToken:
    
    db_refresh_token = await auth_service.get_refresh_token(refresh_token,db_session=db.session)
    if not db_refresh_token:
        raise RefreshTokenNotValid()

    if not _is_valid_refresh_token(db_refresh_token):
        raise RefreshTokenNotValid()

    return db_refresh_token


async def valid_refresh_token_user(
    refresh_token: RefreshToken = Depends(valid_refresh_token),
) -> User:
    
    user = await user_service.check_user_by_id(refresh_token.user_id,db_session=db.session)
    if not user:
        raise RefreshTokenNotValid()

    return user


async def valid_token_user(
    token: TokenData = Depends(parse_jwt_token),
) -> User:
    
    user = await user_service.check_user_by_id(token.user_id,db_session=db.session)
       
    if not user:
        raise InvalidToken()
    if not user.is_active:
        raise UserNotActive()

    return user


async def valid_token_user_admin(
    token: TokenData = Depends(parse_jwt_token_admin),
) -> User:
    
    user = await user_service.check_user_by_id(token.user_id,db_session=db.session)
    if not user:
        raise InvalidToken()

    return user


def _is_valid_refresh_token(db_refresh_token: RefreshToken) -> bool:
    return datetime.utcnow() <= db_refresh_token.expires_at

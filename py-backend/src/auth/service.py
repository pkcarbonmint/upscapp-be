import uuid
from datetime import datetime, timedelta
from pydantic import UUID4
from sqlalchemy import insert, select, update, delete
from typing import Any

from src import utils
from src.auth.config import auth_config
from src.auth.exceptions import InvalidCredentials
from src.users.exceptions import UserNotFound
from src.auth.schemas import *
from src.auth.security import check_password, hash_password, verify_id_token
from src.users.models import User
from src.users.service import UserService
from src.base.service import BaseService
from .models import RefreshToken
from fastapi_async_sqlalchemy import db
from sqlalchemy.ext.asyncio import AsyncSession


user_service = UserService(User, db)


class AuthService(BaseService[RefreshToken, RefreshTokenCreate, RefreshTokenUpdate]):
    async def authenticate_user(self, *, auth_data: AuthUser, db_session: AsyncSession | None = None) -> User:
        user = await user_service.get_by_field(field="email", value=auth_data.email,db_session=db_session)
        if not user:
            raise InvalidCredentials()

        if not check_password(auth_data.password, user["password"]):
            raise InvalidCredentials()

        return user

    async def authenticate_oauth2user(
        self, *, provider: str | None = None, auth_data: OAuth2User | dict[str, Any],db_session: AsyncSession | None = None
    ) -> User:
        # verify oauth user with id_token or code
        if isinstance(auth_data, OAuth2User) and auth_data.id_token:
            user_info: dict[str, Any] = await verify_id_token(
                id_token=auth_data.id_token
            )
        else:
            user_info = auth_data
        # user = await user_service.get_by_field(
        #     field="phone_number", value=auth_data["phone_number"]
        # )
        if provider:
            auth_user = (
                user_info.get("email")
                if provider == AuthProvider.email
                else user_info.get("phone_number")
            )
        else:
            auth_user = user_info.get("email") or user_info.get("phone_number")
        user = await user_service.check_auth_user(auth_user=auth_user,db_session=db_session)

        # check and update email or phone verified fields
        # email_verified: bool = user_info.get("email_verified") or False
        # phone_verified: bool = user_info.get("phone_verified") or False
        # user = await user_service.update(
        #     obj_current=user,
        #     obj_new={
        #         "email_verified": email_verified,
        #         "phone_verified": phone_verified,
        #     },
        # )

        return user

    async def create_refresh_token(
        self, *, user_id: int, refresh_token: str | None = None,db_session: AsyncSession | None = None
    ) -> str:
        if not refresh_token:
            refresh_token = utils.generate_random_alphanum(64)

        obj_in = RefreshTokenCreate(
            refresh_token=refresh_token,
            expires_at=datetime.utcnow()
            + timedelta(seconds=auth_config.REFRESH_TOKEN_EXP),
            user_id=user_id,
        )
        db_obj = await self.create(obj_in=obj_in,db_session=db_session)

        return refresh_token

    async def get_refresh_token(self, refresh_token: str,db_session: AsyncSession | None = None) -> RefreshToken | None:
        db_obj = await self.get_by_field(field="refresh_token", value=refresh_token,db_session=db_session)

        return db_obj

    async def expire_refresh_token(self, refresh_token_uuid: UUID4) -> None:
        async with db():
            session = db.session 
            update_query = (
                update(RefreshToken)
                .values(expires_at=datetime.utcnow() - timedelta(days=1))
                .where(RefreshToken.uuid == refresh_token_uuid)
            )

            # await self.db.session.execute(update_query)
            await session.execute(update_query)

from pydantic import Field, EmailStr, field_validator, UUID4, Json
from datetime import datetime
from src.base.schemas import BaseSchema
import re
from typing import Any
from src.users.schemas import SubscriptionResponse
from enum import Enum

"""
Auth schemas
"""


class AuthProvider(str, Enum):
    email = "EMAIL"
    phone = "PHONE"


class TokenData(BaseSchema):
    user_id: int = Field(alias="sub")
    roles: list[str] | None
    is_admin: bool = False
    is_superadmin: bool = False
    is_active: bool = True
    subscription: str | None = None
    user_type: str | None = None
    is_external: bool | None = False


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str


STRONG_PASSWORD_PATTERN = re.compile(r"^(?=.*[\d])(?=.*[!@#$%^&*])[\w!@#$%^&*]{6,128}$")


class AuthUser(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

    @field_validator("password")
    def valid_password(cls, password: str) -> str:
        if not re.match(STRONG_PASSWORD_PATTERN, password):
            raise ValueError(
                "Password must contain at least "
                "one lower character, "
                "one upper character, "
                "digit or "
                "special symbol"
            )

        return password


class OAuth2User(BaseSchema):
    id_token: str | None = None
    code: str | None = None


class RefreshTokenBase(BaseSchema):
    user_id: int
    refresh_token: str
    expires_at: datetime


class RefreshTokenCreate(RefreshTokenBase):
    pass


class RefreshTokenUpdate(RefreshTokenBase):
    pass


class RefreshTokenResponse(RefreshTokenBase):
    uuid: UUID4

class UserLogin(BaseSchema):
    phone_number: str
    password: str
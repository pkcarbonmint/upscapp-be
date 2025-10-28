import bcrypt

from typing import Any
from datetime import datetime, timedelta
from fastapi import Depends, Header
from fastapi.security import (
    OAuth2PasswordBearer,
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from jose import JWTError, jwt
from pydantic import ValidationError
import firebase_admin
from firebase_admin import auth, credentials

from src.auth.config import auth_config
from src.auth.exceptions import (
    AuthorizationFailed,
    AuthRequired,
    InvalidToken,
    InvalidCredentials,
)
from src.auth.schemas import TokenData
from src.constants import APP
from src.users.models import User
from src.users.schemas import UserCreate

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)
jwt_bearer_scheme = HTTPBearer(auto_error=False)

cred = credentials.Certificate(auth_config.FIREBASE_CERT_FILE)

firebase_admin.initialize_app(cred)


def create_access_token(
    *,
    user: User, apps: list[APP] | None = None,
    expires_delta: timedelta = timedelta(minutes=auth_config.JWT_EXP),
) -> str:
   
    subscription = user.subscription

    jwt_data = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + expires_delta,
        "is_admin": user.is_admin,
        "is_superadmin": user.is_superadmin,
        "is_active": user.is_active,
        "tenant_id": user.tenant_id,
        "roles": user.roles,
        "subscription": str(subscription),
        "user_type": user.user_type, 
        "is_external": user.is_external
    }

    token = jwt.encode(jwt_data, auth_config.JWT_SECRET, algorithm=auth_config.JWT_ALG)
    return token


async def get_jwt_token(
    creds: HTTPAuthorizationCredentials = Depends(jwt_bearer_scheme),
) -> str:
    if not creds:
        raise AuthRequired()

    return creds.credentials


async def parse_jwt_token_optional(
    creds: HTTPAuthorizationCredentials = Depends(jwt_bearer_scheme),
) -> TokenData | None:
    if not creds:
        return None

    token = creds.credentials

    try:
        payload = jwt.decode(
            token, auth_config.JWT_SECRET, algorithms=[auth_config.JWT_ALG]
        )
        
    except JWTError:
        raise InvalidToken()

    return TokenData(**payload)


async def parse_jwt_token(
    token: TokenData | None = Depends(parse_jwt_token_optional),
) -> TokenData:
    if not token:
        raise AuthRequired()

    return token


async def parse_jwt_token_admin(
    token: TokenData = Depends(parse_jwt_token),
) -> TokenData:
    if not token.is_admin:
        raise AuthorizationFailed()

    return token


async def validate_admin_access(
    token: TokenData | None = Depends(parse_jwt_token_optional),
) -> None:
    if token and (token.is_admin or token.is_superadmin):
        return

    raise AuthorizationFailed()


async def validate_superadmin_access(
    token: TokenData | None = Depends(parse_jwt_token_optional),
) -> None:
    if token and token.is_superadmin:
        return

    raise AuthorizationFailed()


def hash_password(password: str) -> bytes:
    pw = bytes(password, "utf-8")
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(pw, salt)  # Hash the password
    return hashed_pw.decode("utf-8")  # Convert bytes to string

def check_password(password: str, password_in_db: str) -> bool:
    password_in_db_bytes = bytes(password_in_db, "utf-8")
    password_bytes = bytes(password, "utf-8")
    return bcrypt.checkpw(password_bytes, password_in_db_bytes)


async def verify_id_token(
    id_token: str = Header(..., alias="idToken")
) -> dict[str, Any]:
    try:
        user_info: dict[str, Any] = auth.verify_id_token(
            id_token=id_token, check_revoked=True
        )
    except auth.RevokedIdTokenError:
        # Token revoked, inform the user to reauthenticate or signOut().
        pass
    except auth.UserDisabledError:
        # Token belongs to a disabled user record.
        raise AuthorizationFailed()
    except auth.InvalidIdTokenError:
        # Token is invalid
        raise InvalidCredentials()
    except Exception as err:
        raise AuthorizationFailed()

    return user_info


async def create_user_with_pwd(user_in: UserCreate, password: str):
    fb_user = auth.create_user(
        display_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        password=password,
    )
    return fb_user

async def create_fb_user(user_in: UserCreate):
    fb_user = auth.create_user(
        display_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number
    )
    return fb_user


async def check_firebase_user(email: str):
    try:
        fb_user = auth.get_user_by_email(email=email)
        
    except auth.UserNotFoundError:
        return None
    except Exception as err:
        raise err

    return fb_user
    


async def check_firebase_user_phone(phone_number: str):
    try:
        fb_user = auth.get_user_by_phone_number(phone_number=phone_number)
    except auth.UserNotFoundError:
        return None
    except Exception as err:
        raise err

    return fb_user


async def update_firebase_user(uid: str, data: dict[str, Any]):
    try:
        fb_user = auth.update_user(uid=uid, **data)

    except Exception as err:
        raise err

    return fb_user


# def get_current_user(required_roles: list[str] = None) -> User:
#     async def current_user(token: str = Depends(oauth2_scheme)) -> User:
#         try:
#             payload = jwt.decode(
#                 token, auth_config.JWT_SECRET, algorithms=[auth_config.JWT_ALG]
#             )
#         except (JWTError, ValidationError):
#             raise InvalidCredentials()

#         user_id = payload["sub"]
#         valid_access_tokens = await get_valid_tokens(
#             redis_client, user_id, TokenType.ACCESS
#         )
#         if valid_access_tokens and token not in valid_access_tokens:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Could not validate credentials",
#             )
#         user: User = await crud.user.get(id=user_id)
#         if not user:
#             raise HTTPException(status_code=404, detail="User not found")

#         if not user.is_active:
#             raise HTTPException(status_code=400, detail="Inactive user")

#         if required_roles:
#             is_valid_role = False
#             for role in required_roles:
#                 if role == user.role.name:
#                     is_valid_role = True

#             if not is_valid_role:
#                 raise HTTPException(
#                     status_code=403,
#                     detail=f"""Role "{required_roles}" is required for this action""",
#                 )

#         return user

#     return current_user

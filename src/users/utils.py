from .models import DiscountCode
from datetime import datetime, timezone
from fastapi import HTTPException
from .models import User
from .service import UserService
from .schemas import UserCreate
from .exceptions import UserEmailRequied
from fastapi_async_sqlalchemy import db
from src.auth.security import (
    create_user_with_pwd,
    check_firebase_user,
    update_firebase_user,
    FIREBASE_ENABLED,
)
from src.auth.exceptions import AuthorizationFailed
from src.external.emailer import Email
from src.config import settings
from sqlalchemy.ext.asyncio import AsyncSession


service = UserService(User, db)


def verify_discount_code(discount: DiscountCode, user_id: int, phone_no: str) -> bool:
    if (
        discount.actual_use_count < discount.max_use_count
        and discount.valid_from <= datetime.now(tz=timezone.utc) <= discount.valid_to and discount.is_active == True
    ):
        if (discount.shared_with and len(discount.shared_with) > 0) or (
            discount.shared_with_phone_no and len(discount.shared_with_phone_no) > 0
        ):
            if (discount.shared_with and user_id in discount.shared_with) or (
                discount.shared_with_phone_no
                and phone_no in discount.shared_with_phone_no
            ):
                if not discount.redeemed_by or len(discount.redeemed_by) == 0:
                    return True
                elif user_id not in discount.redeemed_by:
                    return True
                else:
                    raise HTTPException(
                        status_code=404, detail="Discount code already redeemed by user"
                    )
            else:
                raise HTTPException(
                    status_code=404, detail="Discount code not valid for you"
                )
        else:
            if not discount.redeemed_by or len(discount.redeemed_by) == 0:
                return True
            elif user_id not in discount.redeemed_by:
                return True
            else:
                raise HTTPException(
                    status_code=404, detail="Discount code already redeemed by user"
                )
    else:
        raise HTTPException(
            status_code=404, detail="Discount code invlaid or exceeded maximum use."
        )


def create_random_pwd() -> str:
    import string
    import random

    characters = string.ascii_letters + string.punctuation + string.digits

    password = ""
    password_length = random.randint(8, 16)

    for x in range(password_length):
        char = random.choice(characters)
        password = password + char

    return password


async def create_super_admin_user(db_session: AsyncSession):
    email = settings.SUPER_ADMIN_EMAIL
    full_name = settings.SUPER_ADMIN_NAME
    phone_number = settings.SUPER_ADMIN_PHONE_NO

    user_db = await service.get_by_field(
        value=email, field="email", db_session=db_session
    )
    if not user_db:
        user_db = await service.create(
            obj_in=User(
                email=email,
                phone_number=phone_number,
                full_name=full_name,
                is_admin=True,
                is_superadmin=True,
                is_onboarded=True,
            ),
            db_session=db_session,
        )

    # If Firebase is disabled (dev/local), skip Firebase provisioning
    if not FIREBASE_ENABLED:
        return user_db

    try:
        fb_user = await check_firebase_user(email=email)
        if not fb_user:
            password = create_random_pwd()
            fb_user = await create_user_with_pwd(
                user_in=UserCreate(
                    phone_number=user_db.phone_number,
                    full_name=user_db.full_name,
                    email=user_db.email,
                    is_admin=user_db.is_admin,
                    tenant_id=user_db.tenant_id or 0,
                ),
                password=password,
            )
            await Email().send_password(
                recipient_name=user_db.full_name,
                email_to=[user_db.email],
                data={"password": password},
            )
        else:
            fb_user = await update_firebase_user(
                fb_user.uid,
                {
                    "phone_number": user_db.phone_number,
                    "display_name": user_db.full_name,
                },
            )
    except AuthorizationFailed:
        # In non-Firebase environments, ignore and proceed
        pass

    return user_db

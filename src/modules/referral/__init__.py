from .service import ReferralService, ReferralCreate, ReferralUpdate
from src.users.models import Referral
from fastapi_async_sqlalchemy.middleware import db

referral_service = ReferralService(Referral, db)

__all__ = ["ReferralService", "ReferralCreate", "ReferralUpdate", "referral_service"]

from typing import Any
import itertools

import pytz
from src.constants import APP
from src.config import settings
from .schemas import *
from .models import User, Plan, UserQuota, Subscription, Role, BranchUser, UserRole
from .exceptions import *
from .service import UserService, PlanService, UserQuotaService, RoleService, BranchUserService, UserRoleService
from fastapi_async_sqlalchemy import db
from src.exceptions import PermissionDenied
from src.auth.deps import valid_token_user
from fastapi import Depends
from datetime import timedelta, datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
import calendar


user_service = UserService(User, db)
plan_service = PlanService(Plan, db)
user_quota_service = UserQuotaService(UserQuota, db)
role_service = RoleService(Role)
branch_user_service = BranchUserService(BranchUser)
user_role_service = UserRoleService(UserRole)


async def valid_user_create(user: UserCreate) -> None:
    user_db = await user_service.check_user(
        value=user.phone_number, auth_field_type="phone_number"
    )
    if user_db:
        raise PhoneNumberTaken()

    return


class CheckUserAccess:
    def __init__(
        self,
        feature_name: str | None = None,
        quota_name: str | None = None,
        role: str | None = None,
        admin: bool | None = None,
        superadmin: bool | None = None,
        subscr: bool | None = None,
    ):
        self.subscr = subscr
        self.feature_name = feature_name
        self.quota_name = quota_name
        self.role = role
        self.admin = admin
        self.superadmin = superadmin

    async def __call__(self, user: User = Depends(valid_token_user)) -> User:
        if self.superadmin and not (user.is_superadmin and user.is_admin):
            raise RequiredSuperAdminAccess()

        if self.admin and not user.is_admin:
            raise RequiredAdminAccess()

        if self.role and user.is_admin and not user.is_superadmin:
            if not user.roles or (self.role not in user.roles):
                raise RequiredUserRoleAccess()

        # for only subscription check
        subs: Subscription = user.subscription
        current_expiry_at: datetime = subs and subs.current_expiry_at
        timezone = current_expiry_at and current_expiry_at.tzinfo
        current_date = datetime.now(timezone)
        if (self.subscr or self.feature_name or self.quota_name) and (
            not subs
            or (
                not (
                    subs.subscription_status
                    == SubscriptionStatus.active
                    # or subs.subscription_status == SubscriptionStatus.created
                )
            )
            or (current_expiry_at < current_date)
        ):
            raise RequiredSubscriptionAccess()

        # for only plan check
        # if self.plan_name and subs.plan["name"] != self.plan_name:
        #     raise PermissionDenied()

        # for feature and optionally quota check
        if self.feature_name:
            if not await self.check_feature_quota(
                user=user,
                feature_name=self.feature_name,
                quota_name=self.quota_name,
            ):
                raise RequiredFeatureQuotaAccess()

        return user

    async def check_feature_quota(
        user: User,
        feature_name: str,
        quota_name: str,
        is_daily_test: bool,
        db_session: AsyncSession | None = None,
    ) -> bool:
        subs: Subscription = user.subscription
        start_at: datetime = subs and subs.start_at
        current_expiry_at: datetime = subs and subs.current_expiry_at
        timezone = current_expiry_at and current_expiry_at.tzinfo
        current_date = datetime.now(timezone)
        user_plan = subs.plan.__dict__

        if subs.free_plan == True:

            if subs.free_plan == True and is_daily_test:  ## for free plan
                # Get today's date
                today_date = datetime.today().date()

                # Get datetime at 00:00 AM
                today_start = datetime.combine(today_date, datetime.min.time())
                today_end = datetime.combine(today_date, datetime.max.time())

                quota_consumed = await user_quota_service.get_user_quota_consumed(
                    user_id=user.id,
                    subscription_id=subs.id,
                    plan_name=user_plan["name"],
                    feature_name=feature_name,
                    quota_name=QuotaName.totd,
                    from_date=today_start,
                    till_date=today_end,
                    db_session=db_session,
                )
                
                if quota_consumed and quota_consumed >= 1:
                    raise QuotaExceed()
            elif subs.free_plan == True and quota_name ==QuotaName.pyq:
                quota_consumed = await user_quota_service.get_user_quota_consumed(
                user_id=user.id,
                subscription_id=subs.id,
                plan_name=user_plan["name"],
                feature_name=feature_name,
                quota_name=quota_name,
                from_date=subs.start_at,
                till_date=subs.current_expiry_at,
                db_session=db_session,
            )
                
                if quota_consumed and quota_consumed >= 2:
                    raise QuotaExceed()
            elif subs.free_plan == True and quota_name ==QuotaName.model:
                quota_consumed = await user_quota_service.get_user_quota_consumed(
                user_id=user.id,
                subscription_id=subs.id,
                plan_name=user_plan["name"],
                feature_name=feature_name,
                quota_name=quota_name,
                from_date=subs.start_at,
                till_date=subs.current_expiry_at,
                db_session=db_session,
            )
                if quota_consumed and quota_consumed >= 2:
                    raise QuotaExceed()
            elif subs.free_plan == True and quota_name == QuotaName.test_create:
                quota_consumed = await user_quota_service.get_user_quota_consumed(
                user_id=user.id,
                subscription_id=subs.id,
                plan_name=user_plan["name"],
                feature_name=feature_name,
                quota_name=QuotaName.test_create,
                from_date=subs.start_at,
                till_date=subs.current_expiry_at,
                db_session=db_session,
            )
                
                if quota_consumed and quota_consumed >= 2:
                    raise QuotaExceed()
            elif subs.free_plan == True and quota_name == QuotaName.test_attempt:
                quota_consumed = await user_quota_service.get_user_quota_consumed(
                user_id=user.id,
                subscription_id=subs.id,
                plan_name=user_plan["name"],
                feature_name=feature_name,
                quota_name=QuotaName.test_attempt,
                from_date=subs.start_at,
                till_date=subs.current_expiry_at,
                db_session=db_session,
            )
                if quota_consumed and quota_consumed >= 2:
                    raise QuotaExceed()

        user_features: list[Feature] = user_plan["features"]
        matching_features: list[Feature] = [
            feature for feature in user_features if feature["name"] == feature_name
        ]

        if not matching_features or len(matching_features) < 1:
            raise NoFeatureAccess()

        quotas: list[Quota] = matching_features[0].get("quotas")

        ## iterating to check for each quota name
        if quota_name and quotas:
            quota_allowed_matched = [
                quota.get("quota_allowed", None)
                for quota in quotas
                if quota["quota_name"] == quota_name
            ]
            if quota_allowed_matched and len(quota_allowed_matched) > 0:
                quota_allowed = quota_allowed_matched[0]

                if quota_allowed == None or  quota_allowed == -1:
                    return True

                if user_plan["rate"] == 0:  ## for free plan
                    quota_consumed = await user_quota_service.get_user_quota_consumed_lifetime(
                        user_id=user.id,
                        subscription_id=subs.id,
                        plan_name=user_plan["name"],
                        feature_name=feature_name,
                        quota_name=quota_name,
                        db_session=db_session,
                    )
                    print("FREE CONSUMED", quota_consumed, "quota allowed?>>>>>>",quota_allowed )
                    
                    if quota_consumed and quota_allowed <= quota_consumed:
                        raise QuotaExceed()
                    else:
                        return True

                # # Get the number of days in the target month
                # num_days_in_target_month = calendar.monthrange(
                #     current_date.year, current_date.month
                # )[1]

                # # Adjust the day to be within the valid range for the target month
                # if current_expiry_at.day > num_days_in_target_month:
                #     day = num_days_in_target_month
                # else:
                #     day = current_expiry_at.day
                # current_monthly_expiry: datetime = current_expiry_at.replace(
                #     year=current_date.year, month=current_date.month, day=day
                # )
                # if current_date < current_monthly_expiry:
                #     prev_month = current_monthly_expiry.replace(day=1) - timedelta(
                #         days=1
                #     )
                #     prev_monthly_expiry: datetime = current_monthly_expiry.replace(
                #         month=prev_month.month,day=min(day, prev_month.day)
                #     )
                # else:
                #     prev_monthly_expiry = current_monthly_expiry
                    
                current_monthly_expiry_at = current_date + relativedelta(day=current_expiry_at.day)
                prev_monthly_expiry = current_monthly_expiry_at + relativedelta(months=-1, day=current_expiry_at.day) if current_monthly_expiry_at > current_date else current_monthly_expiry_at
                next_monthly_expiry = prev_monthly_expiry + relativedelta(months=+1) 

                print("prev_monthly_expiry>>>>>????", prev_monthly_expiry.date(), next_monthly_expiry.date(), current_date, timezone)

                quota_consumed = await user_quota_service.get_user_quota_consumed(
                    user_id=user.id,
                    subscription_id=subs.id,
                    plan_name=user_plan["name"],
                    feature_name=feature_name,
                    quota_name=quota_name,
                    from_date=prev_monthly_expiry.date(),
                    till_date=next_monthly_expiry.date(),
                    db_session=db_session,
                )
                print("quota_consumed>>>>>>>>>??????/", quota_consumed, quota_allowed)
                
                if quota_consumed and quota_allowed <= quota_consumed:
                    raise QuotaExceed()
            else:
                return True    
            

        return True


def check_recur_left(subs: Subscription) -> bool:
    recurr_left: int = 0
    months_till_last_expiry: int = subs.recurring_count * subs.plan.billing_frequency
    diff: timedelta = subs.current_expiry_at - subs.start_at
    recurr_left = months_till_last_expiry * 30 - diff.days

    return recurr_left > 0


class CheckV2UserAccess:
    def __init__(
        self,
        user_types: list[USER_TYPE]  = [],
        roles: list[USER_ROLE] = [],
        apps: list[APP]  = [],
    ):
        self.user_types = user_types
        self.roles = roles
        self.apps = apps

    async def __call__(self, user: User = Depends(valid_token_user)) -> User:
        if self.user_types and user.user_type not in self.user_types:
            raise RequiredUserTypeAccess()
        
        if self.roles and not user.user_type == USER_TYPE.student:
            if self.roles and not any(role in user.roles for role in self.roles):
                    raise RequiredUserRoleAccess()
            
        if self.apps and not user.user_type == USER_TYPE.student:
            if not await self.app_access_check():
                raise RequiredAppAccess()            
        return user    

    async def app_access_check(self):           
        role_apps = await role_service.get_apps_by_role(roles=self.roles,db_session=db.session)
        flat_role_apps = list(set((itertools.chain(*role_apps))))
        if not any(app in self.apps for app in  flat_role_apps):
            return False
        return True
    
    async def check_prod_quota(user: User,
                            quota_name: str,
                            qbank_type: str| None = None,
                            db_session: AsyncSession | None = None
                            ):
            prod_purs = await user_service.get_active_purchases_for_student(student_id=user.id,qbank_type=qbank_type,db_session=db.session)
            if not prod_purs:
                raise NoProduct()
            for ap in prod_purs:  # iterate products
                product = ap["product"]
                purchases = ap["purchases"]

                for purchase in purchases:
                    prod_qbank_type = product["product_details"]["q_bank_info"].get("qbank_type")
                    if not prod_qbank_type or prod_qbank_type != qbank_type:
                        continue

                    quotas: list[Quota] = product["product_details"]["q_bank_info"].get("quotas", [])

                    if quota_name and quotas:
                        quota_allowed_matched = [
                            quota.get("quota_allowed", None)
                            for quota in quotas
                            if quota["quota_name"] == quota_name
                        ]
                        if quota_allowed_matched:
                            quota_allowed = quota_allowed_matched[0]

                            # unlimited quota
                            if quota_allowed is None or quota_allowed == -1:
                                return {
                                    "product_id": product["id"],
                                    "purchase_id": purchase["id"],
                                }

                            # check expiry
                            period = product["product_details"]["q_bank_info"].get("time_period")
                            from_date = datetime.fromisoformat(
                                purchase["purchase_date"].replace("Z", "+00:00")
                            ).date()

                            if period == "MONTH":
                                months = 1
                            elif period == "QUARTER":
                                months = 3
                            elif period == "YEAR":
                                months = 12
                            else:
                                months = 0

                            next_expiry = from_date + relativedelta(months=months)
                            today = datetime.now(pytz.timezone("Asia/Kolkata")).date()
                            if today > next_expiry:
                                raise ProductExpired()

                            # check usage
                            quota_consumed = await user_quota_service.get_user_quota_consumed_by_products(
                                user_id=user.id,
                                product_id=product["id"],
                                purchase_id=purchase["id"],
                                quota_name=quota_name,
                                from_date=from_date,
                                till_date=next_expiry,
                                db_session=db_session,
                            )

                            if quota_consumed is None or quota_allowed > quota_consumed:
                                return {
                                    "product_id": product["id"],
                                    "purchase_id": purchase["id"],
                                }

                    # if quota not found, allow
                    else:
                        return {
                            "product_id": product["id"],
                            "purchase_id": purchase["id"],
                        }

            # if none matched
            raise QuotaExceed()
async def user_branch_access(admin: User, user:User, branch_id: int | None = None , db_session: AsyncSession | None = None):
    
    if USER_ROLE.branch_admin in admin.roles:
        admin_branch_ids = await user_role_service.get_branches_for_role_user(role=USER_ROLE.branch_admin,user_id=admin.id,db_session=db_session)
        user_branch_ids = await branch_user_service.get_user_branches(user_id=user.id,db_session=db_session)
        if branch_id:
            if branch_id in admin_branch_ids:
                return True
            else:
                raise RequiredBranchAccess()
        if not admin_branch_ids:
            raise RequiredBranchAccess()
        if user_branch_ids:
            if not set(admin_branch_ids).intersection(set(user_branch_ids)):
                raise RequiredBranchAccess()
    return True      

class CheckQuotaAccess(CheckV2UserAccess, CheckUserAccess):
    def __init__(self) -> None:
        pass  

    async def __call__(self, user: User = Depends(valid_token_user)) -> User:
        return user    

    async def check_subs_prod_quota(
        user: User,
        quota_name: str,
        feature_name: str | None = None,
        qbank_type: str | None = None,
        db_session: AsyncSession | None = None,
    ):
        subs: Subscription = user.subscription
        subs_valid = False

        # --- Step 1: handle subscription validity ---
        if subs:
            current_expiry_at: datetime = subs.current_expiry_at
            timezone = current_expiry_at and current_expiry_at.tzinfo
            current_date = datetime.now(timezone)

            if current_expiry_at < current_date:
                # mark as expired in DB
                from .routes import subscription_service
                subs_db = await subscription_service.get_by_field(
                    value=subs.id, field="id", db_session=db.session
                )
                await subscription_service.update(
                    obj_current=subs_db,
                    obj_new={"subscription_status": SubscriptionStatus.expired},
                    db_session=db.session,
                )
            else:
                subs_valid = subs.subscription_status == SubscriptionStatus.active

        # --- Step 2: Try both checks ---
        subs_ok, prod_ok = False, False
        quota_source = None
        print("sub>>>>>>>>>prod>>>>>>>", subs_valid)
        # Try subscription quota if valid
        if subs_valid:
            try:
                await CheckUserAccess.check_feature_quota(
                    user=user,
                    feature_name=feature_name,
                    quota_name=quota_name,
                    is_daily_test=False,
                    db_session=db_session,
                )
                subs_ok = True
                quota_source = {"source":"subscription"}
            except QuotaExceed:
                subs_ok = False
                try:
                    prod_info = await CheckV2UserAccess.check_prod_quota(
                        user=user,
                        quota_name=quota_name,
                        qbank_type=qbank_type,
                        db_session=db_session,
                    )
                    prod_ok = True
                    quota_source = {
                            "source": "product",
                            "product_id": prod_info["product_id"],
                            "purchase_id": prod_info["purchase_id"],
                        }
                except QuotaExceed:
                    prod_ok = False
        else:

            # Always try product quota (if no subs OR subs failed)
            try:
                prod_info = await CheckV2UserAccess.check_prod_quota(
                    user=user,
                    quota_name=quota_name,
                    qbank_type=qbank_type,
                    db_session=db_session,
                )
                prod_ok = True
                quota_source = {
                        "source": "product",
                        "product_id": prod_info["product_id"],
                        "purchase_id": prod_info["purchase_id"],
                    }
            except QuotaExceed:
                prod_ok = False
        print("sub>>>>>>>>>prod>>>>>>>", subs_ok,"",prod_ok)
        # --- Step 3: Final decision ---
        if not subs_ok and not prod_ok:
            raise QuotaExceed()

        return quota_source
     
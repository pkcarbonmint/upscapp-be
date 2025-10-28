from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    String,
    Text,
    JSON,
    ForeignKey,
    Integer,
    DateTime,
    func,
    Enum,
    Float,
    Boolean,
    UUID, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from src.base.models import BaseMixin
from src.database.database import Base
from src.utils import generate_random_alphanum
# from src.modules.products.models import Product


class User(Base, BaseMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(40), index=True, unique=True, nullable=True
    )
    phone_number: Mapped[str] = mapped_column(index=True, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(index=True, unique=True, nullable=True)
    password: Mapped[str] = mapped_column(nullable=True)
    full_name = mapped_column(String(40), nullable=True)
    age = mapped_column(Integer)
    gender = mapped_column(String)
    location = mapped_column(Text)
    about_me = mapped_column(Text)
    photo = mapped_column(String)
    photo_lock_enabled: Mapped[bool] = mapped_column(default=False, nullable=True)
    user_preferences = mapped_column(
        JSON
    )  # with_omr_sheet, record_elimination technique

    email_verified: Mapped[bool] = mapped_column(default=False, nullable=True)
    phone_verified: Mapped[bool] = mapped_column(default=False, nullable=True)

    roles = mapped_column(ARRAY(String))
    tenant_id = mapped_column(ForeignKey("tenants.id"))
    subscription_id = mapped_column(ForeignKey("subscriptions.id"))
    subscription = relationship(
        "Subscription", lazy="selectin", foreign_keys=[subscription_id]
    )
    fb_device_tokens = mapped_column(ARRAY(String))
    referred_by_id = mapped_column(Integer)
    
    is_superadmin: Mapped[bool] = mapped_column(default=False)
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_onboarded: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_deleted: Mapped[bool] = mapped_column(default=False)
    free_trial_used: Mapped[bool] = mapped_column(default=False, nullable=False)
    test_attempts_count = mapped_column(Integer, default=0)

    user_type = mapped_column(String) #student,workforce
    is_external: Mapped[bool] = mapped_column(default=False)
    tagline = mapped_column(String)

    profiles = relationship("Profile", lazy="selectin")

class Role(Base,BaseMixin):
    __tablename__= "roles"

    role = mapped_column(String, unique=True)
    apps = mapped_column(ARRAY(String))

class Profile(Base, BaseMixin):
    __tablename__ = "profiles"

    profile_type = mapped_column(String, primary_key=True)
    profile_info = mapped_column(JSON)

    user_id = mapped_column(ForeignKey("users.id"), primary_key=True)
    is_active: Mapped[bool] = mapped_column(default=True)

class BranchUser(Base, BaseMixin):
    __tablename__ = "branchusers"

    branch_id = mapped_column(ForeignKey("branches.id"))
    user_id = mapped_column(ForeignKey("users.id"))

class UserRole(Base, BaseMixin):
    __tablename__ = "userroles"

    branch_id = mapped_column(ForeignKey("branches.id"))
    user_id = mapped_column(ForeignKey("users.id"))
    role_id = mapped_column(ForeignKey("roles.id"))   

    __table_args__ = (UniqueConstraint("branch_id", "user_id", "role_id"),) 

class DiscountCode(Base, BaseMixin):
    __tablename__ = "discountcodes"

    coupon_code = mapped_column(String, index=True, nullable=False)
    tenant_id = mapped_column(ForeignKey("tenants.id"))
    discount = mapped_column(Integer)
    currency = mapped_column(String, default="INR")
    discount_type = mapped_column(String, default="PERCENT")
    applicable_plan_id = mapped_column(ForeignKey("plans.id"))
    applicable_product_id = mapped_column(ForeignKey("products.id"))
    applicable_plan = relationship("Plan", lazy="selectin")
    applicable_product = relationship("Product", lazy="selectin")

    max_use_count = mapped_column(Integer, default=1)
    actual_use_count = mapped_column(Integer, default=0)
    shared_with = mapped_column(ARRAY(Integer))
    shared_with_phone_no = mapped_column(ARRAY(String))
    redeemed_by = mapped_column(ARRAY(Integer))

    valid_from = mapped_column(DateTime(timezone=True))
    valid_to = mapped_column(DateTime(timezone=True))

    is_active = mapped_column(Boolean, default=False)
    pg_ref_id = mapped_column(String)

class Plan(Base, BaseMixin):
    __tablename__ = "plans"

    name = mapped_column(String, index=True, nullable=False)
    description = mapped_column(Text)
    tenant_id = mapped_column(ForeignKey("tenants.id"))
    # features = relationship("PlanFeature", lazy="selectin")
    features = mapped_column(ARRAY(JSON))
    rate = mapped_column(Integer)
    currency = mapped_column(String, default="INR")
    billing_frequency = mapped_column(Integer, default=1)
    pg_ref_id = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(default=False)

class Subscription(Base, BaseMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"))
    plan = relationship("Plan", lazy="selectin")
    free_plan = mapped_column(Boolean, default=False, nullable=True)
    discount_id = mapped_column(ForeignKey("discountcodes.id"))
    discount = relationship("DiscountCode", lazy="selectin")
    discount_amount = mapped_column(
        Integer, default=0
    )  # recurring discount applied over plan rate
    adjustment_amount = mapped_column(
        Integer, default=0
    )  # one time adjustment amount over plan rate
    subscription_amount = mapped_column(
        Integer
    )  # recurring subscription amount net of recurring discount
    currency = mapped_column(String, default="INR")
    auto_renew = mapped_column(Boolean, default=False)

    recurring_count = mapped_column(Integer, default=30)
    start_at = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    current_expiry_at = mapped_column(DateTime(timezone=True), nullable=False)

    payment_status = mapped_column(String, default="PENDING")
    free_trial = mapped_column(Boolean, default=False)

    subscription_status = mapped_column(String, default="INACTIVE")
    # auth_req_id = mapped_column(
    #     UUID(as_uuid=True), server_default=func.gen_random_uuid()
    # )
    auth_req_id = mapped_column(String)
    pg_ref_id = mapped_column(String)  # pg subs id
    pg_data = mapped_column(JSON)
    recurring_task_id = mapped_column(String)
    subs_uuid = mapped_column(UUID(as_uuid=True), server_default=func.gen_random_uuid())
    subs_id = mapped_column(String, default=generate_random_alphanum)  # subs id for pg merchantSubscriptionId


class Transaction(Base, BaseMixin):
    __tablename__ = "transactions"

    paid_by = mapped_column(ForeignKey("users.id"))
    paid_to = mapped_column(ForeignKey("users.id"))
    subscription_id = mapped_column(ForeignKey("subscriptions.id"))
    # purchase_id = mapped_column(ForeignKey("purchases.id"))
    # purchaseinstallment_id = mapped_column(ForeignKey("purchaseinstallments.id"))
    amount = mapped_column(Integer)
    currency = mapped_column(String, default="INR")
    payment_mode = mapped_column(String)
    description = mapped_column(String)
    pg_ref_id = mapped_column(String)  # pg tx provider_reference_id  #phonepe's tx id for pay # paymentid of razorpay paymentlink
    pg_data = mapped_column(JSON)
    tx_data = mapped_column(JSON)

    tx_uuid = mapped_column(UUID(as_uuid=True), server_default=func.gen_random_uuid())
    tx_id = mapped_column(String)  # tx id for auth tx or recurring debit tx  # phonepe's unique merchantTransactionId # ref if of razorpay
    tx_at = mapped_column(DateTime(timezone=True))
    tx_type = mapped_column(String)
    tx_status = mapped_column(String)

class UserQuota(Base, BaseMixin):
    __tablename__ = "userquotas"
    user_id = mapped_column(ForeignKey("users.id"))
    #for subs
    subscription_id = mapped_column(ForeignKey("subscriptions.id"))
    plan_id = mapped_column(ForeignKey("plans.id"))
    plan_name = mapped_column(String, index=True)
    feature_name = mapped_column(String, index=True)
    quota_name = mapped_column(String, index=True)
    #for products
    purchase_id = mapped_column(ForeignKey("purchases.id"))
    product_id = mapped_column(ForeignKey("products.id"))

    # Test_type = mapped_column(String)
    quota_consumed = mapped_column(Integer, default=1)

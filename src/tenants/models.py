from src.base.models import BaseMixin
from src.database.database import Base
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, Boolean, JSON, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import ARRAY


class Tenant(Base, BaseMixin):
    __tablename__ = "tenants"
    name: Mapped[str] = mapped_column(String, nullable=False)
    domain = mapped_column(String, unique=True, nullable=False)
    logo = mapped_column(String, nullable=True)
    tag_line = mapped_column(String, nullable=True)

    company_name = mapped_column(String)
    company_info = mapped_column(
        JSON
    )  # PAN, GSTN, Reg#, email, phone, website, contact person
    legal_entities = mapped_column(ARRAY(JSON)) # Name, pic,Registration no,Pan no,GSTN,GSTN rate,Ph no
    is_active = mapped_column(Boolean, default=True)

    # tenant_admin_id = mapped_column(ForeignKey("users.id"))
    # tenant_admin = relationship("User", lazy="selectin")

class Branch(Base, BaseMixin):
    __tablename__ = "branches"
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    address = mapped_column(String)
    photo = mapped_column(String)
    city = mapped_column(String)
    pincode = mapped_column(Integer)
    phone_number = mapped_column(String)
    email = mapped_column(String)
    status = mapped_column(String)
    tenant_id = mapped_column(ForeignKey("tenants.id"))
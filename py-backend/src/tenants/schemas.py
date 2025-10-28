from enum import Enum
from typing import Any, Optional
from src.base.schemas import BaseSchema, PhoneNumber
from pydantic import EmailStr, AnyUrl, constr, field_validator, Field
from pydantic_core import Url


class TenantBase(BaseSchema):
    name: str
    domain: str = Field(
        min_length=1,
        max_length=253,
        pattern=r"^[a-zA-Z0-9-]{1,63}(\.[a-zA-Z0-9-]{1,63})*$",
    )

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str):
        labels = v.split(".")
        if len(labels) < 2:
            raise ValueError(
                "Invalid domain name. At least two labels (domain and top-level domain) are required."
            )
        for label in labels:
            if not label or label[0] == "-" or label[-1] == "-":
                raise ValueError(f"Invalid label: {label}")

            if "--" in label:
                raise ValueError(
                    f"Invalid label: {label}, contains consecutive hyphens"
                )

        return v

class BranchStatus(str, Enum):
    active = "ACTIVE"
    inactive = "INACTIVE"

class LegalEntityStatus(str, Enum):
    active = "ACTIVE"
    inactive = "INACTIVE"    

class CompanyInfo(BaseSchema):
    PAN: str | None = None
    GSTIN: str | None = None
    reg_no: str | None = None
    address: str | None = None
    website: AnyUrl | None = None
    contact_person: str | None = None
    email: EmailStr | None = None
    phone_number: PhoneNumber | None = None

class LegalEntity(BaseSchema):
    name: str
    reg_no: str | None = None
    pan_no: str | None = None
    GSTIN: str | None = None
    GST_rate: int | None = None
    photo: str | None = None
    phone_number: PhoneNumber | None = None
    status: LegalEntityStatus = LegalEntityStatus.inactive
    ##razorpay fields
    merchant_id: str | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None


class LegalEntityBase(BaseSchema):
    pass

class LegalEntityCreate(LegalEntityBase):
    tenant_id: int | None = None # this field is to get and update the tenant
    name: str 
    reg_no: str | None = None
    pan_no: str | None = None
    GSTIN: str | None = None
    GST_rate: int | None = None
    photo: str | None = None
    phone_number: PhoneNumber | None = None
    status: LegalEntityStatus = LegalEntityStatus.inactive
     ##razorpay fields
    merchant_id: str | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None



class LegalEntityUpdate(LegalEntityBase):
    name: str | None = None
    reg_no: str | None = None
    pan_no: str | None = None
    GSTIN: str | None = None
    GST_rate: int | None = None
    photo: str | None = None
    phone_number: PhoneNumber | None = None
     ##razorpay fields
    merchant_id: str | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None



class LegalEntityResponse(LegalEntityBase):
    name: str | None = None
    reg_no: str | None = None
    pan_no: str | None = None
    GSTIN: str | None = None
    GST_rate: int | None = None
    photo: str | None = None
    phone_number: PhoneNumber | None = None
    status: LegalEntityStatus = LegalEntityStatus.inactive
     ##razorpay fields
    merchant_id: str | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None


   

class TenantCreate(TenantBase):
    company_name: str | None = None
    logo: str | None = None
    tag_line: str | None = None
    company_info: CompanyInfo | None = None
    legal_entities: list[LegalEntityResponse] | None = None
    

class TenantUpdate(TenantCreate):
    name: str | None = None
    domain: str | None = None
    is_active: bool | None = None


class TenantResponse(TenantUpdate):
    id: int
    is_active: bool


class GetTenantResponse(TenantResponse):
    total_students: int | None = None
    total_paid_students: int | None = None
    free_users: int | None = None


class BranchBase(BaseSchema):
    pass

class BranchCreate(BranchBase):
    name: str
    address: str | None = None
    photo:str | None = None
    city:str | None = None
    pincode:int | None = None 
    phone_number: PhoneNumber | None = None
    email:str | None = None
    status:BranchStatus | None = None
    tenant_id:int | None = None

class BranchUpdate(BranchCreate):
    name: str | None = None
    address: str | None = None
    photo:str | None = None
    city:str | None = None
    pincode:int | None = None 
    phone_number: PhoneNumber | None = None
    email:str | None = None  

class BranchResponse(BranchUpdate):
    id:int | None = None
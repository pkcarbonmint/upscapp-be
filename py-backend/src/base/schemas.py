from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, GetCoreSchemaHandler
from pydantic_core import PydanticCustomError, core_schema
from pydantic.alias_generators import to_camel, to_snake
import phonenumbers
from typing import TypeVar, Generic, Any
from datetime import date, datetime


class IOrderEnum(str, Enum):
    ascendent = "ascendent"
    descendent = "descendent"


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        extra="ignore",
        use_enum_values=True
    )
    

SchemaType = TypeVar("SchemaType")

class PhoneNumber(str):
    """
    An international phone number E164
    """

    supported_regions: list[str] = sorted(phonenumbers.SUPPORTED_REGIONS)
    supported_formats: list[str] = sorted(
        [f for f in phonenumbers.PhoneNumberFormat.__dict__.keys() if f.isupper()]
    )

    default_region_code: str | None = None
    phone_format: str = "E164"
    min_length: int = 7
    max_length: int = 64

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source: type[Any], handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.with_info_after_validator_function(
            cls._validate,
            core_schema.str_schema(
                min_length=cls.min_length, max_length=cls.max_length
            ),
        )

    @classmethod
    def _validate(cls, phone_number: str, _: core_schema.ValidationInfo) -> str:
        try:
            parsed_number = phonenumbers.parse(phone_number, cls.default_region_code)
        except phonenumbers.phonenumberutil.NumberParseException as exc:
            raise PydanticCustomError(
                "value_error", "value is not a valid phone number"
            ) from exc
        if not phonenumbers.is_valid_number(parsed_number):
            raise PydanticCustomError(
                "value_error", "value is not a valid phone number"
            )

        return phonenumbers.format_number(
            parsed_number, getattr(phonenumbers.PhoneNumberFormat, cls.phone_format)
        )

class Pagination(BaseSchema):
    total_count: int
    page: int
    items_per_page: int
    has_more: int
    
class ResponseBaseSchema(BaseSchema):
    msg: str =  "Action completed"
    success: bool = False

class ResponseSchema(ResponseBaseSchema, Generic[SchemaType]):
    data: SchemaType | None = None
    meta: dict[str,Any] | None = None

class ResponseListSchema(ResponseBaseSchema, Generic[SchemaType]):
    data: list[SchemaType] = []
    meta: dict[str,Any] | None = None

class ResponsePaginatedSchema(ResponseBaseSchema, Generic[SchemaType]):
    data: list[SchemaType] = []
    pagination: Pagination
    meta: dict[str,Any] | None = None
    

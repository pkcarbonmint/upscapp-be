from pydantic import BaseModel
from src.base.schemas import BaseSchema

class LeadData(BaseModel):    
    First_Name: str | None = None
    Last_Name:str | None = None
    Phone: str | None = None
    Email: str | None = None
    Interested_in_Program: str | None = None
    Location: str | None = None
    Lead_Source: str | None = None
    
class ZohoData(BaseModel):
    data: list[LeadData]




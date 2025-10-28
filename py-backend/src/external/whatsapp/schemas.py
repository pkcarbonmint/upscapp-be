from typing import Optional
from src.base.schemas import BaseSchema


class ReminderData(BaseSchema):
     student_id: int # e.g., "S-0987"
     admission_id: int
     student_name: str # e.g., "John Doe"
     phone_number: str # e.g., "919876543210"
     course_name: str # e.g., "IAS Coaching"
     branch_name: str # e.g., "Delhi" 
     purchase_id: int
     installment_date: Optional[str] # ISO format: "2025-11-15" 
     installment_count: Optional[int] # current installment number
     total_installments: Optional[int] # total installments
     installment_amount: Optional[float] # this installment amount 
    #  remaining_amount: Optional[float] # balance left

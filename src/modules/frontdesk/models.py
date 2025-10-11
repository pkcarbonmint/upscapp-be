from src.base.models import BaseMixin
from src.database.database import Base
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, Boolean, JSON, ForeignKey, Integer, DateTime,UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY


class Walkin(Base, BaseMixin):
    __tablename__ = "walkins"

    user_id = mapped_column(ForeignKey("users.id"))
    profile_details = mapped_column(JSON)
    education_details = mapped_column(JSON)
    parent_details = mapped_column(JSON)
    address_details = mapped_column(JSON)
    upsc_details = mapped_column(JSON)
    employment_details = mapped_column(JSON)
    questionnaire = mapped_column(JSON)
    counselling = mapped_column(JSON)
    #addition details
    family_details = mapped_column(JSON)  
    school_edu_details = mapped_column(JSON) 
    course_details = mapped_column(JSON) 
    accommodation_details = mapped_column(JSON)  
    exam_info = mapped_column(JSON)  
    coaching_info = mapped_column(JSON) 
    daf_details = mapped_column(JSON) 
    previous_transcripts = mapped_column(ARRAY(JSON)) 
    walkin_category = mapped_column(String)
    walkin_type = mapped_column(String) # Full , Quick
    admission_id = mapped_column(ForeignKey("admissions.id"))
    admission = relationship("Admission", lazy = "joined")
    remarks = mapped_column(JSON)
    status = mapped_column(String)
    
class Admission(Base, BaseMixin):
    __tablename__ = "admissions"

    user_id = mapped_column(ForeignKey("users.id"))
    admission_date = mapped_column(DateTime(timezone=True))
    branch_id = mapped_column(ForeignKey("branches.id"))
    status = mapped_column(String)
    signed_admission_form_url = mapped_column(String)
    admission_details = mapped_column(JSON)
    user = relationship("User", lazy="joined") 
    branch = relationship("Branch", lazy="joined")
   
class MasterData(Base,BaseMixin):
    __tablename__ = "masterdata"

    category: Mapped[str] = mapped_column(String, nullable=False, index=True)  # e.g., QUALIFICATION, SPECIALISATION
    sub_category =  mapped_column(Integer, nullable=True)
    value: Mapped[str] = mapped_column(String, nullable=False)  # Possible values
    description: Mapped[str] = mapped_column(String, nullable=True)
    is_verified = mapped_column(Boolean, default= False)
    created_by = mapped_column(Integer,nullable=True) # user_id

    __table_args__ = (UniqueConstraint("category", "value"),) 

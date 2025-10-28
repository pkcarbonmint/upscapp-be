from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, JSON, String, DateTime, Integer, Boolean, UniqueConstraint
from src.base.models import BaseMixin
from src.database.database import Base
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import ARRAY

class StudyPlan(Base,BaseMixin):
    __tablename__ = "studyplans"

    name: Mapped[str] = mapped_column(String, nullable=True)
    offering_id: Mapped[int] = mapped_column(ForeignKey("offerings.id"))
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=True)
    created_by_id = mapped_column(ForeignKey("users.id"))
    created_by = mapped_column(JSON)
    last_updated_by = mapped_column(JSON)
    status = mapped_column(String) # draft, published
    remarks = mapped_column(String, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False)

class PlanTask(Base,BaseMixin):
    __tablename__ = "plantasks"

    name: Mapped[str] = mapped_column(String, nullable=True)
    task_seq_id: Mapped[int] = mapped_column(Integer)
    task_type: Mapped[str] = mapped_column(String)
    studyplan_id: Mapped[int] = mapped_column(ForeignKey("studyplans.id"))
    papers = mapped_column(ARRAY(JSON), nullable=True)		
    subjects = mapped_column(ARRAY(JSON), nullable=True)	
    topics = mapped_column(ARRAY(JSON), nullable=True)	
    subject_area = mapped_column(String)
    test_id = mapped_column(ForeignKey("tests.id"), nullable=True)
    study_materials = mapped_column(ARRAY(JSON), nullable=True)	
    planned_time = mapped_column(Integer)
    planned_completion_date = mapped_column(DateTime(timezone=True), nullable=True)		
    actual_completion_date = mapped_column(DateTime(timezone=True), nullable=True)		
    target_marks = mapped_column(Integer)
    links = mapped_column(ARRAY(String))
    mentorship_meetings = mapped_column(ARRAY(JSON))
    reference_materials = mapped_column(ARRAY(String))
    created_by_id = mapped_column(ForeignKey("users.id"))
    created_by = mapped_column(JSON)
    last_updated_by = mapped_column(JSON)
    remarks = mapped_column(String, nullable=True)
    status = mapped_column(String) # open, closed, in progress
    is_deleted: Mapped[bool] = mapped_column(default=False)

class StudyPlanUser(Base,BaseMixin):
    __tablename__ = "studyplanusers"
    
    studyplan_id: Mapped[int] = mapped_column(ForeignKey("studyplans.id"))
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    enrollment_id: Mapped[int] = mapped_column(ForeignKey("enrollments.id"))
    status = mapped_column(String)# open, completed
    is_deleted: Mapped[bool] = mapped_column(default=False)

    __table_args__ = (UniqueConstraint("studyplan_id", "purchase_id", "product_id","student_id"),)


class PlanTaskUser(Base,BaseMixin):
    __tablename__ = "plantaskusers"

    plantask_id: Mapped[int] = mapped_column(ForeignKey("plantasks.id"))
    studyplan_id: Mapped[int] = mapped_column(ForeignKey("studyplans.id"))
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    planned_completion_date = mapped_column(DateTime(timezone=True), nullable=True)		
    actual_completion_date = mapped_column(DateTime(timezone=True), nullable=True)	
    # enrollment_id: Mapped[int] = mapped_column(ForeignKey("enrollments.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))   
    student_remarks = mapped_column(ARRAY(JSON),nullable=True)
    teacher_remarks = mapped_column(ARRAY(JSON),nullable=True)
    status = mapped_column(String)# open, closed, in progress, completed
    is_deleted: Mapped[bool] = mapped_column(default=False)

    __table_args__ = (UniqueConstraint("plantask_id", "studyplan_id", "purchase_id","student_id"),)
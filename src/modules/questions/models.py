from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    String,
    Text,
    JSON,
    ARRAY,
    ForeignKey,
    Integer,
    DateTime,
    func,
    Enum,
    Float,
    Boolean,
    UniqueConstraint,
)
from src.base.models import BaseMixin
from src.database.database import Base


class Question(Base, BaseMixin):
    __tablename__ = "questions"

    tenant_id = mapped_column(ForeignKey("tenants.id"))  # tenant identifier
    question_type = mapped_column(String)  # mcq or sq or cq
    question = mapped_column(Text)
    max_marks = mapped_column(Float)
    negative_marks = mapped_column(Float)

    # mcq specific fields
    options = mapped_column(ARRAY(JSON))
    explanation = mapped_column(Text)
    is_multi = mapped_column(Boolean)
    question_form = mapped_column(String)

    # sq specific fields
    model_solution = mapped_column(Text)

    # cq specific fields
    context = mapped_column(String)

    # common fields
    cms_id = mapped_column(Integer)
    q_num = mapped_column(Integer, default=1)
    exam = mapped_column(JSON)
    # stages = mapped_column(ARRAY(JSON))
    paper = mapped_column(JSON)
    subject = mapped_column(JSON)
    topic = mapped_column(JSON)
    source = mapped_column(ARRAY(JSON))
    difficulty_level = mapped_column(String)
    reference_material = mapped_column(Text)
    category = mapped_column(String)

    publishing_status = mapped_column(String)
    is_private = mapped_column(Boolean)
    is_deleted = mapped_column(Boolean, default=False)
    is_current_affairs = mapped_column(Boolean, default=False)
    current_affairs_topic = mapped_column(JSON)

    reports = relationship("QuestionReport")

    # question level performance aggregates
    correct_attempts_percent = mapped_column(Float)
    attempts_count = mapped_column(Integer)

    # tests = relationship("Test", secondary="testquestions")

    __table_args__ = (UniqueConstraint("cms_id", "q_num", "question_type"),)


class QuestionReport(Base, BaseMixin):
    __tablename__ = "questionreports"

    question_id = mapped_column(ForeignKey("questions.id"))
    reported_by_id = mapped_column(ForeignKey("users.id"))
    reported_by = relationship("User", lazy="selectin")
    reason = mapped_column(String)
    remarks = mapped_column(Text)
    is_resolved = mapped_column(Boolean, default=False)
    question = relationship("Question", lazy="selectin")

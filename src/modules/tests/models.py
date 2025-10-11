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
    DATE,
)
from sqlalchemy.dialects.postgresql import ARRAY
from src.base.models import BaseMixin, BaseMixinNoKey
from src.database.database import Base
from src.modules.questions.models import Question


class Test(Base, BaseMixin):
    __tablename__ = "tests"

    title: Mapped[str] = mapped_column(index=True, nullable=False)
    exam = mapped_column(JSON, nullable=False)  # upsc, apsc etc.
    stage = mapped_column(JSON)  # prelims or mains or advanced etc.
    paper = mapped_column(JSON)  # specific paper for exam and stage
    test_size = mapped_column(Integer)  # max questions entered by user

    subjects = mapped_column(ARRAY(JSON))
    topics = mapped_column(ARRAY(JSON))
    source = mapped_column(ARRAY(JSON))
    # include_prev_year = mapped_column(Boolean, default=True)
    include_attempted = mapped_column(Boolean, default=False)
    difficulty_level = mapped_column(String)  # easy,medium, difficult

    # duration of test in minutes based on paper duration per question and actual question count
    max_duration = mapped_column(Float)
    max_marks = mapped_column(Float)
    questions_count = mapped_column(Integer)  # fetched questions from cms

    questions = relationship("TestQuestion", lazy="selectin")
    test_download_url = mapped_column(String)

    shares = relationship("TestShare", lazy="selectin")

    test_type = mapped_column(String)  # custom/today’s/PYQ/Model/CurrentAffairs
    is_daily_test = mapped_column(Boolean, default=False)
    is_current_affairs = mapped_column(Boolean, default=False)
    question_mode = mapped_column(String)
    is_full_length = mapped_column(Boolean, default=False)
    daily_test_date = mapped_column(DATE)
    select_exam_year = mapped_column(Integer)
    is_recommended = mapped_column(Boolean, default=False)
    is_active = mapped_column(Boolean, default=True)
    test_status = mapped_column(String, default="PENDING")  # pending, ready
    created_by_id = mapped_column(ForeignKey("users.id"))
    created_by = relationship("User", lazy="selectin")
    tenant_id = mapped_column(ForeignKey("tenants.id"))

    # test level performance aggregates
    avg_score = mapped_column(Float)
    max_score = mapped_column(Float)

    avg_accuracy = mapped_column(Float)
    avg_time_per_q = mapped_column(Float)

    attempts_count = mapped_column(Integer, default=0)


class TestQuestion(Base, BaseMixinNoKey):
    __tablename__ = "testquestions"
    test_id = mapped_column(ForeignKey("tests.id"), primary_key=True)
    question_id = mapped_column(ForeignKey("questions.id"), primary_key=True)
    tq_order = mapped_column(Integer, default=1)
    question = relationship("Question", lazy="selectin")

    # add additional fields for evaluation - max marks, neg marks, duration, q_type
    max_marks = mapped_column(Float)
    negative_marks = mapped_column(Float)
    duration = mapped_column(Float)

    # test question level performance aggregates
    correct_attempts_percent = mapped_column(Float)

    attempts_count = mapped_column(Integer)

    attempts_percent = mapped_column(Float)


class TestAttempt(Base, BaseMixin):
    __tablename__ = "testattempts"

    test_id = mapped_column(ForeignKey("tests.id"))
    attempted_by_id = mapped_column(ForeignKey("users.id"))
    plantask_id = mapped_column(Integer,ForeignKey("plantasks.id"), nullable=True)# for task related test attempts
    is_physical_test_attempt = mapped_column(Boolean,default=False)# for bulk test attempt upload in physical attempts
    product_id = mapped_column(Integer,ForeignKey("products.id"), nullable=True) # for bulk test attempt upload, not using now
    is_qbank_attempt = mapped_column(Boolean,default=False) # for q bank attempts
    test_attempt_mode = mapped_column(String, default="EXAM")
    in_app_answering = mapped_column(Boolean) # for mains
    record_elimination = mapped_column(Boolean, default=False)
    with_omr_sheet = mapped_column(Boolean, default=False)
    status = mapped_column(
        String, default="ONGOING"
    )  # ongoing, paused, submitted, completed
    score = mapped_column(Float)
    macro_comment = mapped_column(JSON)  # for mains
    answer_upload_url = mapped_column(String)
    evaluation_upload_url = mapped_column(String)
    re_evaluation_upload_url = mapped_column(String)
    re_evaluation_requested = mapped_column(Boolean, default=False)
    re_evaluation_reason = mapped_column(String)
    re_evaluation_request_date = mapped_column(DateTime(timezone=True), nullable=True)


    time_elapsed = mapped_column(Float)
    correct = mapped_column(Integer)
    incorrect = mapped_column(Integer)
    unattempted = mapped_column(Integer)
    
    submitted_date = mapped_column(DateTime(timezone=True), nullable=True)
    test_evaluation_status = mapped_column(String) # unassigned, assigned, in progress, evaluated, accepted, rejected
    
    test = relationship("Test", lazy="selectin")


class TestQuestionAttempt(Base, BaseMixinNoKey):
    __tablename__ = "testquestionattempts"

    test_attempt_id = mapped_column(ForeignKey("testattempts.id"), primary_key=True)
    question_id = mapped_column(ForeignKey("questions.id"), primary_key=True)
    test_id = mapped_column(ForeignKey("tests.id"))
    attempted_by_id = mapped_column(ForeignKey("users.id"))
    micro_comment = mapped_column(String)  # for mains
    time_elapsed = mapped_column(Float)
    answer_text = mapped_column(Text) # for sq
    selected_options = mapped_column(ARRAY(JSON))
    elimination_technique = mapped_column(String)
    is_correct_attempt = mapped_column(Boolean)
    marks_obtained = mapped_column(Float, default=0)
    is_starred = mapped_column(Boolean)

    question = relationship("Question")


class TestShare(Base, BaseMixin):
    __tablename__ = "testshares"
    test_id = mapped_column(ForeignKey("tests.id"))
    shared_with_id = mapped_column(ForeignKey("users.id"))
    shared_by_id = mapped_column(ForeignKey("users.id"))
    shared_with = relationship("User", foreign_keys=[shared_with_id], lazy="selectin")
    shared_by = relationship("User", foreign_keys=[shared_by_id], lazy="selectin")
    test = relationship("Test", back_populates="shares")


class QuestionFavorite(Base, BaseMixin):
    __tablename__ = "questionfavorites"
    question_id = mapped_column(ForeignKey("questions.id"))
    question = relationship("Question", lazy="selectin")
    marked_by_id = mapped_column(ForeignKey("users.id"))
    is_favorite = mapped_column(Boolean)


class TestEvaluation(Base, BaseMixin):
    __tablename__ = "testevaluations"

    test_attempt_id = mapped_column(ForeignKey("testattempts.id"))
    
    evaluator_id = mapped_column(ForeignKey("users.id"))  # Details about the evaluator
    reviewer_id = mapped_column(ForeignKey("users.id"))  # Details about the reviewer
    
    is_reevaluation = mapped_column(Boolean, default=False)

    score = mapped_column(Float, nullable=True)

    evaluated_questions = mapped_column(ARRAY(JSON))

    evaluation_annotation = mapped_column(Text)
    re_evaluation_annotation = mapped_column(Text)

    status = mapped_column(
        String
    )  # assigned,inprogress, evaluated, accepted, rejected, withdrawn

    # Timestamps for each action
    assigned_at = mapped_column(DateTime(timezone=True), nullable=True)
    evaluated_at = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at = mapped_column(DateTime(timezone=True), nullable=True)
    withdrawn_at = mapped_column(DateTime(timezone=True), nullable=True)

    # Additional comments or reasons for rejection/withdrawal
    comments = mapped_column(String)

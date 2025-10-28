from uuid import UUID
from src.base.service import BaseService
from src.users.models import User
from .schemas import *
from .models import *
from sqlalchemy import cast, or_, select, and_, desc, asc, func, literal_column, text, case, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.auth.exceptions import AuthorizationFailed, NotFound


class QuestionService(BaseService[Question, QuestionCreate, QuestionUpdate]):
    async def get_unique_constraint_q(
        self,
        cms_id: int,
        q_num: int,
        question_type: str,
        db_session: AsyncSession | None = None,
    ) -> Question:
        session = db_session 
        query = select(self.model).where(
            self.model.cms_id == cms_id,
            self.model.q_num == q_num,
            self.model.question_type == question_type,
        )
        question_report = await session.execute(query)

        return question_report.scalar_one_or_none()

    async def get_questions_by_cms_id_type(
        self,
        *,
        cms_id: int,
        question_type: str,
        # value: int | UUID | str,
        # field: str,
        db_session: AsyncSession | None = None,
    ) -> list[Question]:
        session = db_session 
        response = await session.execute(
            select(self.model).where(
                self.model.cms_id == cms_id,
                self.model.question_type == question_type,
                # select(self.model).where(
                #     self.model.__getattribute__(self.model, field) == value
                # )
            )
        )
        return response.scalars().all()


class QuestionReportService(
    BaseService[QuestionReport, QuestionReportCreate, QuestionReportUpdate]
):
    async def get_user_q_report(
        self,
        user_id: int,
        question_id: int,
        db_session: AsyncSession | None = None,
    ) -> QuestionReport:
        session = db_session 
        query = select(self.model).where(
            self.model.reported_by_id == user_id,
            self.model.question_id == question_id,
        )
        question_report = await session.execute(query)

        return question_report.scalar_one_or_none()
    
    async def get_user_q_report_v2(
        self,
        user_id: int| None = None,
        question_id: int| None = None,
        user_name: str | None = None,
        user_phno: str | None = None,
        reported_date: datetime | None = None,
        exam_ids: list[int] | None = None,
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
        is_resolved: bool | None = None,
        offset:int | None = None,
        limit: int | None = None

    ) -> QuestionReport:
        session = db_session 
        query = select(self.model).select_from(self.model).join(User,User.id == self.model.reported_by_id).join(Question, Question.id == self.model.question_id).where(
            self.model.reported_by_id == user_id if user_id else True,
            self.model.question_id == question_id if question_id else True,
            self.model.created_at == reported_date if reported_date else True,
            # cast(self.model.reported_by.op("->>")("full_name"),String).like(user_name) if user_name else True,
            User.full_name.ilike(f"%{user_name}%") if user_name else True,
            User.phone_number.ilike(f"%{user_phno}%") if user_phno else True,
            cast(self.model.reported_by.op("->>")("phone_number"),String).like(user_phno) if user_phno else True,
            cast(Question.exam.op("->>")("id"), Integer).in_(exam_ids) if exam_ids else True,
            cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
            cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
            if subject_ids
            else True,
            cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
            if topic_ids
            else True,
        ).limit(limit).offset(offset)
        if is_resolved is not None:
            if is_resolved is False:
                query = query.where(or_( self.model.is_resolved.is_(None),
                self.model.is_resolved.is_(False)))
            else:
                query = query.where(self.model.is_resolved.is_(True))
        question_report = await session.execute(query)

        return question_report.mappings().all()

    async def get_q_reports(
        self,
        question_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[QuestionReport]:
        session = db_session 
        query = select(self.model).where(
            self.model.question_id == question_id,
        )
        question_report = await session.execute(query)

        return question_report.scalars().all()

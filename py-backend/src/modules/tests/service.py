import pytz
from src.base.service import BaseService
from fastapi import HTTPException
from src.external.cms.service import get_paper_ids
from src.modules.products.models import Product

from src.users.schemas import USER_ROLE
from .schemas import *
from .models import *
from sqlalchemy import (
    select,DECIMAL,
    or_,
    and_,
    desc,
    asc,
    func,
    literal_column,
    text,
    case,
    update,
    outerjoin,
    column,
    cast,
    join,
    Numeric,
    distinct,
)
from datetime import timedelta

# from sqlalchemy.dialects.postgresql import json
from sqlalchemy.dialects.postgresql import JSON, aggregate_order_by, ARRAY,JSONB
from sqlalchemy.orm import joinedload, aliased
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.questions.routes import question_service
from sqlalchemy import exc
from src.users.models import User
from src.modules.questions.models import QuestionReport
from .exceptions import AttemptNotFound, TestQuestionAttemptNotFound


class TestService(BaseService[Test, TestCreate, TestUpdate]):
    async def get_admin_tests_all(
        self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
       limit: int = 120, offset: int = 0
    ) -> list[Test]:
        session = db_session 
        count_subquery = select(func.count(self.model.id)).where(
            self.model.is_recommended == True, 
            self.model.tenant_id == tenant_id
        ).scalar_subquery()
        query = (select(self.model,count_subquery.label("total_count")).where(
            self.model.is_recommended == True, self.model.tenant_id == tenant_id
        ).order_by(self.model.created_at.desc()).limit(limit).offset(offset))

        result = await session.execute(query)
        # tests = await self.get_by_field_multi(
        #     field="is_recommended", value=True, db_session=db_session
        # )
        tests = result.all()

        # Extract total_count and tests
        total_count = tests[0][1] if tests else 0
        test_list = [item[0] for item in tests]

        return {"total_count": total_count, "tests": test_list}

    async def get_admin_tests_all_v2(
        self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
        limit: int = 100,
        offset: int = 0,
        test_title: str | None = None,
        exam_id: int | None = None,
        stage_id: int | None = None,
        paper_id: int | None = None,
        subject_id: int | None = None,
        topic_id: str | None = None,
        questions: int | None = None
    ) -> list[Test]:
        session = db_session

        query = select(self.model).where(self.model.is_recommended == True, self.model.tenant_id == tenant_id)

        # Apply Filters
        if test_title:
            query = query.where(self.model.title == test_title)  # Exact match
        if paper_id:
            query =query.where(cast(Test.paper.op("->>")("id"), Integer) == paper_id)
        if exam_id:
            query =query.where(cast(Test.exam.op("->>")("id"), Integer) == exam_id)
        if stage_id:
            query =query.where(cast(Test.stage.op("->>")("id"), Integer) == stage_id)
        if subject_id:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer).label("subject_id"))
                .select_from(func.unnest(self.model.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            query = query.where(func.exists(subject_subquery))

        if topic_id:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer).label("topic_id"))
                .select_from(func.unnest(self.model.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            query = query.where(func.exists(topic_subquery))
        if questions:
            query = query.where(self.model.questions_count <= questions)  # Max no. of questions

        query = query.order_by(desc(self.model.id)).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_prelims_admin_tests(self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
       limit: int = 100, offset: int = 0,
        test_title: str | None = None,
        # exam_id: int | None = None,
        # stage_id: int | None = None,
        paper_id: int | None = None,
        subject_id: int | None = None,
        topic_id: str | None = None,
        questions: int | None = None
    ) -> list[Test]:
        session = db_session 

        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            # cast(Test.exam.op("->>")("id"), Integer) == exam_id,
            # cast(Test.stage.op("->>")("id"), Integer) == stage_id)
            # (Test.exam.op("->>")("name").ilike("%UPSC%")),
            # (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Prelims%")))
            Test.stage.op("->>")("name").ilike("%Prelims%"))

        if test_title:
            query = query.where(self.model.title == test_title)  # Exact match
        if paper_id:
            query = query.where(cast(Test.paper.op("->>")("id"), Integer) == paper_id)
        if subject_id:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer).label("subject_id"))
                .select_from(func.unnest(self.model.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            query = query.where(func.exists(subject_subquery))

        if topic_id:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer).label("topic_id"))
                .select_from(func.unnest(self.model.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            query = query.where(func.exists(topic_subquery))
        if questions:
            query = query.where(self.model.questions_count <= questions)  # Max no. of questions

        query = query.order_by(desc(self.model.id)).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_mains_admin_tests(self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
        limit: int = 100, offset: int = 0,
        test_title: str | None = None,
        # exam_id: int | None = None,
        # stage_id: int | None = None,
        paper_id: int | None = None,
        subject_id: int | None = None,
        topic_id: str | None = None,
        questions: int | None = None
    ) -> list[Test]:
        session = db_session 

        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            # cast(Test.exam.op("->>")("id"), Integer) == exam_id,
            # cast(Test.stage.op("->>")("id"), Integer) == stage_id)
            # (Test.exam.op("->>")("name").ilike("%UPSC%")),
            # (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")))
            Test.stage.op("->>")("name").ilike("%Mains%"))

        if test_title:
            query = query.where(self.model.title == test_title)  # Exact match
        if paper_id:
            query = query.where(cast(Test.paper.op("->>")("id"), Integer) == paper_id)
        if subject_id:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer).label("subject_id"))
                .select_from(func.unnest(self.model.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            query = query.where(func.exists(subject_subquery))

        if topic_id:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer).label("topic_id"))
                .select_from(func.unnest(self.model.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            query = query.where(func.exists(topic_subquery))
        if questions:
            query = query.where(self.model.questions_count <= questions)  # Max no. of questions

        query = query.order_by(desc(self.model.id)).limit(limit).offset(offset)

        result = await session.execute(query)
        return result.scalars().all()

    async def get_recommended_all(
        self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_status == TEST_STATUS.ready,
        )

        tests = await session.execute(query)
        # tests = await self.get_by_field_multi(
        #     field="is_recommended", value=True, db_session=db_session
        # )
        return tests.scalars().all()
    
    async def get_prelims_recommended_all(
        self,
        tenant_id: int,
        stage_ids: list[int],
         paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_status == TEST_STATUS.ready,
            (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
            (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True)
        )
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))

        tests = await session.execute(query)
    
        return tests.scalars().all()

    async def get_my_tests(
        self,
        user_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                self.model,
                func.count(TestAttempt.id).label("attempts_by_me"),
                case((TestShare.shared_with_id == user_id, True), else_=False).label(
                    "shared_with_me"
                ),
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                and_(
                    self.model.id == TestAttempt.test_id,
                    TestAttempt.attempted_by_id == user_id,
                ),
            )
            .outerjoin(
                TestShare,
                and_(
                    self.model.id == TestShare.test_id,
                    TestShare.shared_with_id == user_id,
                ),
            )
            .where(
                or_(
                    self.model.created_by_id == user_id,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    TestShare.shared_with_id == user_id,
                )
            )
            .group_by(self.model.id, TestShare.id, TestAttempt.id)
            .order_by(self.model.id)
        )
        tests = await session.execute(query)

        return tests.all()

    async def get_admin_tests(
        self,
        tenant_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                self.model,
                case((User.id == self.model.created_by_id, User.full_name)).label(
                    "created_by"
                ),
            )
            .select_from(self.model)
            .join(User, User.id == self.model.created_by_id)
            .where(
                self.model.created_by_id == User.id,
                self.model.tenant_id == tenant_id,
                self.model.is_recommended == True,
            )
            .order_by(self.model.id)
        )
        tests = await session.execute(query)

        return tests.all()

    async def get_tests_sharedwith(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 
        query = (
            select(self.model)
            .join(TestShare, TestShare.test_id == self.model.id)
            .where(TestShare.shared_with_id == user_id)
        )
        tests = await session.execute(query)

        return tests.scalars().all()

    async def get_tests_sharedby(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 
        query = (
            select(self.model)
            .join(TestShare, TestShare.test_id == self.model.id)
            .where(TestShare.shared_by_id == user_id)
        )
        tests = await session.execute(query)

        return tests.scalars().all()

    async def get_unattempted_recommended_tests(
        self,
        tenant_id: int,
        user_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 

        subquery = (
            select(
                self.model,
                func.sum(
                    case((TestAttempt.attempted_by_id == user_id, 1), else_=0)
                ).label("attempts_by_me"),
                self.model.test_type.label("type"),
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                TestAttempt.test_id == self.model.id,
            )
            .where(
                self.model.is_recommended == True,
                self.model.tenant_id == tenant_id,
                self.model.is_active == True,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                self.model.test_status == TEST_STATUS.ready,
            )
            .order_by(self.model.created_at.desc())
            .group_by(self.model.id)
        ).subquery()

        query = select(subquery.c.type, subquery).where(subquery.c.attempts_by_me == 0)

        tests = await session.execute(query)

        return tests.all()

    async def get_prelims_unattempted_recommended_tests(
        self,
        tenant_id: int,
        user_id: int,
        stage_ids: list[int],
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session 

        subquery = (
            select(
                self.model,
                func.sum(
                    case((TestAttempt.attempted_by_id == user_id, 1), else_=0)
                ).label("attempts_by_me"),
                self.model.test_type.label("type"),
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                TestAttempt.test_id == self.model.id,
            )
            .where(
                self.model.is_recommended == True,
                self.model.tenant_id == tenant_id,
                self.model.is_active == True,
                 (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                self.model.test_status == TEST_STATUS.ready,
            )
            .order_by(self.model.created_at.desc())
            .group_by(self.model.id)
        ).subquery()

        query = select(subquery.c.type, subquery).where(subquery.c.attempts_by_me == 0)

        tests = await session.execute(query)

        return tests.all()

    async def get_tests_created_count(
        self,
        user_id: int,
        tenant_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(func.count().label("test_created")).where(
            # self.model.is_recommended == False,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.created_by_id == user_id,
            (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
            self.model.test_status == TEST_STATUS.ready
        )

        tests_count = await session.execute(query)
        return tests_count.scalar_one_or_none()
    
    async def get_prelims_tests_created_count(
        self,
        user_id: int,
        tenant_id: int,
        stage_ids: list[int],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(func.count().label("test_created")).where(
            # self.model.is_recommended == False,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.created_by_id == user_id,
            (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
            self.model.test_status == TEST_STATUS.ready
        )

        tests_count = await session.execute(query)
        return tests_count.scalar_one_or_none()

    async def get_test_created_by_paper(
        self,
        user_id: int,
        tenant_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # query = select(self.model).where( 
        #     self.model.tenant_id == tenant_id,
        #     self.model.is_active == True,
        #     (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
        #     self.model.created_by_id == user_id,
        #     self.model.test_status == TEST_STATUS.ready,
        # )

        # tests = await session.execute(query)
        # return tests.scalars().all()
        subquery = (
            select(
                self.model,
                func.sum(
                    case((TestAttempt.attempted_by_id == user_id, 1), else_=0)
                ).label("attempts_by_me"),
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                TestAttempt.test_id == self.model.id,
            )
            .where(
                self.model.is_recommended == False,
                self.model.tenant_id == tenant_id,
                self.model.is_active == True,
                self.model.created_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                self.model.test_status == TEST_STATUS.ready,
            )
            .order_by(self.model.id)
            .group_by(self.model.id)
        ).subquery()

        query = select(subquery).where(subquery.c.attempts_by_me == 0)

        tests = await session.execute(query)

        return tests.all()

    async def get_test_created_by_stages(
        self,
        user_id: int,
        tenant_id: int,
        stage_ids: list[int],
        db_session: AsyncSession | None = None,
    ):
        session = db_session
        query = (
            select(
                func.count(self.model.id)
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                TestAttempt.test_id == self.model.id,
            )
            .where(
                self.model.is_recommended == False,
                self.model.tenant_id == tenant_id,
                self.model.is_active == True,
                self.model.created_by_id == user_id,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                self.model.test_status == TEST_STATUS.ready,
            )
        )


        tests = await session.execute(query)

        return tests.scalar()
    
    async def get_test_created_by_papers(
        self,
        user_id: int,
        tenant_id: int,
        paper_ids: list[int],
        db_session: AsyncSession | None = None,
    ):
        session = db_session
        query = (
            select(
                func.count(self.model.id)
            )
            .select_from(self.model)
            .outerjoin(
                TestAttempt,
                TestAttempt.test_id == self.model.id,
            )
            .where(
                self.model.is_recommended == False,
                self.model.tenant_id == tenant_id,
                self.model.is_active == True,
                self.model.created_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids)),
                self.model.test_status == TEST_STATUS.ready,
            )
        )


        tests = await session.execute(query)

        return tests.scalar()


    async def get_totd_tests(
        self,
        tenant_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        today_date = datetime.now().date()
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.is_daily_test == True,
            (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
            func.date(self.model.daily_test_date) == today_date,
            self.model.test_status == TEST_STATUS.ready,
        )

        tests = await session.execute(query)
        return tests.scalars().all()

    async def get_prelims_totd_tests(
        self,
        tenant_id: int,
        stage_ids: list[int],
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        today_date = datetime.now().date()
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.is_daily_test == True,
            (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
            (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
            func.date(self.model.daily_test_date) == today_date,
            self.model.test_status == TEST_STATUS.ready,
        )
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))

        tests = await session.execute(query)
        return tests.scalars().all()

    async def get_totds_by_date(self, paper_id:int, test_date:date,db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(self.model).where(
            and_(
                self.model.daily_test_date == test_date,
                self.model.test_type == TEST_TYPE.totd,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),

            ),
        )
        tests = await session.execute(query)

        return tests.all()

    async def get_pyq_tests(
        self,
        tenant_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_type == TEST_TYPE.pyq,
            (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
            self.model.test_status == TEST_STATUS.ready,
        )

        tests = await session.execute(query)
        return tests.scalars().all()

    async def get_prelims_pyq_tests(
        self,
        tenant_id: int,
        stage_ids: list[int],
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_type == TEST_TYPE.pyq,
            (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
           (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
            self.model.test_status == TEST_STATUS.ready,
        )
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))

        tests = await session.execute(query)
        return tests.scalars().all()

    async def get_model_tests(
        self,
        tenant_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_type == TEST_TYPE.model,
            (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
            self.model.test_status == TEST_STATUS.ready,
        )

        tests = await session.execute(query)
        return tests.scalars().all()

    async def get_prelims_model_tests(
        self,
        tenant_id: int,
        stage_ids: list[int],
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(self.model).where(
            self.model.is_recommended == True,
            self.model.tenant_id == tenant_id,
            self.model.is_active == True,
            self.model.test_type == TEST_TYPE.model,
            (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
            (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
            self.model.test_status == TEST_STATUS.ready,
        )
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))


        tests = await session.execute(query)
        return tests.scalars().all()


class TestQuestionService(
    BaseService[TestQuestion, TestQuestionCreate, TestQuestionUpdate]
):
    async def get_tq_curate(
        self, test_id: int, db_session: AsyncSession | None = None
    ) -> list[TestQuestion]:
        session = db_session 
        query = (
            select(
                self.model,
            )
            .select_from(self.model)
            .options(joinedload(self.model.question))
            .outerjoin(
                QuestionReport,
                self.model.question_id == QuestionReport.question_id,
            )
            .where(
                self.model.test_id == test_id,
            )
            .order_by(self.model.tq_order.asc(), self.model.created_at.asc())
        )
        test_qs = await session.execute(query)
        return test_qs.scalars().all()

    async def get_test_questions(
        self, test_id: int, user_id: int, db_session: AsyncSession | None = None
    ) -> list[TestQuestion]:
        session = db_session 
        subquery = (
            select(QuestionReport.question_id)
            .where(QuestionReport.reported_by_id == user_id)
            .alias("reported_questions")
        )

        # Construct the main query to get questions and check if they are reported
        stmt = (
            select(
                TestQuestion,
                case(
                    (subquery.c.question_id != None, True),
                    else_=False,
                ).label("is_reported"),
            )
            .where(TestQuestion.test_id == test_id)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(
                subquery,
                subquery.c.question_id == TestQuestion.question_id,
                isouter=True,
            )
            .order_by(self.model.tq_order.asc(), self.model.created_at.asc())
        )

        result = await session.execute(stmt)
        # query = (
        #     select(
        #         self.model,
        #         case(
        #             (QuestionReport.reported_by_id == user_id, True), else_=False
        #         ).label("is_reported"),
        #     )
        #     .select_from(self.model)
        #     .options(joinedload(self.model.question))
        #     .outerjoin(
        #         QuestionReport,
        #         and_(
        #             self.model.question_id == QuestionReport.question_id,
        #             QuestionReport.reported_by_id == user_id,
        #         ),
        #     )
        #     .where(

        #             self.model.test_id == test_id,
        #             QuestionReport.reported_by_id == user_id,

        #     )
        #     .order_by(self.model.tq_order.asc(), self.model.created_at.asc())
        # )
        # test_qs = await session.execute(query)
        return result.all()

    async def get_test_question(
        self, test_id: int, q_id: int, db_session: AsyncSession | None = None
    ) -> TestQuestion:
        session = db_session 
        query = (
            select(self.model)
            .options(joinedload(self.model.question))
            .where(self.model.test_id == test_id, self.model.question_id == q_id)
        )
        test_qs = await session.execute(query)
        return test_qs.unique().scalar_one_or_none()

    async def delete_test_question(
        self, test_id: int, q_id: int, db_session: AsyncSession | None = None
    ) -> TestQuestion:
        session = db_session 
        query = select(self.model).where(
            self.model.test_id == test_id, self.model.question_id == q_id
        )
        response = await session.execute(query)
        obj = response.scalar_one()
        try:
            await session.delete(obj)
            await session.commit()
        except exc.IntegrityError as err:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource delete error" + err.__str__(),
            )

        return obj

    async def get_tq_results(
        self, test_id: int, test_attempt_id: int, user_id:int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        subquery = (
            select(QuestionReport.question_id)
            .where(QuestionReport.reported_by_id == user_id)
            .alias("reported_questions")
        )

        stmt = (
            select(TestQuestion, TestQuestionAttempt, QuestionFavorite,
                   case(
                    (subquery.c.question_id != None, True),
                    else_=False,
                ).label("is_reported"))
            .select_from(TestQuestion)
            .outerjoin(
                TestQuestionAttempt,
                and_(
                    TestQuestion.question_id == TestQuestionAttempt.question_id,
                    TestQuestionAttempt.test_attempt_id == test_attempt_id,
                ),
            )
            .outerjoin(
                QuestionFavorite,
                and_(
                    TestQuestion.question_id == QuestionFavorite.question_id,
                    QuestionFavorite.is_favorite == True,
                ),
            )
            .outerjoin(
                subquery,
                subquery.c.question_id == TestQuestion.question_id,
               
            )
            .where(TestQuestion.test_id == test_id)
            .order_by(self.model.tq_order.asc(), self.model.created_at.asc())
        )

        tq_results = await session.execute(stmt)
        return tq_results.all()


class TestAttemptService(
    BaseService[TestAttempt, TestAttemptCreate, TestAttemptUpdate]
):
    async def get_test_attempts(
        self, test_id: int, attempted_by_id: int, db_session: AsyncSession | None = None
    ) -> list[TestAttempt]:
        session = db_session 
        query = select(self.model).where(
            self.model.test_id == test_id, self.model.attempted_by_id == attempted_by_id
        )
        tests = await session.execute(query)
        # tests = await self.get_by_field_multi(
        #     field="is_recommended", value=True, db_session=db_session
        # )
        return tests.scalars().all()

    async def check_ongoing_test_attempt(
        self, test_id: int, attempted_by_id: int, db_session: AsyncSession | None = None
    ) -> TestAttempt:
        session = db_session 
        query = select(self.model).where(
            self.model.test_id == test_id,
            self.model.attempted_by_id == attempted_by_id,
            or_(
                self.model.status == TEST_ATTEMPT_STATUS.ongoing,
                self.model.status == TEST_ATTEMPT_STATUS.paused,
            ),
        )
        tests = await session.execute(query)
        # tests = await self.get_by_field_multi(
        #     field="is_recommended", value=True, db_session=db_session
        # )
        return tests.scalar_one_or_none()

    async def  get_ongoing_tests(
        self,
        user_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[TestAttempt]:
        session = db_session 
        main_query = (
            select(Test.test_type.label("test_type"), Test.id.label("test_id"))
            .select_from(Test)
            .where(cast(Test.paper.op("->>")("id"), Integer) == paper_id)
            .group_by("test_type", "test_id")
            .subquery()
        )
        query = (
            select(main_query.c.test_type.label("test_type"), (TestAttempt))
            .select_from(TestAttempt)
            .join(main_query, main_query.c.test_id == TestAttempt.test_id)
            .where(
                or_(
                    self.model.status == TEST_ATTEMPT_STATUS.ongoing,
                    self.model.status == TEST_ATTEMPT_STATUS.paused,
                ),
                self.model.attempted_by_id == user_id,
            )
        ) 
 
        tests = await session.execute(query)

        return tests.all()

    async def  get_ongoing_tests_by_testtype(
        self,
        user_id: int,
        test_type: str,
        stage_ids: list[int],
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None
    ) -> list[TestAttempt]:
        session = db_session 
        
        query = (
            select(TestAttempt)
            .select_from(TestAttempt)
            .join(Test,Test.id == TestAttempt.test_id)
            .where(
                or_(
                    self.model.status == TEST_ATTEMPT_STATUS.ongoing,
                    self.model.status == TEST_ATTEMPT_STATUS.paused,
                ),
                self.model.attempted_by_id == user_id,
                Test.test_type == test_type,
                cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids),
                (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True)
            )
        ) 
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))
 
        tests = await session.execute(query)

        return tests.scalars().all()

    async def get_completed_tests(
        self,
        user_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[TestAttempt]:
        session = db_session 

        main_query = (
            select(Test.test_type.label("test_type"), Test.id.label("test_id"))
            .select_from(Test)
            .where(cast(Test.paper.op("->>")("id"), Integer) == paper_id)
            .group_by("test_type", "test_id")
            .subquery()
        )
        query = (
            select(main_query.c.test_type.label("test_type"), (TestAttempt))
            .select_from(TestAttempt)
            .join(main_query, main_query.c.test_id == TestAttempt.test_id)
            .where(
                or_(
                    self.model.status == TEST_ATTEMPT_STATUS.completed,
                    # self.model.status == TEST_ATTEMPT_STATUS.submitted,
                ),
                self.model.attempted_by_id == user_id,
            )
        )

        tests = await session.execute(query)

        return tests.all()
    
    async def  get_completed_tests_by_testtype(
        self,
        user_id: int,
        stage_ids: list[int],
        test_type: str,
        paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        db_session: AsyncSession | None = None,
    ) -> list[TestAttempt]:
        session = db_session 
        
        query = (
            select(TestAttempt)
            .select_from(TestAttempt)
            .join(Test,Test.id == TestAttempt.test_id)
            .where(
                self.model.status == TEST_ATTEMPT_STATUS.completed,
                self.model.attempted_by_id == user_id,
                Test.test_type == test_type,
                cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids),
                (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True)

            )
        ) 
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            query = query.where(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            query = query.where(func.exists(topic_subquery))
 
        tests = await session.execute(query)

        return tests.scalars().all()
    
    async def get_mains_tests_by_status(
        self,
        user_id: int,offset: int, limit:int,
        paper_ids: list[int] = [],
        subject_ids:list[int] =[],
        topic_ids:list[int] = [],  
        test_attempt_mode:TEST_ATTEMPT_MODE | None = None,   
        status: list[str] | None = None,
        is_evaluated: bool | None = None,
        db_session: AsyncSession | None = None,
    ) -> list[TestAttempt]:
        session = db_session 
        filters = []
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            filters.append(func.exists(topic_subquery))
        if is_evaluated:
            filters.append(self.model.test_evaluation_status.in_([TEST_ASSESSMENT_STATUS.evaluated, TEST_ASSESSMENT_STATUS.accepted]))
        if test_attempt_mode:
            filters.append(TestAttempt.test_attempt_mode == test_attempt_mode)
        query = (
            select(Test,TestAttempt)
            .select_from(Test)
            .outerjoin(TestAttempt, TestAttempt.test_id == Test.id)
            .where(
                
                self.model.status.in_(status),
                Test.created_by_id == user_id,
                (Test.exam.op("->>")("name").ilike("%UPSC%")),
                (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")),
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                self.model.attempted_by_id == user_id,
            )
        )
        if filters:
            query = query.where(and_(*filters))
       
        query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        return result.mappings().all()
    

    async def get_unattempted_customized_users_mains_tests_by_status(
        self,
        user_id: int,
        offset: int,
        limit: int,
        paper_ids: list[int] = [],
        subject_ids: list[int] = [],
        topic_ids: list[int] = [],
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session
        filters = []

        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            filters.append(func.exists(topic_subquery))
        # Outer join to check absence of attempts for user
        query = (
            select(Test)
            .outerjoin(
                TestAttempt,
                and_(
                    TestAttempt.test_id == Test.id,
                    TestAttempt.attempted_by_id == user_id
                )
            )
            .where(
                TestAttempt.id.is_(None), 
                Test.created_by_id == user_id,
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                (Test.exam.op("->>")("name").ilike("%UPSC%")),
                (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")), # <-- This ensures no attempt exists
                *filters
            )
            .limit(limit)
            .offset(offset)
        )

        result = await session.execute(query)
        return result.scalars().all()
    
    async def get_prelims_tests_by_status(
        self,
        user_id: int,offset: int, limit:int,
        paper_ids: list[int] = [],
        subject_ids:list[int] =[],
        topic_ids:list[int] = [],  
        test_attempt_mode:TEST_ATTEMPT_MODE | None = None,   
        status: list[str] | None = None,
        is_evaluated: bool | None = None,
        db_session: AsyncSession | None = None,
    ) -> list[TestAttempt]:
        session = db_session 
        filters = []
        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            filters.append(func.exists(topic_subquery))
        if is_evaluated:
            filters.append(self.model.test_evaluation_status.in_([TEST_ASSESSMENT_STATUS.evaluated, TEST_ASSESSMENT_STATUS.accepted]))
        if test_attempt_mode:
            filters.append(TestAttempt.test_attempt_mode == test_attempt_mode)
        query = (
            select(Test,TestAttempt)
            .select_from(Test)
            .outerjoin(TestAttempt, TestAttempt.test_id == Test.id)
            .where(
                
                self.model.status.in_(status),
                Test.created_by_id == user_id,
                (Test.exam.op("->>")("name").ilike("%UPSC%")),
                (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Prelims%")),
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                self.model.attempted_by_id == user_id,
            )
        )
        if filters:
            query = query.where(and_(*filters))
       
        query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        return result.mappings().all()
    

    async def get_unattempted_customized_users_prelims_tests_by_status(
        self,
        user_id: int,
        offset: int,
        limit: int,
        paper_ids: list[int] = [],
        subject_ids: list[int] = [],
        topic_ids: list[int] = [],
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session
        filters = []

        if subject_ids:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_(subject_ids))
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_ids:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer).in_(topic_ids))
            )
            filters.append(func.exists(topic_subquery))
        # Outer join to check absence of attempts for user
        query = (
            select(Test)
            .outerjoin(
                TestAttempt,
                and_(
                    TestAttempt.test_id == Test.id,
                    TestAttempt.attempted_by_id == user_id
                )
            )
            .where(
                TestAttempt.id.is_(None), 
                Test.created_by_id == user_id,
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                (Test.exam.op("->>")("name").ilike("%UPSC%")),
                (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Prelims%")), # <-- This ensures no attempt exists
                *filters
            )
            .limit(limit)
            .offset(offset)
        )

        result = await session.execute(query)
        return result.scalars().all()
    


    async def calculate_test_aggregates(
        self,
        test_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                func.max(self.model.score).label("max_score"),
                func.avg(self.model.score).label("avg_score"),
                # func.count().label("attempts_count")
                case(
                    (
                        TestQuestionAttempt.test_id == test_id,
                        func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                        * 100
                        / func.count(),
                    ),
                    else_=None,
                ).label("avg_accuracy"),
                case(
                    (
                        TestQuestionAttempt.test_id == test_id,
                        func.avg(TestQuestionAttempt.time_elapsed),
                    ),
                    else_=None,
                ).label("avg_time_per_q"),
            )
            .select_from(self.model)
            .join(
                TestQuestionAttempt, TestQuestionAttempt.test_id == self.model.test_id
            )
            .where(self.model.test_id == test_id)
            .group_by(TestQuestionAttempt.test_id)
        )
        aggregate_results = await session.execute(query)

        return aggregate_results.first()._asdict()

    async def get_test_attempts_counts(
        self,
        test_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(func.count().label("attempts_count"))
            .select_from(self.model)
            .where(self.model.test_id == test_id)
        )
        aggregate_results = await session.execute(query)

        return aggregate_results.first()._asdict()

    async def calculate_user_test_attempts(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(func.count().label("attempts_count"))
            .select_from(self.model)
            .where(self.model.attempted_by_id == user_id)
        )
        aggregate_results = await session.execute(query)

        return aggregate_results.first()._asdict()

    async def calc_test_attempts_by_stages(
        self,
        user_id: int,
        stage_ids: list[int],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}
    
    async def calc_main_test_attempts_by_stages(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"),
                   TestAttempt.in_app_answering.label("in_app"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    TestAttempt.status.in_([TEST_ATTEMPT_STATUS.completed,TEST_ATTEMPT_STATUS.submitted]),
                    Test.stage.op("->>")("name").ilike("%Mains%")
                )
            )
            .group_by(TestAttempt.in_app_answering)
        )
        result = await session.execute(query)

        return result.all()
    
    async def calc_ta_count_by_test(
        self,
        test_id:int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.test_id == test_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed ,
                    Test.is_active == True,
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def calc_ta_count(
        self,
        user_id: int,
        paper_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    Test.is_full_length == False,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_active == True,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def calc_ta_count_of_fl(
        self,
        user_id: int,
        paper_id: int,
        from_date: date,
        till_date: date,
        is_full_length: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == is_full_length,
                    Test.is_active == True,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def calc_prelims_ta_count(
        self,
        user_id: int,
        stage_ids: list[int],
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    Test.is_full_length == False,
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    Test.is_active == True,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def calc_prelims_ta_count_of_fl(
        self,
        user_id: int,
        stage_ids: list[int],
        from_date: date,
        till_date: date,
        is_full_length: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                   (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    Test.is_full_length == is_full_length,
                    Test.is_active == True,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def calc_ta_count_by_paper(
        self,
        user_id: int,
        paper_id: int,
        test_type: TEST_TYPE,
        is_full_length: bool,
        test_attempt_mode: bool = TEST_ATTEMPT_MODE.exam,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(TestAttempt.id).label("tests_taken"))
            .select_from(TestAttempt)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    TestAttempt.test_attempt_mode == test_attempt_mode,
                    Test.test_type == test_type,
                    Test.is_full_length == is_full_length,
                    Test.is_active == True,
                )
            )
        )
        result = await session.execute(query)

        return result.scalar_one()  # first._asdict() will give {"tests_taken: count"}

    async def get_performance_trend_papers(
        self,
        user_id: int,
        stage_id: int,
        from_date: date,
        till_date: date,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                (cast(Test.paper.op("->>")("name"), String)).label("paper_name"),
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        Test.title,
                        "test_attempt_id",
                        self.model.id,
                        "test_attempt_date",
                        self.model.updated_at,
                        "score",
                        cast(
                            self.model.score,
                            Numeric(10, 2),
                        ),
                        "percentage",
                        case(
                            (
                                Test.max_marks > 0,
                                cast(
                                    (self.model.score / Test.max_marks) * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_=0,
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(self.model)
            .outerjoin(Test, Test.id == self.model.test_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                    self.model.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(Test.stage.op("->>")("id"), Integer) == stage_id),
                    Test.test_type != TEST_TYPE.custom,
                    Test.is_full_length == full_length_result,
                )
            )
            .group_by("paper_name")
        )
        results = await session.execute(query)
        res = results.all()

        return res

    async def get_performance_trend_papers_v2(
        self,
        user_id: int,
        stage_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                (cast(Test.paper.op("->>")("name"), String)).label("paper_name"),
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        Test.title,
                        "test_attempt_id",
                        self.model.id,
                        "test_attempt_date",
                        self.model.submitted_date,
                        "score",
                        cast(
                            self.model.score,
                            Numeric(10, 2),
                        ),
                        "percentage",
                        case(
                            (
                                Test.max_marks > 0,
                                cast(
                                    (self.model.score / Test.max_marks) * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_=0,
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(self.model)
            .outerjoin(Test, Test.id == self.model.test_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    self.model.status.in_([TEST_ATTEMPT_STATUS.completed,TEST_ATTEMPT_STATUS.submitted]),
                    self.model.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(Test.stage.op("->>")("id"), Integer) == stage_id)
                )
            )
            .group_by("paper_name")
        )
        results = await session.execute(query)
        res = results.all()

        return res


    async def get_performance_trend_subjects(
        self,
        user_id: int,
        paper_id: int,
        from_date: date,
        till_date: date,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = (select(
            Question.subject.label("subj"),
            Question.id.label("question_id"),
        ).subquery())
        
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        
        # Create the main subquery
        # mainquery1 = (
        #     select(
        #         literal_column("(subj->>'name')").label("subject_name"),
        #         tqa.test_attempt_id,
        #         # tqa.updated_at,
        #         func.sum(tqa.marks_obtained).label("total_marks_obtained"),
        #         func.sum(q.max_marks).label("total_max_marks"))
        #     .select_from(tqa)
        #     # .outerjoin(TestQuestion, TestQuestion.question_id == tqa.question_id)
        #     .join(Test, Test.id == tqa.test_id)
        #     .join(q, q.id == tqa.question_id, isouter=True)
        #     .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
        #     .where(
        #         and_(
        #             tqa.attempted_by_id == user_id,
        #             tqa.updated_at.between(
        #                 from_date - timedelta(1), till_date + timedelta(1)
        #             ),
        #             (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
        #             Test.is_full_length == full_length_result,
        #         )
        #     )
        #     .group_by("subject_name", tqa.test_attempt_id)
        #     .subquery()
        # )
        # tqa_subquery = select(
        #     tqa.updated_at.label("updated_at"),
        #     tqa.test_attempt_id.label("ta_id"),
        # ).subquery()

        mainquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                ta.id,ta.updated_at,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))
                .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
               
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status == 'COMPLETED',
                    ta.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(t.paper.op("->>")("id"), Integer) == paper_id),
                    t.test_type != TEST_TYPE.custom,
                    t.is_full_length == full_length_result,
                )).group_by("subject_name",ta.id,ta.updated_at,t.title).subquery()
        )

        # Create the main query
        stmt = (
            select(
                mainquery.c.subject_name,
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.updated_at,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                               and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_= cast(0.0, Numeric(10, 2))
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
            .group_by(mainquery.c.subject_name)
        )
        resp = await session.execute(stmt)

        return resp.all()

    async def get_prelims_performance_trend_subjects(
        self,
        user_id: int,
        stage_ids: list[int],
        from_date: date,
        till_date: date,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = (select(
            Question.subject.label("subj"),
            Question.id.label("question_id"),
        ).subquery())
        
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        mainquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                ta.id,ta.updated_at,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))
                .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
               
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status == 'COMPLETED',
                    ta.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(t.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    t.test_type != TEST_TYPE.custom,
                    t.is_full_length == full_length_result,
                )).group_by("subject_name",ta.id,ta.updated_at,t.title).subquery()
        )

        # Create the main query
        stmt = (
            select(
                mainquery.c.subject_name,
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.updated_at,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                               and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_= cast(0.0, Numeric(10, 2))
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
            .group_by(mainquery.c.subject_name)
        )
        resp = await session.execute(stmt)

        return resp.all()

    async def get_performance_mains_trend_subjects(
        self,
        user_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = (select(
            Question.subject.label("subj"),
            Question.id.label("question_id"),
        ).subquery())
        
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        mainquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                ta.id,ta.submitted_date,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))
                .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
               
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status == 'COMPLETED',
                    ta.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    t.stage.op("->>")("name").ilike("%Mains%"),
                )).group_by("subject_name",ta.id,ta.updated_at,t.title).subquery()
        )

        # Create the main query
        stmt = (
            select(
                mainquery.c.subject_name,
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.submitted_date,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                               and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_= cast(0.0, Numeric(10, 2))
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
            .group_by(mainquery.c.subject_name)
        )
        resp = await session.execute(stmt)

        return resp.all()

    async def get_performance_mains_trend_papers(
            self,
            user_id: int,
            from_date: date,
            till_date: date,
            db_session: AsyncSession | None = None,
        ):
            session = db_session 

            # Step 1: Define the subquery to unnest subjects
            subjects_subquery = (select(
                Question.paper.label("q_paper"),
                Question.id.label("question_id"),
            ).subquery())
            
            # Define aliases for the tables
            tqa = aliased(TestQuestionAttempt)
            q = aliased(Question)
            tq = aliased(TestQuestion)
            ta = aliased(TestAttempt)
            t = aliased(Test)


            mainquery = (
                select(
                    literal_column("(q_paper->>'name')").label("paper_name"),
                    ta.id,ta.submitted_date,
                    t.title,
                    # tqa.updated_at,
                    func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                    func.sum(q.max_marks).label("total_max_marks"),
                    ).select_from(ta)
                    .join(t, ta.test_id == t.id)
                    .join(tq , ta.test_id == tq.test_id)
                    .join(q , tq.question_id == q.id)
                    .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))
                    .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
                
                    .where( and_(
                        ta.attempted_by_id == user_id,
                        ta.status.in_(['COMPLETED']),
                        ta.updated_at.between(
                            from_date - timedelta(1), till_date + timedelta(1)
                        ),
                       t.stage.op("->>")("name").ilike("%Mains%")
                    )).group_by("paper_name",ta.id,ta.updated_at,t.title).subquery()
            )

            # Create the main query
            stmt = (
                select(
                    mainquery.c.paper_name,
                    func.json_agg(
                        func.json_build_object(
                            "test_title",
                            mainquery.c.title,
                            "test_attempt_id",
                            mainquery.c.id,
                            "test_attempt_date",
                            mainquery.c.submitted_date,
                            "score",
                            case(
                                (
                                mainquery.c.total_marks_obtained != None,
                                cast(
                                mainquery.c.total_marks_obtained,
                                Numeric(10, 2),
                                ),
                                ),
                                else_= 0,
                            ),                       
                            "percentage",
                            case(
                                (
                                and_(
                                    mainquery.c.total_max_marks > 0,
                                    mainquery.c.total_marks_obtained != None
                                ),
                                    cast(
                                        (
                                            mainquery.c.total_marks_obtained
                                            / mainquery.c.total_max_marks
                                        )
                                        * 100,
                                        Numeric(10, 2),
                                    ),
                                ),
                                else_= cast(0.0, Numeric(10, 2))
                            ),
                        )
                    ).label("performance_trend"),
                )
                .select_from(mainquery)
                .group_by(mainquery.c.paper_name)
            )
            resp = await session.execute(stmt)

            return resp.all()
    
    async def get_subject_ids_attempted_by_user(self,user_id: int, db_session: AsyncSession) -> list[int]:
        session = db_session
        x = func.unnest(Test.subjects).alias("x")

        subq = (
            select(func.distinct(literal_column("x ->> 'id'").cast(Integer)))
            .select_from(TestAttempt)
            .join(Test, TestAttempt.test_id == Test.id)
            .join(x, literal_column("TRUE"))  # Cross join with unnested array
            .where(
                and_(
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status.in_(['COMPLETED', 'SUBMITTED']),
                )
            )
        )
    
        result = await session.execute(subq)
        return [row[0] for row in result.all()]

    async def get_q_options_attempt_result(
        self, q_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        # Step 1: Define the subquery to unnest subjects
        options_subquery = select(
            func.unnest(q.options).cast(JSON).label("option"),
            q.id.label("question_id"),
        ).subquery()
        selected_options_subquery = select(
            func.unnest(tqa.selected_options).cast(JSON).label("selected_option"),
            tqa.question_id.label("tqa_q_id"),
        ).subquery()
        query = (
            select(
                literal_column("(selected_option->>'id')").label("selected_option_id"),
                Question.id.label("q_id"),
                Question.attempts_count.label("attempts_count"),
            )
            .select_from(selected_options_subquery)
            .join(Question, Question.id == selected_options_subquery.c.tqa_q_id)
            .group_by("selected_option_id", Question.id, Question.attempts_count)
            .order_by(Question.id)
        )
        main_query = (
            select(
                query.c.selected_option_id,
                query.c.q_id,
                (func.count() * 100 / query.c.attempts_count).label(
                    "attempts_option_perc"
                ),
            )
            .where(query.c.q_id == q_id)
            .group_by(query.c.selected_option_id, query.c.q_id, query.c.attempts_count)
        )

        # query = (
        #     select(
        #         literal_column("(option->>'id')").label("option_id"),
        #         literal_column("(selected_option->>'id')").label("selected_option_id"),
        #         Question.id.label("q_id"),
        #         Question.attempts_count.label("attempts_count"),
        #     )
        #     .select_from(options_subquery)
        #     .join(Question, Question.id == options_subquery.c.question_id)
        #     .join(
        #         selected_options_subquery,
        #         selected_options_subquery.c.tqa_q_id == options_subquery.c.question_id,
        #     )
        #     .group_by(
        #         "option_id", "selected_option_id", Question.id, Question.attempts_count
        #     )
        #     .order_by(Question.id)
        # )
        # main_query = (
        #     select(
        #         query.c.option_id,
        #         query.c.q_id,
        #         (func.count() * 100 / query.c.attempts_count).label(
        #             "attempts_option_perc"
        #         ),
        #     )
        #     .where(query.c.q_id == q_id)
        #     .group_by(query.c.option_id, query.c.q_id, query.c.attempts_count)
        # )

        results = await session.execute(main_query)
        res = results.all()

        return res

    async def get_overall_performance_trend_1(
        self,
        user_id: int,
        paper_id: int,
        full_length_result:bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        # Create the main subquery
        mainquery = (
            select(
                tqa.test_attempt_id,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .where(
                and_(
                    tqa.attempted_by_id == user_id,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result
                )
            )
            .group_by( tqa.test_attempt_id)
            .subquery()
        )
        tqa_subquery = select(
            tqa.updated_at.label("updated_at"),
            tqa.test_attempt_id.label("ta_id"),
        ).subquery()

        # Create the main query
        stmt = select(
            func.json_agg(
                func.json_build_object(
                    "test_attempt_id",
                    mainquery.c.test_attempt_id,
                    "test_attempt_date",
                    tqa_subquery.c.updated_at,
                    # mainquery.c.updated_at,
                    # tqa.updated_at,
                    "score",
                    cast(
                        mainquery.c.total_marks_obtained,
                        Numeric(10, 2),
                    ),
                    "percentage",
                    case(
                        (
                            mainquery.c.total_max_marks > 0,
                            cast(
                                (
                                    mainquery.c.total_marks_obtained
                                    / mainquery.c.total_max_marks
                                )
                                * 100,
                                Numeric(10, 2),
                            ),
                        ),
                        else_=0,
                    ),
                )
            ).label("performance_trend"),
        ).select_from(mainquery).join(tqa_subquery, tqa_subquery.c.ta_id == mainquery.c.test_attempt_id )

        results = await session.execute(stmt)
        res = results.first()._asdict()

        return res

    async def get_overall_performance_trend(
        self,
        user_id: int,
        paper_id: int,
        full_length_result:bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
         # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        
        # Create the main subquery
        mainquery = (
            select(
                ta.id,ta.updated_at,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))              
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status == 'COMPLETED',
                    (cast(t.paper.op("->>")("id"), Integer) == paper_id),
                    t.test_type != TEST_TYPE.custom ,
                    t.is_full_length == full_length_result,
                )).group_by(ta.id,ta.updated_at,t.title).subquery()
        )

        # Create the main query
        stmt = (
            select(
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.updated_at,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                                 and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_=cast(0.0, Numeric(10, 2)),
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
        )
        resp = await session.execute(stmt)

        return resp.first()._asdict()

    async def get_prelims_overall_performance_trend(
        self,
        user_id: int,
        stage_ids: list[int],
        full_length_result:bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
         # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        
        # Create the main subquery
        mainquery = (
            select(
                ta.id,ta.updated_at,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))              
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status == 'COMPLETED',
                    (cast(t.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    t.test_type != TEST_TYPE.custom ,
                    t.is_full_length == full_length_result,
                )).group_by(ta.id,ta.updated_at,t.title).subquery()
        )

        # Create the main query
        stmt = (
            select(
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.updated_at,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                                 and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_=cast(0.0, Numeric(10, 2)),
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
        )
        resp = await session.execute(stmt)

        return resp.first()._asdict()

    async def get_overall_mains_perf_trend(
        self,
        user_id: int,
        paper_ids: list[int]| None = None,
        subject_ids: list[int]| None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
         # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)

        
        # Create the main subquery
        mainquery = (
            select(
                ta.id,ta.submitted_date,
                t.title,
                # tqa.updated_at,
                func.sum(tqa.marks_obtained).label("total_marks_obtained"),
                func.sum(q.max_marks).label("total_max_marks"),
                ).select_from(ta)
                .join(t, ta.test_id == t.id)
                .join(tq , ta.test_id == tq.test_id)
                .join(q , tq.question_id == q.id)
                .outerjoin(tqa , and_( ta.id == tqa.test_attempt_id , tq.question_id == tqa.question_id))              
                .where( and_(
                    ta.attempted_by_id == user_id,
                    ta.status.in_(['COMPLETED']),
                    t.stage.op("->>")("name").ilike("%Mains%"),
                    (cast(t.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
               )
            )
        )

        # Subject filter (only added if subject_ids is present)
        if subject_ids:
            subject_filter = func.exists(
                select(literal_column("x ->> 'id'").cast(Integer))
                .select_from(func.unnest(t.subjects).alias("x"))
                .where(
                    literal_column("x ->> 'id'").cast(Integer).in_(subject_ids)
                )
                .correlate(t)  # important: correlate with `Test` table (aliased as `t`)
            )
            mainquery = mainquery.where(subject_filter)

        # Now convert to subquery
        mainquery = mainquery.group_by(ta.id, ta.updated_at, t.title).subquery()

        # Create the main query
        stmt = (
            select(
                func.json_agg(
                    func.json_build_object(
                        "test_title",
                        mainquery.c.title,
                        "test_attempt_id",
                        mainquery.c.id,
                        "test_attempt_date",
                        mainquery.c.submitted_date,
                        "score",
                        case(
                            (
                            mainquery.c.total_marks_obtained != None,
                            cast(
                            mainquery.c.total_marks_obtained,
                            Numeric(10, 2),
                            ),
                            ),
                            else_= 0,
                        ),                       
                        "percentage",
                        case(
                            (
                                 and_(
                                mainquery.c.total_max_marks > 0,
                                mainquery.c.total_marks_obtained != None
                            ),
                                cast(
                                    (
                                        mainquery.c.total_marks_obtained
                                        / mainquery.c.total_max_marks
                                    )
                                    * 100,
                                    Numeric(10, 2),
                                ),
                            ),
                            else_=cast(0.0, Numeric(10, 2)),
                        ),
                    )
                ).label("performance_trend"),
            )
            .select_from(mainquery)
        )
        resp = await session.execute(stmt)

        return resp.first()._asdict()
  
    async def get_performance_benchmark_papers(
        self,
        stage_id: int,
        user_id: int,
        from_date: date,
        till_date: date,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        subquery = (
            select(
                (cast(Test.paper.op("->>")("name"), String)).label("paper_name"),
                self.model.id.label("test_attempt_id"),
                case(
                    (
                        self.model.attempted_by_id == user_id,
                        cast(
                            (self.model.score / Test.max_marks) * 100,
                            Numeric(10, 2),
                        ),
                    ),
                    else_=None,
                ).label("self_score"),
                cast(
                    (self.model.score / Test.max_marks) * 100,
                    Numeric(10, 2),
                ).label("global_score"),
            )
            .select_from(self.model)
            .outerjoin(Test, Test.id == self.model.test_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    self.model.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(Test.stage.op("->>")("id"), Integer) == stage_id),
                    Test.is_full_length == full_length_result,
                )
            )
            .group_by("paper_name", "test_attempt_id", "self_score", "global_score")
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.paper_name,
                cast(
                    func.avg(subquery.c.self_score),
                    Numeric(10, 2),
                ).label("your_average"),
                cast(
                    func.avg(subquery.c.global_score),
                    Numeric(10, 2),
                ).label("global_average"),
            )
            .select_from(subquery)
            .group_by(subquery.c.paper_name)
        )

        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores

    async def get_performance_benchmark_papers_2(
        self,
        stage_id: int,
        user_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        subquery = (
            select(
                (cast(Test.paper.op("->>")("name"), String)).label("paper_name"),
                self.model.id.label("test_attempt_id"),
                case(
                    (
                        self.model.attempted_by_id == user_id,
                        cast(
                            (self.model.score / Test.max_marks) * 100,
                            Numeric(10, 2),
                        ),
                    ),
                    else_=None,
                ).label("self_score"),
                (
                    cast(Test.paper.op("->>")("aspirational_marks_percentage"), Integer)
                ).label("global_score"),
            )
            .select_from(self.model)
            .outerjoin(Test, Test.id == self.model.test_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    self.model.updated_at.between(from_date, till_date),
                    (cast(Test.stage.op("->>")("id"), Integer) == stage_id),
                )
            )
            .group_by("paper_name", "test_attempt_id", "self_score", "global_score")
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.paper_name,
                cast(
                    func.avg(subquery.c.self_score),
                    Numeric(10, 2),
                ).label("your_average"),
                cast(
                    func.avg(subquery.c.global_score),
                    Numeric(10, 2),
                ).label("global_average"),
            )
            .select_from(subquery)
            .group_by(subquery.c.paper_name)
        )

        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores
        """
        query = (
            select((self.model.score) / (Test.max_marks))
            .select_from(self.model)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                    self.model.updated_at.between(from_date, till_date),
                    (cast(Test.stage.op("->>")("id"), Integer) == stage_id),
                )
            )
            .order_by(self.model.updated_at.asc())
        )
        result = await session.execute(query)
        scores = result.scalars().all()
        filter_scores = list(filter(lambda x: x is not None, scores))
        avg_score = sum(filter_scores) / len(filter_scores) if filter_scores else 0
        print("scores", filter_scores)
        query2 = (
            select((self.model.score) / (Test.max_marks))
            .select_from(self.model)
            .outerjoin(Test, Test.id == TestAttempt.test_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    self.model.updated_at.between(from_date, till_date),
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                )
            )
            .order_by(self.model.updated_at.asc())
        )
        result = await session.execute(query2)
        scores = result.scalars().all()
        filter_scores = list(filter(lambda x: x is not None, scores))
        global_avg_score = (
            sum(filter_scores) / len(filter_scores) if filter_scores else 0
        )
        print("scores", filter_scores)
        return {"avg_score": avg_score, "global_avg_score": global_avg_score}
        """

    async def get_performance_benchmark_subjects(
        self,
        user_id: int,
        paper_id: int,
        from_date: date,
        till_date: date,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()

        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        # Create the main subquery
        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                tqa.test_attempt_id,
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(tqa.marks_obtained),
                    ),
                    else_=None,
                ).label("self_score"),
                func.sum(tqa.marks_obtained).label("global_score"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(
                    tqa.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ),
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                )
            )
            .group_by("subject_name", tqa.test_attempt_id, tqa.attempted_by_id)
            .subquery()
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.self_score / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("your_average"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.global_score / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("global_average"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )

        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores

    async def calculate_rank_percentile(
        self,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        subquery = (
            select(
                self.model.test_id,
                self.model.id,
                func.rank().over(order_by=self.model.score.desc()).label("rank"),
                func.percent_rank()
                .over(order_by=self.model.score.asc())
                .label("percentile"),  # multiply by 100 to get percentile (1 means 100)
            )
            .select_from(self.model)
            .where(
                self.model.test_id == test_id,
                self.model.score != None,
            )
            .subquery()
        )
        query = select(subquery).filter(subquery.c.id == test_attempt_id)
        result = await session.execute(query)

        return result.all()

    async def agg_calc_rank_percentile(
        self,
        user_id: int,
        paper_id: int,
        is_full_length: bool,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        sub_query = (
            select(
                func.sum(self.model.score).label("user_scores"),
                (self.model.attempted_by_id).label("user_id"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where((cast(Test.paper.op("->>")("id"), Integer) == paper_id))
            .group_by(self.model.attempted_by_id)
            .subquery()
        )
       
        query = (
            select(
                sub_query.c.user_id,
                func.rank()
                .over(order_by=sub_query.c.user_scores.desc())
                .label("rank"),
                func.percent_rank()
                .over(order_by=sub_query.c.user_scores.asc())
                .label(
                    "percentile"
                ),  # multiply by 100 to get percentile (1 means 100)
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.is_full_length == is_full_length,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                self.model.score != None
            )
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        

        result = await session.execute(query)
        res = result.all()
        return res
        # res_dict = result.first()
        # if res_dict != None:
        #     return res_dict._asdict()
    
    async def agg_prelims_calc_rank_percentile(
        self,
        user_id: int,
        stage_ids: list[int],
        is_full_length: bool,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        sub_query = (
            select(
                func.sum(self.model.score).label("user_scores"),
                (self.model.attempted_by_id).label("user_id"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where((cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)))
            .group_by(self.model.attempted_by_id)
            .subquery()
        )
       
        query = (
            select(
                sub_query.c.user_id,
                func.rank()
                .over(order_by=sub_query.c.user_scores.desc())
                .label("rank"),
                func.percent_rank()
                .over(order_by=sub_query.c.user_scores.asc())
                .label(
                    "percentile"
                ),  # multiply by 100 to get percentile (1 means 100)
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.is_full_length == is_full_length,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                self.model.score != None
            )
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        

        result = await session.execute(query)
        res = result.all()
        return res
       
    async def agg_mains_calc_rank_percentile(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        sub_query = (
            select(
                func.sum(self.model.score).label("user_scores"),
                (self.model.attempted_by_id).label("user_id"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(Test.stage.op("->>")("name").ilike("%Mains%"))
            .group_by(self.model.attempted_by_id)
            .subquery()
        )
       
        query = (
            select(
                sub_query.c.user_id,
                func.rank()
                .over(order_by=sub_query.c.user_scores.desc())
                .label("rank"),
                func.percent_rank()
                .over(order_by=sub_query.c.user_scores.asc())
                .label(
                    "percentile"
                ),  # multiply by 100 to get percentile (1 means 100)
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.stage.op("->>")("name").ilike("%Mains%"),
                self.model.score != None,
                self.model.status == "COMPLETED"
            )
        )

        result = await session.execute(query)
        res = result.all()
        return res
        # res_dict = result.first()
        # if res_dict != None:
        #     return res_dict._asdict()

    async def calc_score_time_accuracy_reports(
        self,
        user_id: int,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        user_attempt_metrics = (
            select(
                case(
                    (
                        self.model.id == test_attempt_id,
                        cast((self.model.score / Test.max_marks) * 100, Float),
                    ),
                    else_=None,
                ).label("user_score_percent"),
                case(
                    (
                        TestQuestionAttempt.test_attempt_id == test_attempt_id,
                        func.avg(TestQuestionAttempt.time_elapsed),
                    ),
                    else_=None,
                ).label("user_avg_time_per_question"),
                case(
                    (
                        TestQuestionAttempt.test_attempt_id == test_attempt_id,
                        func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                        * 100
                        / func.count(),
                    ),
                    else_=None,
                ).label("user_avg_accuracy"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt, TestQuestionAttempt.test_id == self.model.test_id
            )
            .where(
                and_(
                    self.model.id == test_attempt_id,
                    self.model.attempted_by_id == user_id,
                    TestQuestionAttempt.test_attempt_id == self.model.id,
                    TestQuestionAttempt.test_id == test_id,
                    TestQuestionAttempt.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                )
            )
            .group_by(
                TestAttempt.id, Test.max_marks, TestQuestionAttempt.test_attempt_id
            )
            .subquery()
        )

        others_attempt_metrics = (
            select(
                ((Test.avg_score / Test.max_marks) * 100).label("others_score_percent"),
                (Test.avg_accuracy).label("others_avg_accuracy"),
                (Test.avg_time_per_q).label("others_avg_time_per_question"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            # .join(
            #     TestQuestionAttempt, TestQuestionAttempt.test_id == self.model.test_id
            # )
            .where(
                and_(
                    self.model.test_id == test_id,
                    # TestQuestionAttempt.test_id == test_id,
                    self.model.status == "COMPLETED",
                )
            )
            .subquery()
        )

        stmt = select(
            user_attempt_metrics.c.user_score_percent,
            others_attempt_metrics.c.others_score_percent,
            user_attempt_metrics.c.user_avg_time_per_question,
            others_attempt_metrics.c.others_avg_time_per_question,
            user_attempt_metrics.c.user_avg_accuracy,
            others_attempt_metrics.c.others_avg_accuracy,
        ).select_from(others_attempt_metrics, user_attempt_metrics)

        result = await session.execute(stmt)
        row = result.first()
        if row is None:
            print("No data found for given user_id, test_id, or test_attempt_id")
            return {
                "user_score_percent": 0,
                "others_score_percent": 0,
                "user_avg_time_per_question": 0,
                "others_avg_time_per_question": 0,
                "user_avg_accuracy": 0,
                "others_avg_accuracy": 0,
            }
        scores = row._asdict()
        print("scores", scores)
        return scores

    async def calc_score_time_accuracy_reports_v2(
        self,
        user_id: int,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        user_attempt_metrics = (
            select(
                case(
                    (
                        self.model.id == test_attempt_id,
                        cast((self.model.score / Test.max_marks) * 100, Float),
                    ),
                    else_=None,
                ).label("user_score_percent"),
                case(
                    (
                        TestQuestionAttempt.test_attempt_id == test_attempt_id,
                        func.avg(TestQuestionAttempt.time_elapsed),
                    ),
                    else_=None,
                ).label("user_avg_time_per_question"),
                case(
                    (
                        TestQuestionAttempt.test_attempt_id == test_attempt_id,
                        func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                        * 100
                        / func.count(),
                    ),
                    else_=None,
                ).label("user_avg_accuracy"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt, TestQuestionAttempt.test_id == self.model.test_id
            )
            .where(
                and_(
                    self.model.id == test_attempt_id,
                    self.model.attempted_by_id == user_id,
                    TestQuestionAttempt.test_attempt_id == self.model.id,
                    TestQuestionAttempt.test_id == test_id,
                    TestQuestionAttempt.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                )
            )
            .group_by(
                TestAttempt.id, Test.max_marks, TestQuestionAttempt.test_attempt_id
            )
            .subquery()
        )

        others_attempt_metrics = (
            select(
                ((Test.avg_score / Test.max_marks) * 100).label("others_score_percent"),
                (Test.avg_accuracy).label("others_avg_accuracy"),
                (Test.avg_time_per_q).label("others_avg_time_per_question"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            # .join(
            #     TestQuestionAttempt, TestQuestionAttempt.test_id == self.model.test_id
            # )
            .where(
                and_(
                    self.model.test_id == test_id,
                    # TestQuestionAttempt.test_id == test_id,
                    self.model.status == "COMPLETED",
                )
            )
            .subquery()
        )
        topper_score_metric = (
                select(
                    (func.max(self.model.score) / Test.max_marks * 100).label("topper_score_percent"),

                )
                .select_from(self.model)
                .join(Test, Test.id == self.model.test_id)
                .where(
                    and_(
                        self.model.test_id == test_id,
                        self.model.status == "COMPLETED",
                    )
                ).group_by(Test.max_marks)
                .subquery()
            )

        stmt = select(
            user_attempt_metrics.c.user_score_percent,
            others_attempt_metrics.c.others_score_percent,
            topper_score_metric.c.topper_score_percent,
            user_attempt_metrics.c.user_avg_time_per_question,
            others_attempt_metrics.c.others_avg_time_per_question,
            user_attempt_metrics.c.user_avg_accuracy,
            others_attempt_metrics.c.others_avg_accuracy,
        ).select_from(others_attempt_metrics, user_attempt_metrics,topper_score_metric)

        result = await session.execute(stmt)
        scores = result.first()._asdict()
        print("scores", scores)
        return scores

    async def calc_score_benchmark_subjects(
        self,
        user_id: int,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
            Question.max_marks.label("max_marks"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        # subquery = (
        #     select(
        #         literal_column("(subj->>'name')").label("subject_name"),
        #         case(
        #             (
        #                 tqa.test_attempt_id == test_attempt_id,
        #                 func.sum(tqa.marks_obtained),
        #             ),
        #             else_=None,
        #         ).label("self_subject_score"),
        #         case(
        #             (tqa.test_id == test_id, func.sum(tqa.marks_obtained)), else_=None
        #         ).label("others_subject_score"),
        #         func.sum(q.max_marks).label("total_max_marks"),
        #         case(
        #             (tqa.test_attempt_id == test_attempt_id, func.sum(q.max_marks)),
        #             else_=0,
        #         ).label("self_total_marks"),
        #     )
        #     .select_from(tqa)
        #     .join(q, q.id == tqa.question_id)
        #     .join(TestAttempt, TestAttempt.test_id == tqa.test_id)
        #     .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
        #     .where(
        #         and_(self.model.status == "COMPLETED", self.model.test_id == test_id)
        #     )
        #     .group_by(
        #         "subject_name",
        #         tqa.test_attempt_id,
        #         tqa.test_id,
        #         self.model.id,
        #     )
        #     .subquery("subquery")
        # )

        # stmt = (
        #     select(
        #         subquery.c.subject_name,
        #         cast(
        #             func.avg(
        #                 case(
        #                     (
        #                         subquery.c.self_total_marks > 0,
        #                         # subquery.c.self_subject_score
        #                         # * 100
        #                           subquery.c.self_total_marks,
        #                     ),
        #                     else_=None,
        #                 ),
        #             ),
        #             Numeric(10, 2),
        #         ).label("self_subject_score"),
        #         cast(
        #             func.avg(
        #                 case(
        #                     (
        #                         subquery.c.total_max_marks > 0,
        #                         subquery.c.others_subject_score
        #                         * 100
        #                         / subquery.c.total_max_marks,
        #                     ),
        #                     else_=None,
        #                 ),
        #             ),
        #             Numeric(10, 2),
        #         ).label("others_subject_score"),
        #     )
        #     .select_from(subquery)
        #     .group_by(
        #         subquery.c.subject_name,
        #     )
        # )
        
         # Define query1 as a subquery
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.sum(query1.c.q_max_marks).label("subj_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                # func.sum(tqa.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(tqa.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("self_subject_score"),
            )
            .select_from(tqa)
            .join(
                query1,
                query1.c.question_id == tqa.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .where(
                tqa.test_attempt_id == test_attempt_id,
                tqa.test_id == test_id,
            )
            .group_by(
                query2.c.subject_name,  query2.c.subj_total_marks
            )
        )

        combined_query2 = (
            select(
                query2.c.subject_name,
                # func.sum(tqa.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(tqa.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("others_subject_score"),
            )
            .select_from(tqa)
            .join(
                query1,
                query1.c.question_id == tqa.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .where(
                tqa.test_id == test_id,
            )
            .group_by(
                query2.c.subject_name,  query2.c.subj_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        results2 = await session.execute(combined_query2)
        response2 = results2.all()

        return response , response2
        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores

    async def calc_accuracy_benchmark_subjects(
        self,
        user_id: int,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        and_(
                            tqa.attempted_by_id == user_id,
                            tqa.test_attempt_id == test_attempt_id,
                        ),
                        func.sum(cast(tqa.is_correct_attempt, Integer)),
                    ),
                    else_=None,
                ).label("user_correct_attempts"),
                case(
                    (
                        and_(
                            tqa.attempted_by_id == user_id,
                            tqa.test_attempt_id == test_attempt_id,
                        ),
                        func.count(),
                    ),
                    else_=None,
                ).label("user_total_attempts"),
                case(
                    (
                        tqa.test_id == test_id,
                        func.sum(cast(tqa.is_correct_attempt, Integer)),
                    ),
                    else_=None,
                ).label("others_correct_attempts"),
                case(
                    (tqa.test_id == test_id, func.count()),
                    else_=None,
                ).label("others_total_attempts"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .outerjoin(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(self.model.status == "COMPLETED", self.model.test_id == test_id)
            )
            .group_by(
                "subject_name",
                Test.max_marks,
                tqa.test_attempt_id,
                tqa.test_id,
                self.model.id,
                self.model.test_id,
                tqa.attempted_by_id,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.user_total_attempts > 0,
                                (
                                    subquery.c.user_correct_attempts
                                    / subquery.c.user_total_attempts
                                )
                                 
                            ),
                            else_=None,
                        ),
                    )*100,
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.others_total_attempts > 0,
                                (
                                    subquery.c.others_correct_attempts
                                    / subquery.c.others_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(
                subquery.c.subject_name,
            )
        )

        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores

    async def agg_score_time_accuracy(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        user_attempt_metrics = (
            select(
                (func.avg(((self.model.score) / Test.max_marks)) * 100).label(
                    "user_score_percent"
                ),
                func.avg(TestQuestionAttempt.time_elapsed).label(
                    "user_avg_time_per_question"
                ),
                (
                    func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                    * 100
                    / func.count()
                ).label("user_avg_accuracy"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    TestQuestionAttempt.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                )
            )
            .subquery()
        )
        

        others_attempt_metrics = (
            select(
                (func.avg((Test.avg_score / Test.max_marks)) * 100).label(
                    "others_score_percent"
                ),
                func.avg(Test.avg_accuracy).label("others_avg_accuracy"),
                func.avg(Test.avg_time_per_q).label("others_avg_time_per_question"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                )
            )
            .subquery()
        )

        stmt = select(
            user_attempt_metrics.c.user_score_percent,
            others_attempt_metrics.c.others_score_percent,
            user_attempt_metrics.c.user_avg_time_per_question,
            others_attempt_metrics.c.others_avg_time_per_question,
            user_attempt_metrics.c.user_avg_accuracy,
            others_attempt_metrics.c.others_avg_accuracy,
        ).select_from(others_attempt_metrics, user_attempt_metrics)

        result = await session.execute(stmt)
        scores = result.first()._asdict()
        return scores

    async def agg_score_time_accuracy_by_time_filters(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        from_date: date | None = None,
        till_date:date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        user_attempt_metrics = (
            select(
                (func.avg(((self.model.score) / Test.max_marks)) * 100).label(
                    "user_score_percent"
                ),
                func.avg(TestQuestionAttempt.time_elapsed).label(
                    "user_avg_time_per_question"
                ),
                (
                    func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                    * 100
                    / func.count()
                ).label("user_avg_accuracy"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    TestQuestionAttempt.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))
                )
            )
            .subquery()
        )
        

        others_attempt_metrics = (
            select(
                (func.avg((Test.avg_score / Test.max_marks)) * 100).label(
                    "others_score_percent"
                ),
                func.avg(Test.avg_accuracy).label("others_avg_accuracy"),
                func.avg(Test.avg_time_per_q).label("others_avg_time_per_question"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))
                )
            )
            .subquery()
        )

        stmt = select(
            user_attempt_metrics.c.user_score_percent,
            others_attempt_metrics.c.others_score_percent,
            user_attempt_metrics.c.user_avg_time_per_question,
            others_attempt_metrics.c.others_avg_time_per_question,
            user_attempt_metrics.c.user_avg_accuracy,
            others_attempt_metrics.c.others_avg_accuracy,
        ).select_from(others_attempt_metrics, user_attempt_metrics)

        result = await session.execute(stmt)
        scores = result.first()._asdict()
        return scores

    async def agg_score_time_accuracy_by_time_n_stage_filters(
        self,
        user_id: int,
        stage_ids: list[int],
        full_length_result: bool,
        from_date: date | None = None,
        till_date:date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        user_attempt_metrics = (
            select(
                (func.avg(((self.model.score) / Test.max_marks)) * 100).label(
                    "user_score_percent"
                ),
                func.avg(TestQuestionAttempt.time_elapsed).label(
                    "user_avg_time_per_question"
                ),
                (
                    func.sum(cast(TestQuestionAttempt.is_correct_attempt, Integer))
                    * 100
                    / func.count()
                ).label("user_avg_accuracy"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    TestQuestionAttempt.attempted_by_id == user_id,
                    self.model.status == "COMPLETED",
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))
                )
            )
            .subquery()
        )
        

        others_attempt_metrics = (
            select(
                (func.avg((Test.avg_score / Test.max_marks)) * 100).label(
                    "others_score_percent"
                ),
                func.avg(Test.avg_accuracy).label("others_avg_accuracy"),
                func.avg(Test.avg_time_per_q).label("others_avg_time_per_question"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.attempted_by_id == self.model.attempted_by_id,
            )
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))
                )
            )
            .subquery()
        )

        stmt = select(
            user_attempt_metrics.c.user_score_percent,
            others_attempt_metrics.c.others_score_percent,
            user_attempt_metrics.c.user_avg_time_per_question,
            others_attempt_metrics.c.others_avg_time_per_question,
            user_attempt_metrics.c.user_avg_accuracy,
            others_attempt_metrics.c.others_avg_accuracy,
        ).select_from(others_attempt_metrics, user_attempt_metrics)

        result = await session.execute(stmt)
        scores = result.first()._asdict()
        return scores

    async def get_agg_score_benchmark(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).cast(JSON).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(tqa.marks_obtained),
                    ),
                    else_=None,
                ).label("self_subject_score"),
                func.sum(tqa.marks_obtained).label("others_subject_score"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(self.model, tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(self.model.status == "COMPLETED"),
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                q.max_marks,
                tqa.marks_obtained,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.self_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.others_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )

        result = await session.execute(stmt)
        scores = result.all()

        return scores

    async def get_agg_score_benchmark_with_time_filters(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).cast(JSON).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(tqa.marks_obtained),
                    ),
                    else_=None,
                ).label("self_subject_score"),
                func.sum(tqa.marks_obtained).label("others_subject_score"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(self.model, tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(self.model.status == "COMPLETED"),
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
                self.model.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                q.max_marks,
                tqa.marks_obtained,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.self_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.others_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )

        result = await session.execute(stmt)
        scores = result.all()

        return scores

    async def get_prelims_agg_score_benchmark_with_time_filters(
        self,
        user_id: int,
        stage_ids: list[int],
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).cast(JSON).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(tqa.marks_obtained),
                    ),
                    else_=None,
                ).label("self_subject_score"),
                func.sum(tqa.marks_obtained).label("others_subject_score"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(self.model, tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(self.model.status == "COMPLETED"),
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                Test.is_full_length == full_length_result,
                self.model.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                q.max_marks,
                tqa.marks_obtained,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.self_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.others_subject_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )

        result = await session.execute(stmt)
        scores = result.all()

        return scores

    async def get_agg_mains_score_benchmark(
        self,
        user_id: int,
       
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        paper_subquery = select(
            (Question.paper).cast(JSON).label("q_paper"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(q_paper->>'name')").label("paper_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(tqa.marks_obtained),
                    ),
                    else_=None,
                ).label("self_paper_score"),
                func.sum(tqa.marks_obtained).label("others_paper_score"),
                func.sum(q.max_marks).label("total_max_marks"),
            )
            .select_from(self.model, tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(paper_subquery, paper_subquery.c.question_id == tqa.question_id)
            .where(
                and_(self.model.status.in_(["COMPLETED"])),
                Test.stage.op("->>")("name").ilike("%Mains%")
            )
            .group_by(
                "paper_name",
                tqa.attempted_by_id,
                q.max_marks,
                tqa.marks_obtained,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.paper_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.self_paper_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_paper_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.total_max_marks > 0,
                                subquery.c.others_paper_score
                                * 100
                                / subquery.c.total_max_marks,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_paper_score"),
            )
            .select_from(subquery)
            .group_by(subquery.c.paper_name)
        )

        result = await session.execute(stmt)
        scores = result.all()

        return scores


    async def get_agg_accuracy_benchmark(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(cast(tqa.is_correct_attempt, Integer)),
                    ),
                    else_=None,
                ).label("user_correct_attempts"),
                case(
                    (tqa.attempted_by_id == user_id, func.count()),
                    else_=None,
                ).label("user_total_attempts"),
                (func.sum(cast(tqa.is_correct_attempt, Integer))).label(
                    "others_correct_attempts"
                ),
                func.count().label("others_total_attempts"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                )
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                tqa.test_id,
                self.model.id,
                self.model.test_id,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.user_total_attempts > 0,
                                (
                                    subquery.c.user_correct_attempts
                                    / subquery.c.user_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.others_total_attempts > 0,
                                (
                                    subquery.c.others_correct_attempts
                                    / subquery.c.others_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(
                subquery.c.subject_name,
            )
        )

        result = await session.execute(stmt)
        scores = result.all()
        print("scores", scores)

        return scores

    async def get_agg_accuracy_benchmark_with_time_filters(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(cast(tqa.is_correct_attempt, Integer)),
                    ),
                    else_=None,
                ).label("user_correct_attempts"),
                case(
                    (tqa.attempted_by_id == user_id, func.count()),
                    else_=None,
                ).label("user_total_attempts"),
                (func.sum(cast(tqa.is_correct_attempt, Integer))).label(
                    "others_correct_attempts"
                ),
                func.count().label("others_total_attempts"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .join(TestAttempt, TestAttempt.id == tqa.test_attempt_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
                )
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                tqa.test_id,
                self.model.id,
                self.model.test_id,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.user_total_attempts > 0,
                                (
                                    subquery.c.user_correct_attempts
                                    / subquery.c.user_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.others_total_attempts > 0,
                                (
                                    subquery.c.others_correct_attempts
                                    / subquery.c.others_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(
                subquery.c.subject_name,
            )
        )

        result = await session.execute(stmt)
        scores = result.all()
        return scores

    async def get_prelims_agg_accuracy_benchmark_with_time_filters(
        self,
        stage_ids: list[int],
        user_id: int,
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Step 1: Define the subquery to unnest subjects
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                case(
                    (
                        tqa.attempted_by_id == user_id,
                        func.sum(cast(tqa.is_correct_attempt, Integer)),
                    ),
                    else_=None,
                ).label("user_correct_attempts"),
                case(
                    (tqa.attempted_by_id == user_id, func.count()),
                    else_=None,
                ).label("user_total_attempts"),
                (func.sum(cast(tqa.is_correct_attempt, Integer))).label(
                    "others_correct_attempts"
                ),
                func.count().label("others_total_attempts"),
            )
            .select_from(tqa)
            .join(Test, Test.id == tqa.test_id)
            .join(q, q.id == tqa.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
            .join(TestAttempt, TestAttempt.id == tqa.test_attempt_id)
            .where(
                and_(
                    self.model.status == "COMPLETED",
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                    Test.is_full_length == full_length_result,
                    TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
                )
            )
            .group_by(
                "subject_name",
                tqa.attempted_by_id,
                tqa.test_id,
                self.model.id,
                self.model.test_id,
            )
            .subquery("subquery")
        )

        stmt = (
            select(
                subquery.c.subject_name,
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.user_total_attempts > 0,
                                (
                                    subquery.c.user_correct_attempts
                                    / subquery.c.user_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("self_subject_score"),
                cast(
                    func.avg(
                        case(
                            (
                                subquery.c.others_total_attempts > 0,
                                (
                                    subquery.c.others_correct_attempts
                                    / subquery.c.others_total_attempts
                                )
                                * 100,
                            ),
                            else_=None,
                        ),
                    ),
                    Numeric(10, 2),
                ).label("others_subject_score"),
            )
            .select_from(subquery)
            .group_by(
                subquery.c.subject_name,
            )
        )

        result = await session.execute(stmt)
        scores = result.all()
        return scores

    async def get_used_qs_count(
        self,
        paper_id: int,
        user_id: int,
        subject_ids: int | None = [],
        topic_ids: int | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(distinct(TestQuestion.question_id)).label("used_qs"))
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
        )
        result = await session.execute(query)

        return result.scalar_one_or_none()

    async def get_ca_used_qs_count(
        self,
        paper_id: int,
        user_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(func.count(distinct(TestQuestion.question_id)).label("used_qs"))
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                # TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                Question.is_current_affairs == True,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
        )
        result = await session.execute(query)

        return result.scalar_one_or_none()

    async def get_used_qs_count_by_paper_mode(
        self,
        paper_id: int,
        user_id: int,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                TestAttempt.test_attempt_mode.label("mode"),
                func.count(distinct(TestQuestion.question_id)).label("used_qs"),
            )
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                #  self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                
            )
            .group_by("mode")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.all()
    
    async def get_prelims_used_qs_count_by_paper_mode(
        self,
        stage_ids: list[int],
        user_id: int,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        paper_ids = await get_paper_ids(stage_ids=stage_ids)
        query = (
            select(
                TestAttempt.test_attempt_mode.label("mode"),
                func.count(distinct(TestQuestion.question_id)).label("used_qs"),
            )
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                #  self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids)),
                
            )
            .group_by("mode")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.all()
    
    async def get_used_qs_count_by_stage_mode(
        self,
        stage_ids: list[int],
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        paper_ids = await get_paper_ids(stage_ids=stage_ids)
        query = (
            select(
                TestAttempt.test_attempt_mode.label("mode"),
                func.count(distinct(TestQuestion.question_id)).label("used_qs"),
            )
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                #  self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids)),
            )
            .group_by("mode")
        )
        result = await session.execute(query)

        return result.all()

    async def get_used_qs(
        self,
        paper_id: int,
        user_id: int,
        subject_codes: str | None = [],
        topic_codes: str | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select((TestQuestion))
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("code"), String).in_(subject_codes)
                if subject_codes
                else True,
                cast(Question.topic.op("->>")("code"), String).in_(topic_codes)
                if topic_codes
                else True,
            )
            .distinct(TestQuestion.question_id)
        )
        result = await session.execute(query)

        return result.scalars().all()
    
    async def get_used_mains_qs(
        self,
        paper_ids: list[int],
        user_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select((TestQuestion))
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .distinct(TestQuestion.question_id)
        )
        result = await session.execute(query)

        return result.scalars().all()

    async def get_ca_used_qs(
        self,
        paper_id: int,
        user_id: int,
        topic_codes: list[str] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select((TestQuestion))
            .select_from(TestQuestion)
            .join(Question, Question.id == TestQuestion.question_id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(
                TestAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("code"), String).in_(
                    topic_codes
                )
                if topic_codes
                else True,
            )
            .distinct(TestQuestion.question_id)
        )
        result = await session.execute(query)

        return result.scalars().all()

    async def get_omitted_qs(
        self,
        paper_id: int,
        user_id: int,
        subject_codes: list[str] | None = [],
        topic_codes: list[str] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        # attempted_qs_query = (
        #     select(TestQuestion)
        #     .select_from(TestQuestionAttempt)
        #     .join(TestAttempt, TestQuestionAttempt.test_attempt_id == TestAttempt.id)
        #     .join(
        #         TestQuestion,
        #         TestQuestion.question_id == TestQuestionAttempt.question_id,
        #     )
        #     .filter(TestAttempt.attempted_by_id == user_id)
        #     .distinct(TestQuestionAttempt.question_id)
        #     .order_by(TestQuestionAttempt.question_id)
        # )

        # tq_attempted_query = (
        #     (
        #         select(TestQuestion)
        #         .select_from(TestQuestion)
        #         .outerjoin(
        #             TestAttempt,
        #             and_(
        #                 TestQuestion.test_id == TestAttempt.test_id,
        #                 TestAttempt.attempted_by_id == user_id,
        #             ),
        #         )
        #         .outerjoin(
        #             TestQuestionAttempt,
        #             and_(
        #                 TestQuestion.question_id == TestQuestionAttempt.question_id,
        #                 # TestQuestion.question_id.notin_(attempted_q_ids_subquery),
        #             ),
        #         )
        #         .outerjoin(Question, Question.id == TestQuestion.question_id)
        #     )
        #     .filter(
        #         TestAttempt.attempted_by_id == user_id,
        #         (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
        #     )
        #     .distinct(TestQuestion.question_id)
        #     .order_by(TestQuestion.question_id)
        # )

        tqa_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestionAttempt, TestQuestionAttempt.question_id == Question.id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("code"), String).in_(subject_codes)
                if subject_codes
                else True,
                cast(Question.topic.op("->>")("code"), String).in_(topic_codes)
                if topic_codes
                else True,
                # (
                #     TestQuestionAttempt.is_correct_attempt == False
                #     or TestQuestionAttempt.is_correct_attempt == True
                # ),
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        tq_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestion, TestQuestion.question_id == Question.id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(TestAttempt.attempted_by_id == user_id,
                   (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("code"), String).in_(subject_codes)
                if subject_codes
                else True,
                cast(Question.topic.op("->>")("code"), String).in_(topic_codes)
                if topic_codes
                else True,
                   )
            .distinct(Question.id)
        )

        result = await session.execute(tqa_query)

        result2 = await session.execute(tq_query)

        resp = result.scalars().all()
        resp2 = result2.scalars().all()
        # res = list(set(resp2) - (set(resp)))
        res =  [q for q in resp2 if q not in resp]
               

        return res

    async def get_ca_omitted_qs(
        self,
        paper_id: int,
        user_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        tqa_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestionAttempt, TestQuestionAttempt.question_id == Question.id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                
                # (
                #     TestQuestionAttempt.is_correct_attempt == False
                #     or TestQuestionAttempt.is_correct_attempt == True
                # ),
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        tq_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestion, TestQuestion.question_id == Question.id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(TestAttempt.attempted_by_id == user_id,
                   (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True )
            .distinct(Question.id)
        )

        result = await session.execute(tqa_query)

        result2 = await session.execute(tq_query)

        resp = result.scalars().all()
        resp2 = result2.scalars().all()
        res = list(set(resp2) - (set(resp)))

        return res

    async def get_omitted_qs_mains(
        self,
        paper_ids: list[int],
        user_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        
        tqa_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestionAttempt, TestQuestionAttempt.question_id == Question.id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
                # (
                #     TestQuestionAttempt.is_correct_attempt == False
                #     or TestQuestionAttempt.is_correct_attempt == True
                # ),
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        tq_query = (
            select(Question)
            .select_from(Question)
            .join(TestQuestion, TestQuestion.question_id == Question.id)
            .join(TestAttempt, TestAttempt.test_id == TestQuestion.test_id)
            .where(TestAttempt.attempted_by_id == user_id,
                   (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
                cast(Question.subject.op("->>")("code"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("code"), Integer).in_(topic_ids)
                if topic_ids
                else True,
                   )
            .distinct(Question.id)
        )

        result = await session.execute(tqa_query)

        result2 = await session.execute(tq_query)

        resp = result.scalars().all()
        resp2 = result2.scalars().all()
        # res = list(set(resp2) - (set(resp)))
        res =  [q for q in resp2 if q not in resp]
               

        return res

    async def agg_test_type_reports(
        self,
        user_id: int,
        paper_id: int,
        is_full_length: bool,
        from_date: date| None = None,
        till_date: date| None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (Test.test_type).label("test_type"),
                (func.count()).label("tests_taken"),
            )
            .select_from(self.model)
            .join(
                Test,
                Test.id == self.model.test_id,
            )
            .where(
                self.model.attempted_by_id == user_id,
                self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == is_full_length
            )
            .group_by("test_type")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        
        result = await session.execute(query)

        return result.all()

    async def agg_prelims_test_type_reports(
        self,
        user_id: int,
        stage_ids: list[int],
        is_full_length: bool,
        from_date: date| None = None,
        till_date: date| None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (Test.test_type).label("test_type"),
                (func.count()).label("tests_taken"),
            )
            .select_from(self.model)
            .join(
                Test,
                Test.id == self.model.test_id,
            )
            .where(
                self.model.attempted_by_id == user_id,
                self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                Test.is_full_length == is_full_length
            )
            .group_by("test_type")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        
        result = await session.execute(query)

        return result.all()

    async def agg_ta_mode_results(
        self,
        user_id: int,
        paper_id: int,
        from_date: date | None = None,
        till_date:date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (TestAttempt.test_attempt_mode).label("ta_mode"),
                (func.count()).label("tests_taken"),
            )
            .join(
                Test,
                Test.id == self.model.test_id,
            )
            .select_from(self.model)
            .where(
                self.model.attempted_by_id == user_id,
                Test.is_full_length == False,
                self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
            )
            .group_by("ta_mode")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.all()

    async def agg_prelims_ta_mode_results(
        self,
        user_id: int,
        stage_ids: list[int],
        from_date: date | None = None,
        till_date:date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (TestAttempt.test_attempt_mode).label("ta_mode"),
                (func.count()).label("tests_taken"),
            )
            .join(
                Test,
                Test.id == self.model.test_id,
            )
            .select_from(self.model)
            .where(
                self.model.attempted_by_id == user_id,
                Test.is_full_length == False,
                self.model.status == TEST_ATTEMPT_STATUS.completed,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
            )
            .group_by("ta_mode")
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.all()


    async def agg_ta_qs_results(
        self,
        user_id: int,
        paper_id: int,
        is_full_length: bool,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (func.sum(TestAttempt.correct)).label("correct_count"),
                (func.sum(TestAttempt.incorrect)).label("incorrect_count"),
                (func.sum(TestAttempt.unattempted)).label("unattempted_count"),
                # (func.count()).label("tests_taken"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                 self.model.status == TEST_ATTEMPT_STATUS.completed,
                Test.is_full_length == is_full_length,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id)
            )
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.first()._asdict()
    
    async def agg_prelims_ta_qs_results(
        self,
        user_id: int,
        stage_ids: list[int],
        is_full_length: bool,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (func.sum(TestAttempt.correct)).label("correct_count"),
                (func.sum(TestAttempt.incorrect)).label("incorrect_count"),
                (func.sum(TestAttempt.unattempted)).label("unattempted_count"),
                # (func.count()).label("tests_taken"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                 self.model.status == TEST_ATTEMPT_STATUS.completed,
                Test.is_full_length == is_full_length,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids))
            )
        )
        if from_date and till_date:
            query = query.where(TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    ))
        result = await session.execute(query)

        return result.first()._asdict()
    

    async def agg_mains_ta_qs_results(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (func.sum(TestAttempt.correct)).label("correct_count"),
                (func.sum(TestAttempt.incorrect)).label("incorrect_count"),
                (func.sum(TestAttempt.unattempted)).label("unattempted_count"),
                (func.avg(((self.model.score) / Test.max_marks)) * 100).label(
                    "user_score_percent"
                ),
                # (func.count()).label("tests_taken"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                 self.model.status.in_([TEST_ATTEMPT_STATUS.completed]),
               Test.stage.op("->>")("name").ilike("%Mains%")
            )
        )
        result = await session.execute(query)

        return result.first()._asdict()
    
    async def get_mains_test_eval_count(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (
            select(
                (func.count()).label("tests_eval_count"),
            )
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                 self.model.status.in_([TEST_ATTEMPT_STATUS.completed]),
                 self.model.test_evaluation_status.in_([TEST_ASSESSMENT_STATUS.accepted,TEST_ASSESSMENT_STATUS.evaluated]),
               Test.stage.op("->>")("name").ilike("%Mains%")
            )
        )
        result = await session.execute(query)

        return result.scalar_one()

    async def agg_ta_avg_high_low_score(self,user_id:int, db_session: AsyncSession | None = None):
        session = db_session 
        query = (
                select(func.avg(self.model.score).label("average_score"),
                       func.min(self.model.score).label("lowest_score"),
                        func.max(self.model.score).label("highest_score"),)
            .select_from(self.model)
            .join(Test, Test.id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.stage.op("->>")("name").ilike("%Mains%"),
                 self.model.status.in_([TEST_ATTEMPT_STATUS.completed ])
            )
        )
        result = await session.execute(query)

        return result.first()._asdict()

    async def agg_mains_paper_wise_perf(self,user_id:int,db_session: AsyncSession | None = None):
        session = db_session
        paper_name_expr = cast(Test.paper.op("->>")("name"), String)
        subquery = (
        select(
            paper_name_expr.label("paper_name"),
            # Test.id.label("test_id"),
            # self.model.attempted_by_id.label("user_id"),
            func.count().label("tests_taken"),
            func.sum(self.model.score).label("user_scores"),
            func.rank()
                .over(
                    partition_by=paper_name_expr,
                    order_by=func.sum(self.model.score).desc()
                ).label("rank"),
            func.percent_rank()
                .over(
                    partition_by=paper_name_expr,
                    order_by=func.sum(self.model.score).asc()
                ).label("percentile"),
            func.sum(self.model.correct + self.model.incorrect).label("attempted"),
            func.sum(self.model.correct + self.model.incorrect + self.model.unattempted).label("total_qs"),
            func.avg(self.model.score).label("avg_score"),
            func.avg(Test.max_marks).label("avg_max_marks")
        )
        .join(Test, Test.id == self.model.test_id)
        .where(
            Test.stage.op("->>")("name").ilike("%Mains%"),
            self.model.status.in_([TEST_ATTEMPT_STATUS.completed]),
            self.model.attempted_by_id == user_id,
        )
        .group_by("paper_name")
        .subquery()
    )

        query = (
            select(
                subquery.c.paper_name,
                func.json_agg(
                    func.json_build_object(
                        # "user_id", subquery.c.user_id,
                        "test_taken", subquery.c.tests_taken,
                        "rank", subquery.c.rank,
                        "percentile", subquery.c.percentile,
                        "perc_q_attempted", (subquery.c.attempted * 100.0 / func.nullif(subquery.c.total_qs, 0)),
                        "user_score_percent", (subquery.c.avg_score * 100.0 / func.nullif(subquery.c.avg_max_marks, 0))
                    )
                ).label("paper_stats")
            )
            .group_by(subquery.c.paper_name)
        )

        result = await session.execute(query)

        return result.all()

        
        

class TestQuestionAttemptService(
    BaseService[
        TestQuestionAttempt, TestQuestionAttemptCreate, TestQuestionAttemptUpdate
    ]
):
    async def calculate_percent_score(
        self,
        subject_name: str,
        user_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select((self.model.marks_obtained) / (Question.max_marks))
            .select_from(self.model)
            .outerjoin(Question, Question.id == self.model.question_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    self.model.updated_at.between(from_date, till_date),
                    (
                        cast(Question.subjects[0].op("->>")("name"), String)
                        == subject_name
                    ),
                )
            )
            .order_by(self.model.created_at.asc())
        )

        result = await session.execute(query)
        scores = result.scalars().all()
        print("scores", scores)
        if not scores:
            raise AttemptNotFound()
        percentage_change = ((scores[0] - scores[-1]) / scores[0]) * 100
        return percentage_change

    async def get_tq_attempt(
        self,
        test_attempt_id: int,
        question_id: int,
        db_session: AsyncSession | None = None,
    ) -> TestQuestionAttempt:
        session = db_session 
        query = select(self.model).where(
            self.model.test_attempt_id == test_attempt_id,
            self.model.question_id == question_id,
        )
        test_question = await session.execute(query)

        return test_question.scalar_one_or_none()
    
    
    async def get_all_tq_attempts(
        self,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[TestQuestionAttempt]:
        session = db_session 
        query = select(self.model).where(self.model.test_attempt_id == test_attempt_id)
        test_qs = await session.execute(query)

        return test_qs.scalars().all()

    async def del_test_question_attempt(
        self,
        test_attempt_id: int,
        question_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        tq_attempt_db = await self.get_tq_attempt(
            test_attempt_id=test_attempt_id,
            question_id=question_id,
            db_session=db_session,
        )

        if not tq_attempt_db:
            raise TestQuestionAttemptNotFound()

        try:
            await session.delete(tq_attempt_db)
            await session.commit()
        except exc.IntegrityError as err:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource delete error",
            )

        return tq_attempt_db

    async def calc_test_technique_results(
        self,
        test_id: int,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        tqs = await self.get_by_field_multi(
            value=test_attempt_id, field="test_attempt_id",db_session=db_session
        )
        
        if len(tqs) != 0:
            query = (
                select(
                    (self.model.elimination_technique).label("technique"),
                    func.count().label("total_qs"),
                    (
                        func.sum(
                            case((self.model.is_correct_attempt == True, 1), else_=0)
                        )
                    ).label("correct"),
                    func.sum(
                        case((self.model.is_correct_attempt == False, 1), else_=0)
                    ).label("incorrect"),
                    func.sum(
                        case((self.model.is_correct_attempt == None, 1), else_=0)
                    ).label("unattempted"),
                    func.sum(self.model.marks_obtained).label("marks_acquired"),
                    (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
                )
                .select_from(self.model)
                .where(
                    self.model.test_attempt_id == test_attempt_id,
                    self.model.test_id == test_id,
                    self.model.elimination_technique != None,
                )
                .group_by(self.model.elimination_technique)
            )
            results = await session.execute(query)
            response = results.all()
            

            return response

    async def calc_agg_technique_results(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                (self.model.elimination_technique).label("techique"),
                func.count().label("total_answers"),
                (
                    func.sum(case((self.model.is_correct_attempt == True, 1), else_=0))
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(
                    case((self.model.is_correct_attempt == None, 1), else_=0)
                ).label("unattempted"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    cast(
                        (
                            func.sum(
                                case(
                                    (self.model.is_correct_attempt == True, 1), else_=0
                                )
                            )
                            * 100
                        )
                        / func.count(),
                        Float,
                    )
                ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(Test, self.model.test_id == Test.id)
            .where(
                self.model.attempted_by_id == user_id,
                self.model.elimination_technique != None,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
            )
            .group_by(self.model.elimination_technique)
        )
        results = await session.execute(query)
        response = results.all()
        return response

    async def calc_agg_technique_results_time_filters(
        self,
        user_id: int,
        paper_id: int,
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                (self.model.elimination_technique).label("techique"),
                func.count().label("total_answers"),
                (
                    func.sum(case((self.model.is_correct_attempt == True, 1), else_=0))
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(
                    case((self.model.is_correct_attempt == None, 1), else_=0)
                ).label("unattempted"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    cast(
                        (
                            func.sum(
                                case(
                                    (self.model.is_correct_attempt == True, 1), else_=0
                                )
                            )
                            * 100
                        )
                        / func.count(),
                        Float,
                    )
                ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(Test, self.model.test_id == Test.id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                self.model.elimination_technique != None,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(self.model.elimination_technique)
        )
        results = await session.execute(query)
        response = results.all()
        return response

    async def calc_prelims_agg_technique_results_time_filters(
        self,
        user_id: int,
        stage_ids: list[int],
        full_length_result: bool,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = (
            select(
                (self.model.elimination_technique).label("techique"),
                func.count().label("total_answers"),
                (
                    func.sum(case((self.model.is_correct_attempt == True, 1), else_=0))
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(
                    case((self.model.is_correct_attempt == None, 1), else_=0)
                ).label("unattempted"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    cast(
                        (
                            func.sum(
                                case(
                                    (self.model.is_correct_attempt == True, 1), else_=0
                                )
                            )
                            * 100
                        )
                        / func.count(),
                        Float,
                    )
                ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(Test, self.model.test_id == Test.id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                self.model.elimination_technique != None,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(self.model.elimination_technique)
        )
        results = await session.execute(query)
        response = results.all()
        return response

    async def calculate_test_attempt_results(
        self,
        test_attempt_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        tqs = await self.get_by_field_multi(
            value=test_attempt_id, field="test_attempt_id",db_session=db_session
        )
        if len(tqs) != 0:
            query = (
                select(
                    func.sum(self.model.marks_obtained).label("score"),
                    func.sum(
                        case((self.model.is_correct_attempt == True, 1), else_=0)
                    ).label("correct"),
                    func.sum(
                        case((self.model.is_correct_attempt == False, 1), else_=0)
                    ).label("incorrect"),
                )
                .select_from(self.model)
                .where(self.model.test_attempt_id == test_attempt_id)
            )
            aggregate_results = await session.execute(query)

            return aggregate_results.first()._asdict()
        else:
            return {"score": 0, "correct": 0, "incorrect": 0}

    async def calculate_tq_aggregates(
        self,
        test_id: int,
        question_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        query = select(
            func.count().label("attempts_count"),
            (
                (
                    func.sum(case((self.model.is_correct_attempt == True, 1), else_=0))
                    * 100.0
                )
                / func.count()
            ).label("correct_attempts_percent"),
        ).where(self.model.test_id == test_id, self.model.question_id == question_id)

        result = await session.execute(query)

        return result.first()._asdict()

    async def calc_tq_answered(
        self,
        user_id: int,
        paper_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        latest_attempts_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Joining TestQuestionAttempt with the subquery to filter latest attempts
        query = (
            select(
                func.count().label("attempts_count"),
                func.coalesce(
                    func.sum(case((TestQuestionAttempt.is_correct_attempt == True, 1), else_=0)), 0
                ).label("correct_attempts_count"),
                func.coalesce(
                    func.sum(case((TestQuestionAttempt.is_correct_attempt == False, 1), else_=0)), 0
                ).label("incorrect_attempts_count")
            )
            .select_from(TestQuestionAttempt)
            .join(
                latest_attempts_subquery,
                and_(
                    (
                        TestQuestionAttempt.question_id
                        == latest_attempts_subquery.c.question_id
                    ),
                    TestQuestionAttempt.created_at
                    == latest_attempts_subquery.c.latest_created_at,
                ),
            )
        )

        counts = await session.execute(query)
        resp = counts.first()._asdict()
        return resp

    async def calc_ca_tq_answered(
        self,
        user_id: int,
        paper_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        latest_attempts_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Joining TestQuestionAttempt with the subquery to filter latest attempts
        query = (
            select(
                func.count().label("attempts_count"),
                func.coalesce(
                    func.sum(case((TestQuestionAttempt.is_correct_attempt == True, 1), else_=0)), 0
                ).label("correct_attempts_count"),
                func.coalesce(
                    func.sum(case((TestQuestionAttempt.is_correct_attempt == False, 1), else_=0)), 0
                ).label("incorrect_attempts_count")
            )
            .select_from(TestQuestionAttempt)
            .join(
                latest_attempts_subquery,
                and_(
                    (
                        TestQuestionAttempt.question_id
                        == latest_attempts_subquery.c.question_id
                    ),
                    TestQuestionAttempt.created_at
                    == latest_attempts_subquery.c.latest_created_at,
                ),
            )
        )

        counts = await session.execute(query)
        resp = counts.first()._asdict()
       
        return resp

    async def calc_tq_fl_answered(
        self,
        user_id: int,
        paper_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        latest_attempts_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Joining TestQuestionAttempt with the subquery to filter latest attempts
        query = (
            select(
                func.count().label("attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == True, 1), else_=0)
                ).label("correct_attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect_attempts_count"),
            )
            .select_from(TestQuestionAttempt)
            .join(
                latest_attempts_subquery,
                and_(
                    (
                        TestQuestionAttempt.question_id
                        == latest_attempts_subquery.c.question_id
                    ),
                    TestQuestionAttempt.created_at
                    == latest_attempts_subquery.c.latest_created_at,
                ),
            )
            .join(Test, Test.id == TestQuestionAttempt.test_id)
            .where(
                Test.is_full_length == True,
                TestQuestionAttempt.attempted_by_id == user_id,
            )
        )

        counts = await session.execute(query)
        resp = counts.first()._asdict()
       
        return resp

    async def calc_tq_fl_answered_with_time_filters(
        self,
        user_id: int,
        paper_id: int,
        from_date: date,
        till_date: date,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        latest_attempts_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Joining TestQuestionAttempt with the subquery to filter latest attempts
        query = (
            select(
                func.count().label("attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == True, 1), else_=0)
                ).label("correct_attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect_attempts_count"),
            )
            .select_from(TestQuestionAttempt)
            .join(
                latest_attempts_subquery,
                and_(
                    (
                        TestQuestionAttempt.question_id
                        == latest_attempts_subquery.c.question_id
                    ),
                    TestQuestionAttempt.created_at
                    == latest_attempts_subquery.c.latest_created_at,
                ),
            )
            .join(Test, Test.id == TestQuestionAttempt.test_id)
            .join(TestAttempt, TestAttempt.id == TestQuestionAttempt.test_attempt_id)
            .where(
                Test.is_full_length == True,
                TestQuestionAttempt.attempted_by_id == user_id,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))

            )
        )

        counts = await session.execute(query)
        resp = counts.first()._asdict()
       
        return resp

    async def calc_prelims_tq_fl_answered_with_time_filters(
        self,
        user_id: int,
        stage_ids: list[int],
        from_date: date,
        till_date: date,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        paper_ids = await get_paper_ids(stage_ids=stage_ids)
        latest_attempts_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids)),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Joining TestQuestionAttempt with the subquery to filter latest attempts
        query = (
            select(
                func.count().label("attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == True, 1), else_=0)
                ).label("correct_attempts_count"),
                func.sum(
                    case((TestQuestionAttempt.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect_attempts_count"),
            )
            .select_from(TestQuestionAttempt)
            .join(
                latest_attempts_subquery,
                and_(
                    (
                        TestQuestionAttempt.question_id
                        == latest_attempts_subquery.c.question_id
                    ),
                    TestQuestionAttempt.created_at
                    == latest_attempts_subquery.c.latest_created_at,
                ),
            )
            .join(Test, Test.id == TestQuestionAttempt.test_id)
            .join(TestAttempt, TestAttempt.id == TestQuestionAttempt.test_attempt_id)
            .where(
                Test.is_full_length == True,
                TestQuestionAttempt.attempted_by_id == user_id,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1))

            )
        )

        counts = await session.execute(query)
        resp = counts.first()._asdict()
       
        return resp

    async def get_tq_ans_qs(
        self,
        user_id: int,
        paper_id: int,
        subject_codes: list[str] | None = [],
        topic_codes: list[str] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        latest_attempt_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("code"), String).in_(subject_codes)
                if subject_codes
                else True,
                cast(Question.topic.op("->>")("code"), String).in_(topic_codes)
                if topic_codes
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Query to get attempted correct questions
        correct_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == True)

        # Query to get attempted incorrect questions
        incorrect_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == False)

        # Execute the queries
        correct_attempts = await session.execute(correct_attempts_query)
        correct_resp = correct_attempts.scalars().all()
        incorrect_attempts = await session.execute(incorrect_attempts_query)
        incorrect_resp = incorrect_attempts.scalars().all()
        # return {"correct": resp}, {"incorrect": resp2}
        return correct_resp, incorrect_resp

    async def get_ca_tq_ans_qs(
        self,
        user_id: int,
        paper_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        latest_attempt_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Query to get attempted correct questions
        correct_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == True)

        # Query to get attempted incorrect questions
        incorrect_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == False)

        # Execute the queries
        correct_attempts = await session.execute(correct_attempts_query)
        correct_resp = correct_attempts.scalars().all()
        incorrect_attempts = await session.execute(incorrect_attempts_query)
        incorrect_resp = incorrect_attempts.scalars().all()
        # return {"correct": resp}, {"incorrect": resp2}
        return correct_resp, incorrect_resp

    async def get_tq_ans_qs_mains(
        self,
        user_id: int,
        paper_ids:list[int] | None = [],
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ):
        session = db_session 

        latest_attempt_subquery = (
            select(
                (TestQuestionAttempt.question_id).label("question_id"),
                func.max(TestQuestionAttempt.created_at).label("latest_created_at"),
            )
            .select_from(TestQuestionAttempt)
            .join(Question, Question.id == TestQuestionAttempt.question_id)
            .where(
                TestQuestionAttempt.attempted_by_id == user_id,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .group_by(TestQuestionAttempt.question_id)
            .order_by("question_id")
            .subquery()
        )

        # Query to get attempted correct questions
        correct_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == True)

        # Query to get attempted incorrect questions
        incorrect_attempts_query = (
            select((Question))
            .select_from(Question)
            .join(
                TestQuestionAttempt,
                TestQuestionAttempt.question_id == Question.id,
            )
            .join(
                latest_attempt_subquery,
                and_(
                    TestQuestionAttempt.question_id
                    == latest_attempt_subquery.c.question_id,
                    TestQuestionAttempt.created_at
                    == latest_attempt_subquery.c.latest_created_at,
                ),
            )
        ).where(TestQuestionAttempt.is_correct_attempt == False)

        # Execute the queries
        correct_attempts = await session.execute(correct_attempts_query)
        correct_resp = correct_attempts.scalars().all()
        incorrect_attempts = await session.execute(incorrect_attempts_query)
        incorrect_resp = incorrect_attempts.scalars().all()
        # return {"correct": resp}, {"incorrect": resp2}
        return correct_resp, incorrect_resp


    async def calculate_q_aggregates(
        self,
        question_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = select(
            func.count().label("attempts_count"),
            (
                (
                    func.sum(case((self.model.is_correct_attempt == True, 1), else_=0))
                    * 100.0
                )
                / func.count()
            ).label("correct_attempts_percent"),
        ).where(self.model.question_id == question_id)

        result = await session.execute(query)

        return result.first()._asdict()

    async def calculate_mains_q_aggregates(
        self, question_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = (
            select(
                (
                    (
                        func.count()
                        / func.sum(
                            case(TestQuestion.question_id == question_id, 1), else_=0
                        )
                    )
                    * 100
                ).label("attempted_percent")
            )
            .select_from(TestQuestion)
            .outerjoin(TestQuestionAttempt)
            .where(
                self.model.question_id == question_id,
                TestQuestion.question_id == question_id,
            )
        )
        result = await session.execute(query)
        return result.first()._asdict

    async def calc_test_subject_matrix(
        self,
        test_id: int,
        test_attempt_id: int,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # subjects_subquery = select(
        #     Question.subject.label("subj"),
        #     Question.id.label("question_id"),
        # ).subquery()
        # # Define aliases for the tables
        # tqa = aliased(TestQuestionAttempt)
        # tq = aliased(TestQuestion)
        # q = aliased(Question)

        # subquery = (
        #     select(
        #         literal_column("(subj->>'name')").label("subject_name"),
        #         (Question.max_marks).label("marks_per_q"),
        #         (tqa.marks_obtained).label("scored_marks"),
        #         (tq.question_id).label("questions"),
        #         case((tqa.is_correct_attempt == True, 1), else_=0).label("correct"),
        #         case((tqa.is_correct_attempt == False, 1), else_=0).label("incorrect"),
        #     )
        #     .select_from(tqa)
        #     .join(q, q.id == tqa.question_id)
        #     .join(tq, tq.test_id == tqa.test_id)
        #     .join(subjects_subquery, subjects_subquery.c.question_id == tqa.question_id)
        #     .where(
        #         and_(
        #             self.model.test_id == test_id,
        #             self.model.test_attempt_id == test_attempt_id,
        #         )
        #     )
        #     .group_by(
        #         "subject_name",
        #         tq.question_id,
        #         tqa.is_correct_attempt,
        #         tqa.marks_obtained,
        #         Question.max_marks,
        #     )
        # )
        # stmt = (
        #     select(
        #         subquery.c.subject_name,
        #         func.sum(subquery.c.scored_marks).label("total_marks"),
        #         func.count(subquery.c.questions).label("total_questions"),
        #         func.sum(subquery.c.correct).label("correct"),
        #         func.sum(subquery.c.incorrect).label("incorrect"),
        #         (
        #             func.sum(subquery.c.scored_marks)
        #             * 100
        #             / func.sum(subquery.c.marks_per_q)
        #         ).label("scored_percentage"),
        #     )
        #     .select_from(subquery)
        #     .group_by(subquery.c.subject_name)
        # )

        # result = await session.execute(stmt)
        # scores = result.all()
        # return scores

        session = db_session 
        subjects_subquery = (
            select(
                Question.subject.label("subj"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        tqs = await self.get_by_field_multi(
            value=test_attempt_id, field="test_attempt_id", db_session=session
        )
        if len(tqs) != 0:
            query = (
                select(
                    literal_column("(subj->>'name')").label("subject_name"),
                    # func.count(tq_query.c.q_id).label("total_count"),
                    func.sum(
                        case((self.model.is_correct_attempt == True, 1), else_=0)
                    ).label("correct"),
                    func.sum(
                        case((self.model.is_correct_attempt == False, 1), else_=0)
                    ).label("incorrect"),
                    func.sum(self.model.marks_obtained).label("marks_acquired"),
                )
                .select_from(self.model)
                .join(
                    subjects_subquery,
                    subjects_subquery.c.question_id == self.model.question_id,
                )
                # .join(tq_query, subjects_subquery.c.question_id == tq_query.c.q_id)
                .where(
                    self.model.test_attempt_id == test_attempt_id,
                    self.model.test_id == test_id,
                )
                .group_by("subject_name")
            )
            results = await session.execute(query)
            response = results.all()

            return response

    async def calc_total_q_subject_matrix(
        self, test_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        subjects_subquery = (
            select(
                Question.subject.label("subj"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )
        tq_query = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
            )
            .select_from(TestQuestion)
            .join(
                subjects_subquery,
                TestQuestion.question_id == subjects_subquery.c.question_id,
            )
            .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
        )
        results = await session.execute(tq_query)
        response = results.all()

        return response

    async def calc_test_subj_strength(
        self, test_id: int, test_attempt_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 

        # Define query1 as a subquery
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("subj_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                query2.c.tq_count,
                query2.c.subj_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("score_percent"),           
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
        )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .where(
                self.model.test_attempt_id == test_attempt_id,
                self.model.test_id == test_id,
            )
            .group_by(
                query2.c.subject_name, query2.c.tq_count, query2.c.subj_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_test_topic_strength(
        self, test_id: int, test_attempt_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 

        # Define query1 as a subquery
        query1 = (
            select(
                Question.topic.label("topic"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(topic->>'name')").label("topic_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("topic_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            .where(TestQuestion.test_id == test_id)
            .group_by("topic_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.topic_name,
                query2.c.tq_count,
                query2.c.topic_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.topic_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.topic_name == literal_column("(topic->>'name')"),
            )
            .where(
                self.model.test_attempt_id == test_attempt_id,
                self.model.test_id == test_id,
            )
            .group_by(
                query2.c.topic_name, query2.c.tq_count, query2.c.topic_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_aggr_mains_paper_strength(
        self, user_id:int, db_session: AsyncSession | None = None
    ):
        session = db_session 

        # Define query1 as a subquery
        query1 = (
            select(
                Question.paper.label("q_paper"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        # query2 = (
        #     select(
        #         literal_column("(paper->>'name')").label("paper_name"),
        #         func.count(TestQuestion.question_id).label("tq_count"),
        #         func.sum(query1.c.q_max_marks).label("paper_total_marks"),
        #     )
        #     .select_from(TestQuestion)
        #     .join(
        #         query1,
        #         TestQuestion.question_id == query1.c.question_id,
        #     )
        #     .group_by("paper_name")
        #     .cte("query2")
        # )
        query2 = (
                select(
                    literal_column("(q_paper->>'name')").label("paper_name"),
                    func.count(TestQuestion.question_id).label("tq_count"),
                    func.sum(query1.c.q_max_marks).label("paper_total_marks"),
                )
                .select_from(TestQuestion)
                .join(query1, TestQuestion.question_id == query1.c.question_id)
                .join(Test, Test.id == TestQuestion.test_id)
                .join(TestAttempt, TestAttempt.test_id == Test.id)
                .where(
                    Test.stage.op("->>")("name").ilike("%Mains%"),
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
                .group_by("paper_name")
                .cte("query2")
            )


        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.paper_name,
                query2.c.tq_count,
                query2.c.paper_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.paper_total_marks
                ).label("score_percent"),           
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
        )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.paper_name == literal_column("(q_paper->>'name')"),
            )
            .join(Test, Test.id ==  self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .join(TestAttempt, TestAttempt.test_id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.stage.op("->>")("name").ilike("%Mains%"),
                TestAttempt.status == TEST_ATTEMPT_STATUS.completed
               
            )
            .group_by(
                query2.c.paper_name, query2.c.tq_count, query2.c.paper_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_aggr_mains_subj_strength(
        self, user_id:int, db_session: AsyncSession | None = None
    ):
        session = db_session 

        # Define query1 as a subquery
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery

        query2 = (
                select(
                     literal_column("(subj->>'name')").label("subject_name"),
                    func.count(TestQuestion.question_id).label("tq_count"),
                    func.sum(query1.c.q_max_marks).label("subj_total_marks"),
                )
                .select_from(TestQuestion)
                .join(query1, TestQuestion.question_id == query1.c.question_id)
                .join(Test, Test.id == TestQuestion.test_id)
                .join(TestAttempt, TestAttempt.test_id == Test.id)
                .where(
                    Test.stage.op("->>")("name").ilike("%Mains%"),
                    TestAttempt.attempted_by_id == user_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
                .group_by("subject_name")
                .cte("query2")
            )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                query2.c.tq_count,
                query2.c.subj_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("score_percent"),           
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
        )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .join(Test,Test.id == self.model.test_id)
            .join(TestAttempt,TestAttempt.test_id == self.model.test_id)
            .where(
                self.model.attempted_by_id == user_id,
                Test.stage.op("->>")("name").ilike("%Mains%"),
                TestAttempt.status == TEST_ATTEMPT_STATUS.completed
            )
            .group_by(
                query2.c.subject_name, query2.c.tq_count, query2.c.subj_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_agg_subject_matrix(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("subj_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                query2.c.tq_count,
                query2.c.subj_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
            )
            .group_by(
                query2.c.subject_name, query2.c.tq_count, query2.c.subj_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_agg_subject_matrix_time_filters(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        from_date:date,
        till_date:date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("subj_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                query2.c.tq_count,
                query2.c.subj_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                query2.c.subject_name, query2.c.tq_count, query2.c.subj_total_marks
            )
        )
               
        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_perlims_agg_subject_matrix_time_filters(
        self,
        stage_ids: list[int],
        user_id: int,
        full_length_result: bool,
        from_date:date,
        till_date:date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.subject.label("subj"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("subj_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("subject_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.subject_name,
                query2.c.tq_count,
                query2.c.subj_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.subj_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.subject_name == literal_column("(subj->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                query2.c.subject_name, query2.c.tq_count, query2.c.subj_total_marks
            )
        )
               
        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_agg_topic_matrix(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.topic.label("topic"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(topic->>'name')").label("topic_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("topic_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("topic_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.topic_name,
                query2.c.tq_count,
                query2.c.topic_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.topic_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.topic_name == literal_column("(topic->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
            )
            .group_by(
                query2.c.topic_name, query2.c.tq_count, query2.c.topic_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_agg_topic_matrix_with_time_filters(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        from_date:date,
        till_date:date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.topic.label("topic"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(topic->>'name')").label("topic_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("topic_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("topic_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.topic_name,
                query2.c.tq_count,
                query2.c.topic_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.topic_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.topic_name == literal_column("(topic->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                query2.c.topic_name, query2.c.tq_count, query2.c.topic_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_prelims_agg_topic_matrix_with_time_filters(
        self,
        stage_ids: list[int],
        user_id: int,
        full_length_result: bool,
        from_date:date,
        till_date:date,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.topic.label("topic"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(topic->>'name')").label("topic_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("topic_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("topic_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.topic_name,
                query2.c.tq_count,
                query2.c.topic_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.topic_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.topic_name == literal_column("(topic->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .join(TestAttempt, TestAttempt.id == self.model.test_attempt_id)
            .where(
                self.model.attempted_by_id == user_id,
                (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                Test.is_full_length == full_length_result,
                TestAttempt.updated_at.between(
                        from_date - timedelta(1), till_date + timedelta(1)
                    )
            )
            .group_by(
                query2.c.topic_name, query2.c.tq_count, query2.c.topic_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def calc_agg_curr_aff_matrix(
        self,
        paper_id: int,
        user_id: int,
        full_length_result: bool,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        # Define query1 as a subquery, question question
        query1 = (
            select(
                Question.current_affairs_topic.label("topic"),
                Question.max_marks.label("q_max_marks"),
                Question.id.label("question_id"),
            )
            .select_from(Question)
            .subquery()
        )

        # Define query2 as a subquery
        query2 = (
            select(
                literal_column("(topic->>'name')").label("topic_name"),
                func.count(TestQuestion.question_id).label("tq_count"),
                func.sum(query1.c.q_max_marks).label("topic_total_marks"),
            )
            .select_from(TestQuestion)
            .join(
                query1,
                TestQuestion.question_id == query1.c.question_id,
            )
            # .where(TestQuestion.test_id == test_id)
            .group_by("topic_name")
            .cte("query2")
        )

        # Combine query1 and query2
        combined_query = (
            select(
                query2.c.topic_name,
                query2.c.tq_count,
                query2.c.topic_total_marks,
                func.sum(
                    case((self.model.is_correct_attempt == True, 1), else_=0)
                ).label("correct"),
                func.sum(
                    case((self.model.is_correct_attempt == False, 1), else_=0)
                ).label("incorrect"),
                func.sum(self.model.marks_obtained).label("marks_acquired"),
                (
                    (func.sum(self.model.marks_obtained))
                    * 100
                    / query2.c.topic_total_marks
                ).label("score_percent"),
                (
                        cast(
                            (
                                func.sum(
                                    case(
                                        (self.model.is_correct_attempt == True, 1),
                                        else_=0,
                                    )
                                )
                                * 100
                            )
                            / func.count(),
                            Float,
                        )
                    ).label("accuracy_percent"),
            )
            .select_from(self.model)
            .join(
                query1,
                query1.c.question_id == self.model.question_id,
            )
            .join(
                query2,
                query2.c.topic_name == literal_column("(topic->>'name')"),
            )
            .join(Test, Test.id == self.model.test_id)
            .join(Question, Question.id == self.model.question_id)
            .where(
                self.model.attempted_by_id == user_id,
                Question.is_current_affairs == True,
                (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                Test.is_full_length == full_length_result,
            )
            .group_by(
                query2.c.topic_name, query2.c.tq_count, query2.c.topic_total_marks
            )
        )

        # Execute the query and fetch results
        results = await session.execute(combined_query)
        response = results.all()
        return response

    async def agg_mains_tests_analysis(self, user_id: int, db_session: AsyncSession | None = None):
        session = db_session
        query = (select(TestAttempt.id,cast(TestAttempt.macro_comment.op("->>")("FeedBack"), String).label("Feedback")).select_from(TestAttempt)).subquery()

        combined_query = (
            select(
                Test.id.label("test_id"),
                TestAttempt.id.label("test_attempt_id"),
                TestAttempt.submitted_date.label("date"),
                Test.questions_count.label("tq_count"),
                Test.max_marks.label("test_total_marks"),
                TestAttempt.correct.label("correct"),
                TestAttempt.incorrect.label("incorrect"),
                TestAttempt.score.label("marks_acquired"),
                # func.sum(case((self.model.is_correct_attempt == True, 1), else_=0)).label("correct"),
                # func.sum(case((self.model.is_correct_attempt == False, 1), else_=0)).label("incorrect"),
                # func.sum(self.model.marks_obtained).label("marks_acquired"),
                query.c.Feedback
            )
            .select_from(TestAttempt)
            .join(Test, Test.id == TestAttempt.test_id)
            # .join(TestAttempt, TestAttempt.test_id == self.model.test_id)
            .join(query,query.c.id == TestAttempt.id )
            .where(
                TestAttempt.attempted_by_id == user_id,
                TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                Test.stage.op("->>")("name").ilike("%Mains%")
            )
            .group_by(Test.id, TestAttempt.submitted_date, TestAttempt.id, Test.questions_count, Test.max_marks,TestAttempt.correct,TestAttempt.incorrect,TestAttempt.score ,query.c.Feedback)
        )

        result = await session.execute(combined_query)
        response = result.mappings().all()  # returns list of dict-like rows
        return response



    async def get_used_q_count_by_subj_ids(
        self,
        paper_id: int,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        subjects_subquery = select(
            func.unnest(Question.subjects).cast(JSON).label("subject"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tq = aliased(TestQuestion)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subject->>'id')").label("subject_id"),
                (tq.question_id).label("q_id"),
            )
            .select_from(tq)
            .join(q, q.id == tq.question_id)
            .join(Test, Test.id == tq.test_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    tq.question_id == q.id,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                ),
            )
            .distinct(tq.question_id)
            .group_by("subject_id", tq.question_id)
            .subquery()
        )
        query = (
            select(
                subquery.c.subject_id,
                func.count(subquery.c.q_id).label("used_questions"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_id)
        )
        result = await session.execute(query)
        scores = result.all()
        return scores

    async def get_used_q_count_by_subj(
        self,
        paper_id: int,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tq = aliased(TestQuestion)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                (tq.question_id).label("q_id"),
            )
            .select_from(tq)
            .join(q, q.id == tq.question_id)
            .join(TestAttempt, TestAttempt.test_id == tq.test_id)
            .join(Test, Test.id == tq.test_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
            .where(
                and_( 
                    TestAttempt.attempted_by_id == user_id,
                    tq.question_id == q.id,
                    (cast(Test.paper.op("->>")("id"), Integer) == paper_id),
                ),
            )
            .distinct(tq.question_id)
            .group_by("subject_name", tq.question_id)
            .subquery()
        )
        query = (
            select(
                subquery.c.subject_name,
                func.count(subquery.c.q_id).label("used_questions"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )
        result = await session.execute(query)
        scores = result.all()
        return scores

    async def get_used_q_count_by_subj_for_papers(
        self,
        paper_ids: list[int],
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tq = aliased(TestQuestion)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                (tq.question_id).label("q_id"),
            )
            .select_from(tq)
            .join(q, q.id == tq.question_id)
            .join(TestAttempt, TestAttempt.test_id == tq.test_id)
            .join(Test, Test.id == tq.test_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
            .where(
                and_( 
                    TestAttempt.attempted_by_id == user_id,
                    tq.question_id == q.id,
                    (cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids)),
                ),
            )
            .distinct(tq.question_id)
            .group_by("subject_name", tq.question_id)
            .subquery()
        )
        query = (
            select(
                subquery.c.subject_name,
                func.count(subquery.c.q_id).label("used_questions"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )
        result = await session.execute(query)
        scores = result.all()
        return scores


    async def get_used_q_count_by_subj_stages_filter(
        self,
        stage_ids: list[int],
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        subjects_subquery = select(
            (Question.subject).label("subj"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tq = aliased(TestQuestion)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(subj->>'name')").label("subject_name"),
                (tq.question_id).label("q_id"),
            )
            .select_from(tq)
            .join(q, q.id == tq.question_id)
            .join(TestAttempt, TestAttempt.test_id == tq.test_id)
            .join(Test, Test.id == tq.test_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == tq.question_id)
            .where(
                and_( 
                    TestAttempt.attempted_by_id == user_id,
                    tq.question_id == q.id,
                    (cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids)),
                ),
            )
            .distinct(tq.question_id)
            .group_by("subject_name", tq.question_id)
            .subquery()
        )
        query = (
            select(
                subquery.c.subject_name,
                func.count(subquery.c.q_id).label("used_questions"),
            )
            .select_from(subquery)
            .group_by(subquery.c.subject_name)
        )
        result = await session.execute(query)
        scores = result.all()
        return scores

    async def get_used_q_count_by_topics(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ):
        session = db_session 
        topics_subquery = select(
            func.unnest(Question.topics).cast(JSON).label("topic"),
            Question.id.label("question_id"),
        ).subquery()
        # Define aliases for the tables
        tq = aliased(TestQuestion)
        q = aliased(Question)

        subquery = (
            select(
                literal_column("(topic->>'id')").label("topic_id"),
                (tq.question_id).label("q_id"),
            )
            .select_from(tq)
            .join(q, q.id == tq.question_id)
            .join(Test, Test.id == tq.test_id)
            .join(topics_subquery, topics_subquery.c.question_id == tq.question_id)
            .where(
                and_(
                    self.model.attempted_by_id == user_id,
                    tq.question_id == q.id,
                ),
            )
            .group_by("topic_id", tq.question_id)
            .subquery()
        )
        query = (
            select(
                subquery.c.topic_id,
                func.count(subquery.c.q_id).label("used_questions"),
            )
            .select_from(subquery)
            .group_by(subquery.c.topic_id)
        )
        result = await session.execute(query)
        scores = result.all()
        return scores

class TestEvaluationService(BaseService[TestEvaluation,TestEvaluationCreate,TestEvaluationUpdate]):
    async def get_attempts_by_status(self,status:TEST_ASSESSMENT_STATUS,evaluator_id:int| None = None,reviewer_id:int | None = None,is_reevaluation:bool | None = None,db_session: AsyncSession | None = None,
    ):
        session = db_session 
        query = (select(TestAttempt,TestEvaluation).select_from(TestAttempt)
                 .outerjoin(TestEvaluation,TestEvaluation.test_attempt_id == TestAttempt.id)
                 .where(TestEvaluation.status == status,
                        TestEvaluation.evaluator_id == evaluator_id if evaluator_id else True,
                        TestEvaluation.reviewer_id == reviewer_id if reviewer_id else None,
                        TestAttempt.re_evaluation_requested == is_reevaluation if is_reevaluation else None))
        result = await session.execute(query)
        attempts = result.all()
        return attempts
    
    async def get_mains_test_status_counts(self,db_session: AsyncSession | None = None):
        session = db_session 
    
        session = db_session

        LatestTestEvaluation = aliased(TestEvaluation)

        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")
            )
            # .where(LatestTestEvaluation.evaluator_id == evaluator_id)
            .group_by(LatestTestEvaluation.test_attempt_id)
            .subquery()
        )

        query = (
        select(
            func.count(TestAttempt.id).filter(
                or_(
                    TestAttempt.status == TEST_ATTEMPT_STATUS.submitted,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            ).label("submitted_tests"),
            func.count(TestAttempt.id).filter(
                    TestAttempt.test_evaluation_status == TEST_ASSESSMENT_STATUS.unassigned,
                    # TestAttempt.re_evaluation_requested == False
            ).label("unassigned_tests"), # gives unassigned of both re_evaluation_requested and not re_evaluation_requested

            func.count(TestEvaluation.id).filter(
                TestEvaluation.status == TEST_ASSESSMENT_STATUS.in_progress
            ).label("inprogress_tests"),

            func.count(TestEvaluation.id).filter(
                or_(TestEvaluation.status == TEST_ASSESSMENT_STATUS.evaluated,
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.accepted,
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.rejected)
            ).label("evaluated_tests"),
            func.count(TestEvaluation.id).filter(
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.accepted
                ).label("accepted_tests"),

            func.count(TestEvaluation.id).filter(
                TestEvaluation.status == TEST_ASSESSMENT_STATUS.rejected
            ).label("rejected")
        )
        .select_from(TestAttempt)
        .join(Test, Test.id == TestAttempt.test_id)
        # .outerjoin(TestEvaluation,TestAttempt.id == TestEvaluation.test_attempt_id)
        # .outerjoin(latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
        .outerjoin(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
        .outerjoin(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
        .where(
               TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    Test.stage.op("->>")("name").ilike("%Mains%"))
          # Restrict to latest evaluation per test_attempt
        )
        # if is_reevaluation:
        #     query = query.where(and_(TestAttempt.re_evaluation_requested == True, TestAttempt.test_evaluation_status == TEST_ASSESSMENT_STATUS.unassigned))

        result = await session.execute(query)
        return result.mappings().first()

    async def get_tests_for_evaluator_and_reviewer(self,status: str | None = None, evaluator_id: int = None, reviewer_id: int = None,db_session: AsyncSession | None = None):
        session = db_session 
        LatestTestEvaluation = aliased(TestEvaluation)

        # Subquery to get the latest evaluation per test_attempt_id for a given evaluator
        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                LatestTestEvaluation.status,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")  # Latest evaluation ID
            )
            .group_by(LatestTestEvaluation.test_attempt_id, LatestTestEvaluation.status)
            .subquery()
        )

        # Base query with joins
        query = (
            select(
                TestAttempt.id.label("test_attempt_id"),
                Test.id.label("test_id"),
                Test.title.label("test_title"),
                Test.subjects.label("subjects"),
                Test.paper.label("paper"),
                TestAttempt.attempted_by_id.label("student_id"),
                User.full_name.label("evaluator_or_reviewer_name"),
                TestEvaluation.status.label("status"),
                TestEvaluation.assigned_at.label("assigned_date"),
                TestEvaluation.evaluated_at.label("evaluated_date"),
                TestEvaluation.reviewed_at.label("reviewed_date"),
                TestEvaluation.withdrawn_at.label("withdrawn_date"),
                TestEvaluation.is_reevaluation.label("is_reevaluated"),
            )
            .select_from(TestEvaluation)
            .join(latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)  # Join with latest evaluations
            .join(TestAttempt, TestAttempt.id == TestEvaluation.test_attempt_id)
            .join(Test, Test.id == TestAttempt.test_id)
            # .join(User, or_(User.id == TestEvaluation.evaluator_id, User.id == TestEvaluation.reviewer_id))
        )
        if reviewer_id is not None:
            query = query.join(User, User.id == TestEvaluation.reviewer_id)
        elif evaluator_id is not None:
            query = query.join(User, User.id == TestEvaluation.evaluator_id)
        elif evaluator_id is None and reviewer_id is None:
            query = query.join(User, or_(User.id == TestEvaluation.evaluator_id, User.id == TestEvaluation.reviewer_id))


        # Apply filters based on input parameters
        conditions = []
        if evaluator_id is not None:
            conditions.append(TestEvaluation.evaluator_id == evaluator_id)
        if reviewer_id is not None:
            conditions.append(TestEvaluation.reviewer_id == reviewer_id)
        if status is not None:
            conditions.append(TestEvaluation.status == status)

        if conditions:
            query = query.where(and_(*conditions))

        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_test_attempts_by_status(self,status: str,is_reevaluation:bool,
                                            title: str | None = None,
                                            exam_id: int | None = None,
                                            stage_id:int | None = None,
                                            paper_id: int | None = None,
                                            subject_id: int  | None = None,
                                            topic_id: int  | None = None,
                                            q_count:int | None = None,
                                            submitted_date: date | None = None,
                                            assigned_date: date | None = None,
                                            evaluated_date: date | None = None,
                                            reviewed_date: date | None = None,
                                            withdrawn_date: date | None = None,
                                            is_physical_test_attempt: bool | None = None,
                                            offset: int = 0,
                                            limit: int = 10,
                                            db_session: AsyncSession | None = None):
        session = db_session
        LatestTestEvaluation = aliased(TestEvaluation)
        StudentUser = aliased(User)
        EvaluatorUser = aliased(User)
        ReviewerUser = aliased(User)

        # Subquery to get the latest evaluation per test_attempt_id for a given evaluator
        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                # LatestTestEvaluation.status,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")  # Latest evaluation ID
            )
            .group_by(LatestTestEvaluation.test_attempt_id)
            .subquery()
        )
        query = (
            select(
                TestAttempt.id.label("test_attempt_id"),
                TestAttempt.is_physical_test_attempt.label("is_physical_test_attempt"),
                TestEvaluation.id.label("test_eval_id"),
                Test.id.label("test_id"),
                Test.title.label("test_title"),
                Test.subjects.label("subjects"),
                Test.paper.label("paper"),
                Test.questions_count.label("test_qs_count"),
                Test.max_marks.label("test_tot_marks"),
                TestAttempt.score.label("test_attempt_score"),
                TestAttempt.attempted_by_id.label("student_id"),
                EvaluatorUser.full_name.label("evaluator_name"),
                StudentUser.full_name.label("student_name"),
                ReviewerUser.full_name.label("reviwer_name"),
                EvaluatorUser.photo.label("evaluator_photo"),
                StudentUser.photo.label("student_photo"),
                ReviewerUser.photo.label("reviwer_photo"),
                TestEvaluation.status.label("status"),
                TestEvaluation.evaluator_id.label("evaluation_id"),
                TestEvaluation.reviewer_id.label("reviewer_id"),
                TestAttempt.submitted_date.label("submitted_date"),
                TestEvaluation.assigned_at.label("assigned_date"),
                TestEvaluation.evaluated_at.label("evaluated_date"),
                TestEvaluation.reviewed_at.label("reviewed_date"),
                TestEvaluation.withdrawn_at.label("withdrawn_date"),
                TestEvaluation.is_reevaluation.label("is_reevaluated")
            )
            .select_from(TestAttempt)
            .join(Test, Test.id == TestAttempt.test_id)
            .join(StudentUser, StudentUser.id == TestAttempt.attempted_by_id)
            .outerjoin(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
            .outerjoin(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
            .outerjoin(EvaluatorUser, EvaluatorUser.id == TestEvaluation.evaluator_id)
            .outerjoin(ReviewerUser, ReviewerUser.id == TestEvaluation.reviewer_id)
            .where(TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    Test.stage.op("->>")("name").ilike("%Mains%"))
            .order_by(TestAttempt.id)
            # .join(User, or_(User.id == TestEvaluation.evaluator_id, User.id == TestEvaluation.reviewer_id))
        )
        if status == TEST_ASSESSMENT_STATUS.unassigned:
            # query = query.where(and_(TestEvaluation.id.is_(None),TestAttempt.re_evaluation_requested == False,TestAttempt.test_evaluation_status != None))  # Unassigned test attempts
            query = query.where(TestAttempt.re_evaluation_requested == False, or_(
                        # TestAttempt.test_evaluation_status != None,
                        TestAttempt.test_evaluation_status == TEST_ASSESSMENT_STATUS.unassigned
                    ) )
        elif is_reevaluation:
            query = query.where(and_(TestAttempt.re_evaluation_requested == True, TestAttempt.test_evaluation_status == TEST_ASSESSMENT_STATUS.unassigned))
        else:
            query = query.where(TestEvaluation.status == status)

        filters = []

        if title:
            filters.append(Test.title == title)

        if exam_id:
            filters.append(Test.exam.op("->>")("id").cast(Integer) == exam_id)

        if stage_id:
            filters.append(Test.stage.op("->>")("id").cast(Integer) == stage_id)

        if paper_id:
            filters.append(Test.paper.op("->>")("id").cast(Integer) == paper_id)

        if q_count:
            filters.append(Test.questions_count == q_count)

        if submitted_date:
            filters.append(func.date(TestAttempt.submitted_date) == submitted_date)

        if assigned_date:
            filters.append(func.date(TestEvaluation.assigned_at) == assigned_date)

        if evaluated_date:
            filters.append(func.date(TestEvaluation.evaluated_at) == evaluated_date)

        if reviewed_date:
            filters.append(func.date(TestEvaluation.reviewed_at) == reviewed_date)

        if withdrawn_date:
            filters.append(func.date(TestEvaluation.withdrawn_at) == withdrawn_date)

        if is_physical_test_attempt:
            filters.append(TestAttempt.is_physical_test_attempt == is_physical_test_attempt)

        # **Subject filter using `unnest()`**
        if subject_id is not None:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_id is not None:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            filters.append(func.exists(topic_subquery))

        if filters:
            query = query.where(and_(*filters))
        query = query.limit(limit).offset(offset)
        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_evaluator_evaluations_by_status(self,evaluator_id:int,
                                                    status: str,
                                                    title: str | None = None,
                                                    exam_id: int | None = None,
                                                    stage_id:int | None = None,
                                                    paper_id: int | None = None,
                                                    subject_id: int  | None = None,
                                                    topic_id: int  | None = None,
                                                    q_count:int | None = None,
                                                    submitted_date: date | None = None,
                                                    assigned_date: date | None = None,
                                                    evaluated_date: date | None = None,
                                                    reviewed_date: date | None = None,
                                                    withdrawn_date: date | None = None,
                                                    is_physical_test_attempt: bool | None = None,
                                                    offset: int = 0,
                                                    limit: int = 10,
                                                  db_session: AsyncSession | None = None):
        session = db_session
        LatestTestEvaluation = aliased(TestEvaluation)
        StudentUser = aliased(User)
        EvaluatorUser = aliased(User)
        ReviewerUser = aliased(User)

        # Subquery to get the latest evaluation per test_attempt_id for a given evaluator
    
        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")
            )
            .where(LatestTestEvaluation.evaluator_id == evaluator_id)
            .group_by(LatestTestEvaluation.test_attempt_id)
            .subquery()
        )
        query = (
            select(
                TestAttempt.id.label("test_attempt_id"),
                TestAttempt.is_physical_test_attempt.label("is_physical_test_attempt"),
                TestEvaluation.id.label("test_eval_id"),
                Test.id.label("test_id"),
                Test.title.label("test_title"),
                Test.subjects.label("subjects"),
                Test.paper.label("paper"),
                Test.questions_count.label("test_qs_count"),
                Test.max_marks.label("test_tot_marks"),
                TestAttempt.score.label("test_attempt_score"),
                TestAttempt.attempted_by_id.label("student_id"),
                EvaluatorUser.full_name.label("evaluator_name"),
                StudentUser.full_name.label("student_name"),
                ReviewerUser.full_name.label("reviwer_name"),
                EvaluatorUser.photo.label("evaluator_photo"),
                StudentUser.photo.label("student_photo"),
                ReviewerUser.photo.label("reviwer_photo"),
                TestEvaluation.evaluator_id.label("evaluation_id"),
                TestEvaluation.reviewer_id.label("reviewer_id"),
                TestEvaluation.status.label("status"),
                TestAttempt.submitted_date.label("submitted_date"),
                TestEvaluation.assigned_at.label("assigned_date"),
                TestEvaluation.evaluated_at.label("evaluated_date"),
                TestEvaluation.reviewed_at.label("reviewed_date"),
                TestEvaluation.withdrawn_at.label("withdrawn_date"),
                TestEvaluation.is_reevaluation.label("is_reevaluated"),
            )
            .select_from(TestAttempt)
            .join(Test, Test.id == TestAttempt.test_id)
            .join(StudentUser, StudentUser.id == TestAttempt.attempted_by_id)
            .join(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
            .join(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
            # .join(
            #     TestEvaluation, TestAttempt.id == TestEvaluation.test_attempt_id
            # )  # Left join to include unassigned attempts
            # .join(
            #     latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id
            # )  # Join latest evaluation subquery (if applicable)
            .outerjoin(EvaluatorUser, EvaluatorUser.id == TestEvaluation.evaluator_id)
            .outerjoin(ReviewerUser, ReviewerUser.id == TestEvaluation.reviewer_id)
            .where(and_(TestEvaluation.status == status,TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    Test.stage.op("->>")("name").ilike("%Mains%"))
            # .join(User, or_(User.id == TestEvaluation.evaluator_id, User.id == TestEvaluation.reviewer_id))
        ))
        if is_physical_test_attempt:
            query = query.where(TestAttempt.is_physical_test_attempt == is_physical_test_attempt)
        filters = []

        if title:
            filters.append(Test.title == title)

        if exam_id:
            filters.append(Test.exam.op("->>")("id").cast(Integer) == exam_id)

        if stage_id:
            filters.append(Test.stage.op("->>")("id").cast(Integer) == stage_id)

        if paper_id:
            filters.append(Test.paper.op("->>")("id").cast(Integer) == paper_id)

        if q_count:
            filters.append(Test.questions_count == q_count)

        if submitted_date:
            filters.append(func.date(TestAttempt.submitted_date) == submitted_date)

        if assigned_date:
            filters.append(func.date(TestEvaluation.assigned_at) == assigned_date)

        if evaluated_date:
            filters.append(func.date(TestEvaluation.evaluated_at) == evaluated_date)

        if reviewed_date:
            filters.append(func.date(TestEvaluation.reviewed_at) == reviewed_date)

        if withdrawn_date:
            filters.append(func.date(TestEvaluation.withdrawn_at) == withdrawn_date)

        # **Subject filter using `unnest()`**
        if subject_id is not None:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_id is not None:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            filters.append(func.exists(topic_subquery))

        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(TestAttempt.id).limit(limit).offset(offset)
        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_reviewer_reviews_by_status(self,reviewer_id:int,
                                                is_reevaluation:bool,
                                                status:str,
                                                title: str | None = None,
                                                exam_id: int | None = None,
                                                stage_id:int | None = None,
                                                paper_id: int | None = None,
                                                subject_id: int  | None = None,
                                                topic_id: int  | None = None,
                                                q_count:int | None = None,
                                                submitted_date: date | None = None,
                                                assigned_date: date | None = None,
                                                evaluated_date: date | None = None,
                                                reviewed_date: date | None = None,
                                                withdrawn_date: date | None = None,
                                                is_physical_test_attempt: bool | None = None,
                                                offset: int = 0,
                                                limit: int = 10,
                                              db_session: AsyncSession | None = None):
        session = db_session
        LatestTestEvaluation = aliased(TestEvaluation)
        StudentUser = aliased(User)
        EvaluatorUser = aliased(User)
        ReviewerUser = aliased(User)

        # Subquery to get the latest evaluation per test_attempt_id for a given evaluator
        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                # LatestTestEvaluation.status,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")  # Latest evaluation ID
            ).where(LatestTestEvaluation.reviewer_id == reviewer_id)
            .group_by(LatestTestEvaluation.test_attempt_id)
            .subquery()
        )
        query = (
            select(
                TestAttempt.id.label("test_attempt_id"),
                TestAttempt.is_physical_test_attempt.label("is_physical_test_attempt"),
                TestEvaluation.id.label("test_eval_id"),
                Test.id.label("test_id"),
                Test.title.label("test_title"),
                Test.subjects.label("subjects"),
                Test.paper.label("paper"),
                Test.questions_count.label("test_qs_count"),
                Test.max_marks.label("test_tot_marks"),
                TestAttempt.score.label("test_attempt_score"),
                TestAttempt.attempted_by_id.label("student_id"),
                EvaluatorUser.full_name.label("evaluator_name"),
                StudentUser.full_name.label("student_name"),
                ReviewerUser.full_name.label("reviwer_name"),
                EvaluatorUser.photo.label("evaluator_photo"),
                StudentUser.photo.label("student_photo"),
                ReviewerUser.photo.label("reviwer_photo"),
                TestEvaluation.evaluator_id.label("evaluation_id"),
                TestEvaluation.reviewer_id.label("reviewer_id"),
                TestEvaluation.status.label("status"),
                TestAttempt.submitted_date.label("submitted_date"),
                TestEvaluation.assigned_at.label("assigned_date"),
                TestEvaluation.evaluated_at.label("evaluated_date"),
                TestEvaluation.reviewed_at.label("reviewed_date"),
                TestEvaluation.withdrawn_at.label("withdrawn_date"),
                TestEvaluation.is_reevaluation.label("is_reevaluated"),
            )
            .select_from(TestAttempt)
            .join(Test, Test.id == TestAttempt.test_id)
            .join(StudentUser, StudentUser.id == TestAttempt.attempted_by_id)
            # .outerjoin(
            #     TestEvaluation, TestAttempt.id == TestEvaluation.test_attempt_id
            # )  # Left join to include unassigned attempts
            # .outerjoin(
            #     latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id
            # )  # Join latest evaluation subquery (if applicable)
            .join(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
            .join(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
            .outerjoin(EvaluatorUser, EvaluatorUser.id == TestEvaluation.evaluator_id)
            .outerjoin(ReviewerUser, ReviewerUser.id == TestEvaluation.reviewer_id)
            .where(and_(TestEvaluation.status == status,TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    Test.stage.op("->>")("name").ilike("%Mains%"))
            # .join(User, or_(User.id == TestEvaluation.evaluator_id, User.id == TestEvaluation.reviewer_id))
        ))

        if is_reevaluation:
            query = query.where(and_(TestAttempt.re_evaluation_requested == True, TestEvaluation.is_reevaluation == True , TestEvaluation.status == TEST_ASSESSMENT_STATUS.evaluated))
        if is_physical_test_attempt:
            query = query.where(TestAttempt.is_physical_test_attempt == is_physical_test_attempt)
        filters = []

        if title:
            filters.append(Test.title == title)

        if exam_id:
            filters.append(Test.exam.op("->>")("id").cast(Integer) == exam_id)

        if stage_id:
            filters.append(Test.stage.op("->>")("id").cast(Integer) == stage_id)

        if paper_id:
            filters.append(Test.paper.op("->>")("id").cast(Integer) == paper_id)

        if q_count:
            filters.append(Test.questions_count == q_count)

        if submitted_date:
            filters.append(func.date(TestAttempt.submitted_date) == submitted_date)

        if assigned_date:
            filters.append(func.date(TestEvaluation.assigned_at) == assigned_date)

        if evaluated_date:
            filters.append(func.date(TestEvaluation.evaluated_at) == evaluated_date)

        if reviewed_date:
            filters.append(func.date(TestEvaluation.reviewed_at) == reviewed_date)

        if withdrawn_date:
            filters.append(func.date(TestEvaluation.withdrawn_at) == withdrawn_date)

        # **Subject filter using `unnest()`**
        if subject_id is not None:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer) == subject_id)
            )
            filters.append(func.exists(subject_subquery))

        # **Topic filter using `unnest()`**
        if topic_id is not None:
            topic_subquery = (
                select(literal_column("unnested_topic ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("unnested_topic"))
                .where(literal_column("unnested_topic ->> 'id'").cast(Integer) == topic_id)
            )
            filters.append(func.exists(topic_subquery))

        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(TestAttempt.id).limit(limit).offset(offset)
        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_evaluators_with_stats(self,db_session: AsyncSession | None = None):
        session = db_session 
    
        query = (
            select(
                User.id.label("evaluator_id"),
                User.full_name.label("evaluator_name"),
                User.phone_number.label("phone_number"),
                User.photo.label("user_photo"),
                User.is_external.label("is_external"),
                func.count(TestEvaluation.id).label("total_allocated_evaluation"),
                func.count(
                    
                        and_(TestEvaluation.status == "evaluated", func.date(
                            func.timezone("Asia/Kolkata", TestEvaluation.evaluated_at)
                        ) >= (datetime.now(pytz.timezone("Asia/Kolkata")).date() - timedelta(days=7))
                ).label("completed_evaluations_last_week")
            ))
            .outerjoin(TestEvaluation, TestEvaluation.evaluator_id == User.id)
            .where(User.roles.contains([USER_ROLE.evaluation_evaluator]))  # User must have "evaluator" role
            .group_by(User.id, User.full_name, User.phone_number,User.photo,User.is_external)
        )

        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_reviewer_with_stats(self,db_session: AsyncSession | None = None):
        session = db_session 
    
        query = (
            select(
                User.id.label("evaluator_id"),
                User.full_name.label("evaluator_name"),
                User.phone_number.label("phone_number"),
                User.photo.label("user_photo"),
                User.is_external.label("is_external"),
                func.count(TestEvaluation.id).label("total_allocated_review"),
                func.count(
                   
                        and_(TestEvaluation.status == "evaluated", func.date(
                            func.timezone("Asia/Kolkata", TestEvaluation.evaluated_at)
                        ) >= (datetime.now(pytz.timezone("Asia/Kolkata")).date() - timedelta(days=7)) 
                    
                ).label("completed_review_last_week")
            ))
            .outerjoin(TestEvaluation, TestEvaluation.reviewer_id == User.id)
            .where(User.roles.contains([USER_ROLE.evaluation_reviewer]))  # User must have "evaluator" role
            .group_by(User.id, User.full_name, User.phone_number,User.photo,User.is_external)
        )

        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_evaluator_evaluations_count(self,evaluator_id:int, db_session: AsyncSession | None = None):
        session = db_session

        LatestTestEvaluation = aliased(TestEvaluation)

        latest_eval_subquery = (
            select(
                LatestTestEvaluation.test_attempt_id,
                func.max(LatestTestEvaluation.id).label("latest_eval_id")
            )
            .where(LatestTestEvaluation.evaluator_id == evaluator_id)
            .group_by(LatestTestEvaluation.test_attempt_id)
            .subquery()
        )

        query = (
        select(
            func.count(TestAttempt.id).filter(
                or_(
                    TestAttempt.status == TEST_ATTEMPT_STATUS.submitted,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            ).label("submitted_tests"),

            func.count(TestEvaluation.id).filter(
                TestEvaluation.status == TEST_ASSESSMENT_STATUS.in_progress
            ).label("inprogress_tests"),
            func.count(TestEvaluation.id).filter(
                or_(TestEvaluation.status == TEST_ASSESSMENT_STATUS.evaluated,
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.accepted,
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.rejected)
            ).label("evaluated_tests")
        )
        .select_from(TestAttempt)
        # .join(TestAttempt,TestAttempt.id == TestEvaluation.test_attempt_id)
        .join(Test, Test.id == TestAttempt.test_id)
        # .join(latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
        .join(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
        .join(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
        .where(TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                    Test.stage.op("->>")("name").ilike("%Mains%"))  # Restrict to latest evaluation per test_attempt
    )
        result = await session.execute(query)
        return result.mappings().first()

    async def get_reviewer_review_count(self,reviewer_id:int, db_session: AsyncSession | None = None):
            session = db_session

            LatestTestEvaluation = aliased(TestEvaluation)

            latest_eval_subquery = (
                select(
                    LatestTestEvaluation.test_attempt_id,
                    func.max(LatestTestEvaluation.id).label("latest_eval_id")
                )
                .where(LatestTestEvaluation.reviewer_id == reviewer_id)
                .group_by(LatestTestEvaluation.test_attempt_id)
                .subquery()
            )
            

            query = (
            select(
                func.count(TestAttempt.id).filter(
                    or_(
                        TestAttempt.status == TEST_ATTEMPT_STATUS.submitted,
                        TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                    )
                ).label("submitted_tests"),

                func.count(TestEvaluation.id).filter(
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.accepted
                ).label("accepted_tests"),

                func.count(TestEvaluation.id).filter(
                    TestEvaluation.status == TEST_ASSESSMENT_STATUS.rejected
                ).label("rejected_tests"),

                func.count(TestEvaluation.id).filter(
                    or_(TestEvaluation.status == TEST_ASSESSMENT_STATUS.evaluated,
                        TestEvaluation.status == TEST_ASSESSMENT_STATUS.accepted,
                        TestEvaluation.status == TEST_ASSESSMENT_STATUS.rejected)
                ).label("evaluated_tests")
            )
            # .select_from(TestEvaluation)
            #  .join(TestAttempt,TestAttempt.id == TestEvaluation.test_attempt_id)
            # .join(latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)  # Restrict to latest evaluation per test_attempt
        
            .select_from(TestAttempt)
            # .join(TestAttempt,TestAttempt.id == TestEvaluation.test_attempt_id)
            .join(Test, Test.id == TestAttempt.test_id)
            # .join(latest_eval_subquery, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
            .join(latest_eval_subquery, TestAttempt.id == latest_eval_subquery.c.test_attempt_id)
            .join(TestEvaluation, TestEvaluation.id == latest_eval_subquery.c.latest_eval_id)
            .where(TestAttempt.test_attempt_mode == TEST_ATTEMPT_MODE.exam,
                        Test.stage.op("->>")("name").ilike("%Mains%")) 
            )
            result = await session.execute(query)
            return result.mappings().first()

    async def get_testattempt_evaluations(self,test_attempt_id:int,is_physical_test_attempt: bool | None = None, db_session: AsyncSession | None = None):
        session = db_session
        query = (select(TestAttempt.id.label("test_attempt_id"),
                        TestAttempt.is_physical_test_attempt.label("is_physical_test_attempt"),
                        TestAttempt.test_id,
                        TestAttempt.attempted_by_id,
                        TestAttempt.test_attempt_mode,
                        TestAttempt.record_elimination,
                        TestAttempt.with_omr_sheet,
                        TestAttempt.status.label("test_attempt_status"),
                        TestAttempt.score,
                        TestAttempt.macro_comment,
                        TestAttempt.answer_upload_url,
                        TestAttempt.evaluation_upload_url,
                        TestAttempt.re_evaluation_upload_url,
                        TestAttempt.re_evaluation_requested,
                        TestAttempt.re_evaluation_reason,
                        TestAttempt.re_evaluation_request_date,
                        TestAttempt.time_elapsed,
                        TestAttempt.correct,
                        TestAttempt.incorrect,
                        TestAttempt.unattempted,
                        TestAttempt.submitted_date,
                        TestAttempt.test_evaluation_status,
                        TestAttempt.in_app_answering,
                        # TestAttempt.is_physical_test_attempt,
                        func.json_agg(
                        func.json_build_object(
                            "evaluation_id", TestEvaluation.id,
                            "evaluator_id", TestEvaluation.evaluator_id,
                            "reviewer_id", TestEvaluation.reviewer_id,
                            "is_reevaluation", TestEvaluation.is_reevaluation,
                            "score", TestEvaluation.score,
                            "evaluated_questions", TestEvaluation.evaluated_questions,
                            "evaluation_annotation" , TestEvaluation.evaluation_annotation,
                            "re_evaluation_annotation" ,TestEvaluation.re_evaluation_annotation,
                            "status", TestEvaluation.status,
                            "assigned_at", TestEvaluation.assigned_at,
                            "evaluated_at", TestEvaluation.evaluated_at,
                            "reviewed_at", TestEvaluation.reviewed_at,
                            "withdrawn_at", TestEvaluation.withdrawn_at,
                            "comments", TestEvaluation.comments
                    )).label("evaluations"))
                
                 .select_from(TestAttempt).outerjoin(TestEvaluation,TestEvaluation.test_attempt_id == TestAttempt.id)
                 .where(TestAttempt.id == test_attempt_id).group_by(TestAttempt.id))
        if is_physical_test_attempt:
            query = query.where(TestAttempt.is_physical_test_attempt == is_physical_test_attempt)
        results = await session.execute(query)
        return results.mappings().all()

class TestShareService(BaseService[TestShare, TestAttemptCreate, TestAttemptUpdate]):
    pass


class QuestionFavoriteService(
    BaseService[QuestionFavorite, QuestionFavoriteCreate, QuestionFavoriteUpdate]
):
    async def get_fav_q(
        self,
        user_id: int,
        q_id: int,
        db_session: AsyncSession | None = None,
    ) -> QuestionFavorite:
        session = db_session 
        query = select(self.model).where(
            self.model.marked_by_id == user_id,
            self.model.question_id == q_id,
        )
        fav_question = await session.execute(query)

        return fav_question.scalar_one_or_none()

    async def get_all_fav_qs(
        self,
        user_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 

        prelims_query = (
            select(Question)
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                or_(Question.question_type == "MCQ", Question.question_type == "CQ"),
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
            )
            .order_by(QuestionFavorite.id)
        )
        result = await session.execute(prelims_query)
        prelims_questions = result.scalars().all()

        mains_query = (
            select(Question)
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                Question.question_type == "SQ",
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
            )
            .order_by(QuestionFavorite.id)
        )
        result = await session.execute(mains_query)
        mains_questions = result.scalars().all()

        return {"prelims": prelims_questions, "mains": mains_questions}

    async def get_fav_qs_count_by_filter(
        self,
        user_id: int,
        paper_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select(func.count(distinct(QuestionFavorite.question_id)).label("q_count"))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                if subject_ids
                else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
        )
        result = await session.execute(query)
        resp = result.scalar_one_or_none()
        print("Resp>>>>>", resp)
        return resp

    async def get_ca_fav_qs_count(
        self,
        user_id: int,
        paper_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select(func.count(distinct(QuestionFavorite.question_id)).label("q_count"))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                Question.is_current_affairs == True,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
        )
        result = await session.execute(query)
        resp = result.scalar_one_or_none()
        print("Resp>>>>>", resp)
        return resp

    async def get_fav_qs_by_paper(
        self,
        user_id: int,
        paper_id: int,
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select((Question))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                or_(Question.question_type == "MCQ", Question.question_type == "CQ"),
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),

            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        result = await session.execute(query)
        resp = result.scalars().all()
        print("Resp>>>>>", resp, len(resp))
        return resp

    async def get_fav_qs_by_filter(
        self,
        user_id: int,
        paper_id: int,
        subject_codes: str | None = [],
        topic_codes: str | None = [],
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select((Question))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                cast(Question.subject.op("->>")("code"), String).in_(subject_codes)
                if subject_codes
                else True,
                cast(Question.topic.op("->>")("code"), String).in_(topic_codes)
                if topic_codes
                else True,
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        result = await session.execute(query)
        resp = result.scalars().all()
        
        return resp

    async def get_ca_fav_qs(
        self,
        user_id: int,
        paper_id: int,
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select((Question))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                (cast(Question.paper.op("->>")("id"), Integer) == paper_id),
                Question.is_current_affairs == True,
                cast(Question.current_affairs_topic.op("->>")("id"), Integer).in_(
                    topic_ids
                )
                if topic_ids
                else True,
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        result = await session.execute(query)
        resp = result.scalars().all()
        
        return resp

    async def get_fav_mains_qs_by_filter(
        self,
        paper_ids: list[int],
        user_id: int,
        subject_ids: list[int] | None = [],
        topic_ids: list[int] | None = [],
        db_session: AsyncSession | None = None,
    ) -> list[QuestionFavorite]:
        session = db_session 
        query = (
            select((Question))
            .select_from(QuestionFavorite)
            .join(
                Question,
                Question.id == self.model.question_id,
            )
            .where(
                self.model.marked_by_id == user_id,
                self.model.is_favorite == True,
                (cast(Question.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True),
                cast(Question.subject.op("->>")("id"), Integer).in_(subject_ids)
                    if subject_ids
                    else True,
                cast(Question.topic.op("->>")("id"), Integer).in_(topic_ids)
                if topic_ids
                else True,
            )
            .distinct(Question.id)
            .order_by(Question.id)
        )
        result = await session.execute(query)
        resp = result.scalars().all()
        
        return resp

   
    # async def get_tq_fav(
    #     self,
    #     test_attempt_id: int,
    #     question_id: int,
    #     db_session: AsyncSession | None = None,
    # ) -> TestQuestionAttempt:
    #     session = db_session 
    #     query = select(self.model).where(
    #         self.model.test_attempt_id == test_attempt_id,
    #         self.model.question_id == question_id,
    #         self.model.is_starred != None,
    #     )
    #     test_question = await session.execute(query)

    #     return test_question.scalar_one_or_none()

    # async def get_fav_qs(
    #     self,
    #     user_id: int,
    #     tenant_id: int,
    #     db_session: AsyncSession | None = None,
    # ) -> list[TestQuestionAttempt]:
    #     session = db_session 
    #     query = (
    #         select(
    #             Question,
    #             (
    #                 case(
    #                     (
    #                         Question.question_type
    #                         == (QUESTION_TYPE.mcq or QUESTION_TYPE.cq),
    #                         "prelims",
    #                     ),
    #                     else_="mains",
    #                 )
    #             ).label("stage_name"),
    #         )
    #         .select_from(TestQuestionAttempt)
    #         .join(Question, Question.id == self.model.question_id)
    #         .where(
    #             self.model.attempted_by_id == user_id,
    #             self.model.is_starred != None,
    #             Question.tenant_id == tenant_id,
    #         )
    #         .group_by("stage_name")
    #     )
    #     fav_qs = await session.execute(query)

    #     return fav_qs.scalars().all()

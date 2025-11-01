from src.base.service import BaseService
from src.modules.products.models import Batch, Enrollment, Offering,Purchase, Product
from src.modules.questions.models import Question
from src.modules.tests.models import Test, TestAttempt, TestQuestion, TestQuestionAttempt
from src.tenants.models import Branch
from src.users.models import BranchUser, User
from .models import *
from .schemas import *
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    Float, literal, select,DECIMAL,
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
    distinct,true
)
from datetime import timedelta, timezone
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import aliased
from statistics import median
from collections import Counter, defaultdict



class StudyPlanService(BaseService[StudyPlan, StudyPlanCreate, StudyPlanUpdate]):
    async def get_plantasks_by_date( self,studyplan_id: int,from_date: date | None = None,till_date: date  | None = None, db_session: AsyncSession | None = None
    ) :
        session = db_session 

        sub_query = (select(func.coalesce(func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0).label("open_tasks"),
                            func.coalesce(func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0).label("closed_tasks"),
                           PlanTaskUser.plantask_id.label("plantask_id"))
                           .select_from(PlanTaskUser)
                           .where(PlanTaskUser.studyplan_id == studyplan_id if studyplan_id else True)
                            .group_by(PlanTaskUser.plantask_id)
                            .subquery())
        users_subq = (
        select(
            PlanTaskUser.plantask_id.label("plantask_id"),
            func.jsonb_agg(
                func.jsonb_build_object(
                    "id", PlanTaskUser.id,
                    "student_id", PlanTaskUser.student_id,
                    "plantask_id", PlanTaskUser.plantask_id ,
                    "status", PlanTaskUser.status,
                     "is_deleted", PlanTaskUser.is_deleted,
                    "teacher_remarks", PlanTaskUser.teacher_remarks,
                    "student_remarks", PlanTaskUser.student_remarks,
                    "purchase_id", PlanTaskUser.purchase_id,
                    "studyplan_id", PlanTaskUser.studyplan_id
                )
            ).filter(PlanTaskUser.id.isnot(None)).label("plantaskusers")
        )
        .where(PlanTaskUser.studyplan_id == studyplan_id)
        .group_by(PlanTaskUser.plantask_id)
        .subquery()
    )

        query = (
            select(PlanTask,func.coalesce(sub_query.c.open_tasks, 0).label("open_tasks"), func.coalesce(sub_query.c.closed_tasks, 0).label("closed_tasks"),
                   func.coalesce(users_subq.c.plantaskusers, func.cast("[]", JSONB)).label("plantaskusers"))
            .select_from(PlanTask)
            .outerjoin(sub_query,sub_query.c.plantask_id == PlanTask.id)
            .outerjoin(users_subq, users_subq.c.plantask_id == PlanTask.id)
            .where(PlanTask.studyplan_id == studyplan_id if studyplan_id else True,PlanTask.is_deleted ==False,
                   and_(PlanTask.planned_completion_date >= from_date if from_date else True ,
                        PlanTask.planned_completion_date <= till_date if till_date else True))
        )

        tasks = await session.execute(query)
        resp = tasks.all()
        return resp
    
    async def get_plantasks_and_plantasksusers(self,studyplan_id: int, db_session: AsyncSession | None = None):
        session = db_session 

        users_subq = (
        select(
            PlanTaskUser.plantask_id.label("plantask_id"),
            func.jsonb_agg(
                func.jsonb_build_object(
                    "id", PlanTaskUser.id,
                    "student_id", PlanTaskUser.student_id,
                    "plantask_id", PlanTaskUser.plantask_id ,
                    "status", PlanTaskUser.status,
                     "is_deleted", PlanTaskUser.is_deleted,
                    "teacher_remarks", PlanTaskUser.teacher_remarks,
                    "student_remarks", PlanTaskUser.student_remarks,
                    "purchase_id", PlanTaskUser.purchase_id,
                    "studyplan_id", PlanTaskUser.studyplan_id
                )
            ).filter(PlanTaskUser.id.isnot(None)).label("plantaskusers")
        )
        .where(PlanTaskUser.studyplan_id == studyplan_id)
        .group_by(PlanTaskUser.plantask_id)
        .subquery()
    )

        query = (
            select(PlanTask,
                   func.coalesce(users_subq.c.plantaskusers, func.cast("[]", JSONB)).label("plantaskusers"))
            .select_from(PlanTask)
            .outerjoin(users_subq, users_subq.c.plantask_id == PlanTask.id)
            .where(PlanTask.studyplan_id == studyplan_id if studyplan_id else True,PlanTask.is_deleted ==False,
                   )
        )

        tasks = await session.execute(query)
        resp = tasks.all()
        return resp
    
        result = (
            select(PlanTask, PlanTaskUser)
            .join(PlanTaskUser, PlanTask.id == PlanTaskUser.plantask_id)
            .where(PlanTask.studyplan_id == studyplan_id)
        )
        rows = await session.execute(result)
        rows = rows.all()
        grouped: dict[int, dict] = {}

        for plan_task, plan_task_user in rows:
            task_id = plan_task.id

            if task_id not in grouped:
                # Convert SQLAlchemy object to dict, clean internal fields
                grouped[task_id] = plan_task.__dict__.copy()
                grouped[task_id].pop('_sa_instance_state', None)
                grouped[task_id]['plantaskuser'] = []

            # Convert PlanTaskUser to dict and append
            user_dict = plan_task_user.__dict__.copy()
            user_dict.pop('_sa_instance_state', None)
            grouped[task_id]['plantaskuser'].append(user_dict)

        return list(grouped.values())
        
    async def get_students_by_plantaskstatus( self,status: str, db_session: AsyncSession | None = None
    ) :
        session = db_session 

        query = (select(User.id,User.full_name,User.phone_number,User.email,User.photo,Branch.name.label("user_branch_name"))
                 .select_from(User)
                 .join(PlanTaskUser, PlanTaskUser.student_id == User.id)
                 .outerjoin(BranchUser, User.id == BranchUser.user_id)
                 .outerjoin(Branch, Branch.id == BranchUser.branch_id)
                 .where(PlanTaskUser.status == status))
        
        students = await session.execute(query)

        resp =  students.all()
        return resp
    
    async def get_purchases_enrollments_for_product(self,product_id:int,db_session:AsyncSession | None = None):
        session = db_session

        query = (select(Purchase.id,Purchase.student_id,Enrollment.id.label("enrollment_id"))
                 .select_from(Purchase)
                 .join(Enrollment,Purchase.student_id == Enrollment.enrolled_user_id)
                 .where(Purchase.product_id == product_id,Enrollment.product_id == product_id))
        purchases = await session.execute(query)

        resp =  purchases.all()
        return resp

    async def get_plantasks_by_prodids(
    self,
    prod_ids: list[int],
    from_date: date | None = None,
    till_date: date | None = None,
    db_session: AsyncSession | None = None,
    ):
        session = db_session

        query = (
            select(
                PlanTask.id,
                PlanTask.name,
                PlanTask.task_seq_id,
                PlanTask.task_type,
                PlanTask.studyplan_id,
                PlanTask.subject_area,
                PlanTask.papers,
                PlanTask.subjects,
                PlanTask.topics,
                PlanTask.test_id,
                PlanTask.study_materials,
                PlanTask.links ,
                PlanTask.reference_materials,
                PlanTask.planned_time,
                PlanTask.planned_completion_date,
                PlanTask.actual_completion_date,
                PlanTask.target_marks,
                PlanTask.status,
                PlanTask.is_deleted,
                StudyPlan.name.label("studyplan_name"),
                Product.id.label("prod_id"),
                Product.name.label("prod_name"),
                Product.code.label("prod_code"),
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "id", PlanTaskUser.id,
                            "user_id", PlanTaskUser.student_id,
                            "plantaskuser_status", PlanTaskUser.status,
                            "student_remarks",PlanTaskUser.student_remarks,
                            "teacher_remarks", PlanTaskUser.teacher_remarks
                        )
                    ).filter(PlanTaskUser.id.isnot(None)),
                    cast("[]", JSONB)
                ).label("task_users"),
                func.coalesce(
                    func.jsonb_build_object(
                    "user_id", User.id,
                    "user_name", User.full_name,
                    "photo", User.photo,
                    "email", User.email,
                    "phone_no", User.phone_number
                 ),
    cast('{}', JSONB)).label("user_details"),
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Product,Product.id == StudyPlan.product_id)
            .outerjoin(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .outerjoin(User, User.id == PlanTaskUser.student_id)
            .where(
                StudyPlan.product_id.in_(prod_ids),
                PlanTask.is_deleted == False,
                *(
                    [PlanTask.planned_completion_date >= from_date]
                    if from_date
                    else []
                ),
                *(
                    [PlanTask.planned_completion_date <= till_date]
                    if till_date
                    else []
                ),
            )
            .group_by(
                PlanTask.id, StudyPlan.id, User.id, Product.id
            )
        )

        tasks = await session.execute(query)
        return tasks.mappings().all()
    
    async def get_user_plantasks_by_purids(
            self,
            # prod_ids: list[int],
            pur_ids:list[int],
            user_id: int,
            from_date: date | None = None,
            till_date: date | None = None,
            db_session: AsyncSession | None = None,
        ):
            session = db_session

            query = (
                select(
                    PlanTask.id,
                    PlanTask.name,
                    PlanTask.task_seq_id,
                    PlanTask.task_type,
                    PlanTask.studyplan_id,
                    PlanTask.subject_area,
                    PlanTask.papers,
                    PlanTask.subjects,
                    PlanTask.topics,
                    PlanTask.test_id,
                    PlanTask.study_materials,
                    PlanTask.links ,
                    PlanTask.reference_materials,
                    PlanTask.planned_time,
                    PlanTask.planned_completion_date,
                    PlanTask.actual_completion_date,
                    PlanTask.target_marks,
                    PlanTask.status,
                    PlanTask.is_deleted,
                    StudyPlan.name.label("studyplan_name"),
                    Product.id.label("prod_id"),
                    Product.name.label("prod_name"),
                    Product.code.label("prod_code"),
                    func.coalesce(
                        func.jsonb_agg(
                            func.jsonb_build_object(
                                "id", PlanTaskUser.id,
                                "user_id", PlanTaskUser.student_id,
                                "plantaskuser_status", PlanTaskUser.status,
                                "plantaskuser_purchase_id", PlanTaskUser.purchase_id,
                                "student_remarks",PlanTaskUser.student_remarks,
                                "teacher_remarks", PlanTaskUser.teacher_remarks

                            )
                        ).filter(PlanTaskUser.id.isnot(None)),
                        cast("[]", JSONB)
                    ).label("task_users"),
                    func.coalesce(
                        func.jsonb_build_object(
                            "user_id", User.id,
                            "user_name", User.full_name,
                            "photo", User.photo,
                            "email", User.email,
                            "phone_no", User.phone_number
                        ),
                        cast('{}', JSONB)
                    ).label("user_details"),
                )
                .select_from(PlanTask)
                .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
                .join(Product,Product.id == StudyPlan.product_id)
                .join(PlanTaskUser, and_(
                    PlanTaskUser.plantask_id == PlanTask.id,
                    PlanTaskUser.student_id == user_id  # Only include tasks assigned to this user
                ))
                .outerjoin(User, User.id == PlanTaskUser.student_id)
                .where(
                    # StudyPlan.product_id.in_(prod_ids),
                    PlanTaskUser.purchase_id.in_(pur_ids), 
                    PlanTask.is_deleted == False,
                    PlanTaskUser.is_deleted == False,
                    *(
                        [PlanTask.planned_completion_date >= from_date]
                        if from_date else []
                    ),
                    *(
                        [PlanTask.planned_completion_date <= till_date]
                        if till_date else []
                    ),
                )
                .group_by(
                    PlanTask.id, StudyPlan.id, User.id,Product.id
                )
            )

            tasks = await session.execute(query)
            return tasks.mappings().all()

    async def get_tests_for_student( self,student_id: int,                                 
                                    offset: int,
                                    limit: int,
                                    exam_id:int,
                                    stage_ids:list[int] = [],
                                    paper_ids: list[int] = [],
                                    subject_ids: list[int] = [],
                                    topic_ids: list[int] = [],
                                    db_session: AsyncSession | None = None,status:str| None = None,  
                                ) :
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
        query = (select(Offering.offering_category,Offering.offering_sub_type,Offering.name.label("offering_name"),Offering.photo.label("offering_photo"),
                        Product.code.label("prod_code"),Product.name.label("prod_name"),Test,PlanTask.id.label("plantask_id"),
                        PlanTask.planned_completion_date.label("task_planned_completion_date"),PlanTask.status.label("task_status"),
                   PlanTaskUser.id.label("plantaskuser_id"),PlanTaskUser.planned_completion_date.label("taskuser_planned_completion_date"),PlanTaskUser.status.label("taskuser_status"),)
                 .select_from(Test)
                 .join(PlanTask, PlanTask.test_id == Test.id)
                 .join(PlanTaskUser, and_(PlanTaskUser.plantask_id == PlanTask.id, PlanTaskUser.student_id == student_id))
                 .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
                 .join(Offering, Offering.id == StudyPlan.offering_id)
                 .join(Product, Product.offering_id == Offering.id)
                 .where(PlanTaskUser.student_id == student_id ,
                        PlanTask.status == status if status else True,
                        cast(Test.exam.op("->>")("id"), Integer).in_([exam_id]) if exam_id else True,
                        cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids) if stage_ids else True,
                        cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                        # (Test.exam.op("->>")("name").ilike("%UPSC%")),
                        # (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")),
                        cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True ))
        if filters:
            query = query.where(and_(*filters))
       
        query = query.limit(limit).offset(offset)
        tests = await session.execute(query)

        resp =  tests.mappings().all()
        return resp
    
    async def get_tests_taken_for_student( self,student_id: int, product_id:int| None = None, db_session: AsyncSession | None = None
    ) :
        session = db_session 

        count = (select(func.count(distinct(TestAttempt.id)).label("attempts_count"))
                        .select_from(Test)
                        .join(TestAttempt, and_(
                            TestAttempt.test_id == Test.id,
                            TestAttempt.attempted_by_id == student_id,
                        ))
                        .join(PlanTask, and_(PlanTask.test_id == Test.id, PlanTask.id == TestAttempt.plantask_id))
                        .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
                        .join(PlanTaskUser, and_(PlanTaskUser.plantask_id == PlanTask.id, PlanTaskUser.studyplan_id == StudyPlan.id))
                        .where(PlanTaskUser.student_id == student_id ,StudyPlan.product_id == product_id if product_id else True )
                        )
        

        # query = (select(Test.id, TestAttempt.id, count_subquery.c.attempts_count.label("attempts_count"))
        #          .select_from(Test)
        #          .join(TestAttempt, and_(
        #              TestAttempt.test_id == Test.id,
        #             TestAttempt.attempted_by_id == student_id,
        #         ))
        #         .join(count_subquery, count_subquery.c.testattempt_id == TestAttempt.id)
        #          .join(PlanTask, PlanTask.test_id == Test.id)
        #          .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
        #          .join(PlanTaskUser, and_(PlanTaskUser.plantask_id == PlanTask.id, PlanTaskUser.studyplan_id == StudyPlan.id))
        #          .where(PlanTaskUser.student_id == student_id ,StudyPlan.product_id == product_id if product_id else True )
        #          .group_by(Test.id,TestAttempt.id, count_subquery.c.attempts_count))
        
        tests = await session.execute(count)

        resp =  tests.mappings().all()
        return resp
    
    async def get_tasks_tests_by_attempt_status( 
        self,
        user_id: int,offset: int, limit:int,
        exam_id:int = [],
        stage_ids:int = [],
        paper_ids: list[int] = [],
        subject_ids:list[int] =[],
        topic_ids:list[int] = [],    
        test_attempt_mode: str | None = None,    
        status: str | None = None,
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
            filters.append(TestAttempt.test_evaluation_status.in_([TEST_ASSESSMENT_STATUS.evaluated, TEST_ASSESSMENT_STATUS.accepted]))
        if test_attempt_mode:
            filters.append(TestAttempt.test_attempt_mode == test_attempt_mode)
        query = (
            select(Offering.offering_category,Offering.offering_sub_type,Offering.name.label("offering_name"),Offering.photo.label("offering_photo"),Product.code.label("prod_code"),
                   Product.name.label("prod_name"),PlanTask.id.label("plantask_id"),PlanTask.planned_completion_date.label("task_planned_completion_date"),PlanTask.status.label("task_status"),
                   PlanTaskUser.id.label("plantaskuser_id"),PlanTaskUser.planned_completion_date.label("taskuser_planned_completion_date"),PlanTaskUser.status.label("taskuser_status"),
                   Test,TestAttempt)
            .select_from(Test)
            .join(TestAttempt, TestAttempt.test_id == Test.id)
            .join(PlanTask, PlanTask.test_id == Test.id)
            # .join(StudyPlan, StudyPlan.id == PlanTask.id)
            .join(PlanTaskUser, and_(PlanTaskUser.plantask_id == PlanTask.id, PlanTaskUser.student_id == user_id))
            .join(Purchase,Purchase.id == PlanTaskUser.purchase_id)
            .join(Product,Product.id == Purchase.product_id)
            .join(Offering,Offering.id == Product.offering_id)
            # .where(PlanTaskUser.student_id == student_id ,StudyPlan.product_id == product_id if product_id else True ))
            .where(
                
                TestAttempt.status == status,
                cast(Test.exam.op("->>")("id"), Integer).in_([exam_id]) if exam_id else True,
                cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids) if stage_ids else True,
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                # (Test.exam.op("->>")("name").ilike("%UPSC%")),
                # (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")),
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                TestAttempt.attempted_by_id == user_id,
            )
        )
        if filters:
            query = query.where(and_(*filters))
       
        query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        return result.mappings().all()

    async def get_student_new_tasks_tests(
        self,
        user_id: int,
        offset: int,
        limit: int,
        exam_id:int,
        stage_ids:list[int] = [],
        paper_ids: list[int] = [],
        subject_ids: list[int] = [],
        topic_ids: list[int] = [],
        db_session: AsyncSession | None = None,
    ) -> list[Test]:
        session = db_session
        filters = []

        # Subject filter
        if subject_ids:
            subject_filter = func.exists(
                select(literal_column("x ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.subjects).alias("x"))
                .where(literal_column("x ->> 'id'").cast(Integer).in_(subject_ids))
                .correlate(Test)
            )
            filters.append(subject_filter)

        # Topic filter
        if topic_ids:
            topic_filter = func.exists(
                select(literal_column("x ->> 'id'").cast(Integer))
                .select_from(func.unnest(Test.topics).alias("x"))
                .where(literal_column("x ->> 'id'").cast(Integer).in_(topic_ids))
                .correlate(Test)
            )
            filters.append(topic_filter)

        # Outer join to check absence of attempts for user
        query = (
            select(Offering.offering_category,Offering.offering_sub_type,Offering.name.label("offering_name"),Offering.photo.label("offering_photo"),Product.code.label("prod_code"),Product.name.label("prod_name"),PlanTask.id.label("plantask_id"),Test,
                   PlanTask.planned_completion_date.label("task_planned_completion_date"),PlanTask.status.label("task_status"),
                   PlanTaskUser.id.label("plantaskuser_id"),PlanTaskUser.planned_completion_date.label("taskuser_planned_completion_date"),PlanTaskUser.status.label("taskuser_status"))
            .outerjoin(
                TestAttempt,
                and_(
                    TestAttempt.test_id == Test.id,
                    TestAttempt.attempted_by_id == user_id
                )
            )
            .join(PlanTask, PlanTask.test_id == Test.id)
            .join(PlanTaskUser, and_(PlanTaskUser.plantask_id == PlanTask.id, PlanTaskUser.student_id == user_id))
            .join(Purchase,Purchase.id == PlanTaskUser.purchase_id)
            .join(Product,Product.id == Purchase.product_id)
            .join(Offering,Offering.id == Product.offering_id)
            .where(
                TestAttempt.id.is_(None), 
                # (Test.exam.op("->>")("name").ilike("%UPSC%")),
                # (Test.stage.op("->>")("name").ilike("%UPSC%") & Test.stage.op("->>")("name").ilike("%Mains%")),
                cast(Test.exam.op("->>")("id"), Integer).in_([exam_id]) if exam_id else True,
                cast(Test.stage.op("->>")("id"), Integer).in_(stage_ids) if stage_ids else True,
                cast(Test.paper.op("->>")("id"), Integer).in_(paper_ids) if paper_ids else True,
                  # <-- This ensures no attempt exists
                *filters
            )
            .limit(limit)
            .offset(offset)
        )

        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_user_products_with_studyplans(
        self, 
        student_id: int,
        db_session: AsyncSession | None = None
    ):
        session = db_session
        batchincharge_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide


        # Subquery for open/closed task counts per product/purchase
        sub_query = (
            select(
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0
                ).label("open_tasks"),
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0
                ).label("closed_tasks"),
                PlanTaskUser.student_id.label("student_id"),
                PlanTaskUser.purchase_id.label("purchase_id"),
            )
            .select_from(PlanTaskUser)
            .where(PlanTaskUser.student_id == student_id)
            .group_by(PlanTaskUser.student_id, PlanTaskUser.purchase_id)
            .subquery()
        )

        query = (
            select(
                Purchase.id.label("purchase_id"),Purchase.total_amount.label("purchase_amt"),Purchase.purchase_date.label("purchase_date"),Purchase.purchase_status.label("purchase_status"),
                # StudyPlan.name.label("studyplan_name"),
                func.jsonb_agg(
                     func.jsonb_build_object(
                          "purchase_user", Purchase.student_id,
                          "prod_id",Product.id, 
                          "prod_name", Product.name,
                          "prod_code",Product.code,
                          "prod_status",Product.status,
                          "branch", func.jsonb_build_object("branch",Branch.name),
                            "mentor",func.jsonb_build_object("id", mentor_alias.id,"name", mentor_alias.full_name,"photo", mentor_alias.photo),
                            "guide", func.jsonb_build_object("id",guide_alias.id,"name",guide_alias.full_name,"photo",guide_alias.photo),
                            "batch_incharge", func.jsonb_build_object("id",batchincharge_alias.id,"name",batchincharge_alias.full_name,"photo",batchincharge_alias.photo),
                            "mentor_name", mentor_alias.full_name,
                            "guide_name", guide_alias.full_name,
                            "batch_incharge_name", batchincharge_alias.full_name,
                          "offering", func.jsonb_build_object(
                            "id", Offering.id,
                            "offering_type", Offering.offering_type,
                            "offering_sub_type", Offering.offering_sub_type,
                            "is_batch_offering", Offering.is_batch_offering,
                            "offering_category", Offering.offering_category,
                            "display_seq_id", Offering.display_seq_id,
                            "name", Offering.name,
                            "photo", Offering.photo,
                            "exams", Offering.exams,
                            "stages", Offering.stages,
                            "papers", Offering.papers,
                            "subjects", Offering.subjects,
                            "offering_details", Offering.offering_details,
                            "status", Offering.status
                        ),
                        "batch", func.jsonb_build_object(
                            "id", Batch.id,
                            "offering_id", Batch.offering_id,
                            "max_students", Batch.max_students,
                            "students_enrolled", Batch.students_enrolled,
                            "status", Batch.status,
                            "batch_details", Batch.batch_details,
                            "enrollment_close_date", Batch.enrollment_close_date,
                            "planned_start_date", Batch.planned_start_date,
                            "planned_end_date", Batch.planned_end_date,
                            "actual_start_date", Batch.actual_start_date,
                            "actual_end_date", Batch.actual_end_date,
                            "duration", Batch.duration,
                            "batch_incharge_id", Batch.batch_incharge
                            # "guide_id", guide_alias
                        )

                        ).distinct()).label("products"),
                            
                # Product,
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "studyplan_name", StudyPlan.name,
                            "id", PlanTask.id,
                            "name", PlanTask.name,
                            "task_seq_id", PlanTask.task_seq_id,
                            "task_type", PlanTask.task_type,
                            "studyplan_id", PlanTask.studyplan_id,
                            "papers", PlanTask.papers,
                            "subjects", PlanTask.subjects,
                            "topics", PlanTask.topics,
                            "subject_area", PlanTask.subject_area,
                            "test_id", PlanTask.test_id,
                            "study_materials", PlanTask.study_materials,
                            "planned_time", PlanTask.planned_time,
                            "planned_completion_date", PlanTask.planned_completion_date,
                            "actual_completion_date", PlanTask.actual_completion_date,
                            "target_marks", PlanTask.target_marks,
                            "links", PlanTask.links,
                            "reference_materials", PlanTask.reference_materials,
                            "created_by_id", PlanTask.created_by_id,
                            "created_by", PlanTask.created_by,
                            "last_updated_by", PlanTask.last_updated_by,
                            "remarks", PlanTask.remarks,
                            "status", PlanTask.status,
                            "is_deleted", PlanTask.is_deleted,  # Adding the 'is_deleted' field
                            "user_id", PlanTaskUser.student_id
                        ).distinct()
                    )
                    
                ).label("task_users"), 
                  # Aggregate PlanTask objects into a JSON array
                sub_query.c.open_tasks,
                sub_query.c.closed_tasks,
            )
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .outerjoin(StudyPlan, StudyPlan.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .outerjoin(Batch,Batch.id == Product.batch_id)
            .outerjoin(Branch,Branch.id == Product.branch_id)
            .outerjoin(Enrollment,Enrollment.product_id == Product.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(batchincharge_alias,Batch.batch_incharge == batchincharge_alias.id)
            .outerjoin(PlanTaskUser, and_(PlanTaskUser.student_id == student_id, PlanTaskUser.purchase_id == Purchase.id))
            .outerjoin(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
            .where(Purchase.student_id == student_id, Purchase.purchase_status == "COMPLETED")
            .group_by(Purchase.id,sub_query.c.open_tasks,
                sub_query.c.closed_tasks)
            .order_by(Purchase.id.asc())
        )
        result = await session.execute(query)
        return result.mappings().all()

    async def get_user_products_with_studyplans_upcoming(
        self, 
        student_id: int,
        prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session
        batchincharge_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide

        today_date = datetime.now(timezone.utc)
        # Subquery for open/closed task counts per product/purchase
        sub_query = (
            select(
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0
                ).label("open_tasks"),
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0
                ).label("closed_tasks"),
                PlanTaskUser.student_id.label("student_id"),
                PlanTaskUser.purchase_id.label("purchase_id"),
            )
            .select_from(PlanTaskUser)
            .where(PlanTaskUser.student_id == student_id)
            .group_by(PlanTaskUser.student_id, PlanTaskUser.purchase_id)
            .subquery()
        )

        query = (
            select(
                Purchase.id.label("purchase_id"),Purchase.total_amount.label("purchase_amt"),Purchase.purchase_date.label("purchase_date"),Purchase.purchase_status.label("purchase_status"),
                # StudyPlan.name.label("studyplan_name"),
                func.jsonb_agg(
                     func.jsonb_build_object(
                          "purchase_user", Purchase.student_id,
                          "prod_id",Product.id, 
                          "prod_name", Product.name,
                          "prod_code",Product.code,
                          "prod_status",Product.status,
                          "branch", func.jsonb_build_object("branch",Branch.name),
                           "mentor",func.jsonb_build_object("id", mentor_alias.id,"name", mentor_alias.full_name,"photo", mentor_alias.photo),
                            "guide", func.jsonb_build_object("id",guide_alias.id,"name",guide_alias.full_name,"photo",guide_alias.photo),
                            "batch_incharge", func.jsonb_build_object("id",batchincharge_alias.id,"name",batchincharge_alias.full_name,"photo",batchincharge_alias.photo),
                            "mentor_name", mentor_alias.full_name,
                            "guide_name", guide_alias.full_name,
                            "batch_incharge_name", batchincharge_alias.full_name,
                          "offering", func.jsonb_build_object(
                            "id", Offering.id,
                            "offering_type", Offering.offering_type,
                            "offering_sub_type", Offering.offering_sub_type,
                            "is_batch_offering", Offering.is_batch_offering,
                            "offering_category", Offering.offering_category,
                            "display_seq_id", Offering.display_seq_id,
                            "name", Offering.name,
                            "photo", Offering.photo,
                            "exams", Offering.exams,
                            "stages", Offering.stages,
                            "papers", Offering.papers,
                            "subjects", Offering.subjects,
                            "offering_details", Offering.offering_details,
                            "status", Offering.status
                        ),
                        "batch", func.jsonb_build_object(
                            "id", Batch.id,
                            "offering_id", Batch.offering_id,
                            "max_students", Batch.max_students,
                            "students_enrolled", Batch.students_enrolled,
                            "status", Batch.status,
                            "batch_details", Batch.batch_details,
                            "enrollment_close_date", Batch.enrollment_close_date,
                            "planned_start_date", Batch.planned_start_date,
                            "planned_end_date", Batch.planned_end_date,
                            "actual_start_date", Batch.actual_start_date,
                            "actual_end_date", Batch.actual_end_date,
                            "duration", Batch.duration,
                            "batch_incharge_id", Batch.batch_incharge
                            # "guide_id", guide_alias
                        )

                        ).distinct()).label("products"),
                            
                # Product,
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "studyplan_name", StudyPlan.name,
                            "id", PlanTask.id,
                            "name", PlanTask.name,
                            "task_seq_id", PlanTask.task_seq_id,
                            "task_type", PlanTask.task_type,
                            "studyplan_id", PlanTask.studyplan_id,
                            "papers", PlanTask.papers,
                            "subjects", PlanTask.subjects,
                            "topics", PlanTask.topics,
                            "subject_area", PlanTask.subject_area,
                            "test_id", PlanTask.test_id,
                            "study_materials", PlanTask.study_materials,
                            "planned_time", PlanTask.planned_time,
                            "planned_completion_date", PlanTask.planned_completion_date,
                            "actual_completion_date", PlanTask.actual_completion_date,
                            "target_marks", PlanTask.target_marks,
                            "links", PlanTask.links,
                            "reference_materials", PlanTask.reference_materials,
                            "created_by_id", PlanTask.created_by_id,
                            "created_by", PlanTask.created_by,
                            "last_updated_by", PlanTask.last_updated_by,
                            "remarks", PlanTask.remarks,
                            "status", PlanTask.status,
                            "is_deleted", PlanTask.is_deleted,  # Adding the 'is_deleted' field
                            "user_id", PlanTaskUser.student_id
                        ).distinct()
                    )
                    
                ).label("task_users"), 
                  # Aggregate PlanTask objects into a JSON array
                sub_query.c.open_tasks,
                sub_query.c.closed_tasks,
            )
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .outerjoin(StudyPlan, StudyPlan.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .outerjoin(Batch,Batch.id == Product.batch_id)
            .outerjoin(Branch,Branch.id == Product.branch_id)
            .outerjoin(Enrollment,Enrollment.product_id == Product.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(batchincharge_alias,Batch.batch_incharge == batchincharge_alias.id)
            .outerjoin(PlanTaskUser, and_(PlanTaskUser.student_id == student_id, PlanTaskUser.purchase_id == Purchase.id))
            .outerjoin(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
            .where(and_(
                    Purchase.student_id == student_id,
                    Purchase.purchase_status == "COMPLETED",
                    or_(
                    Product.batch_id.is_(None),  # include products without a batch
                    case(
                        (Offering.offering_sub_type != 'MENTORSHIP', Batch.planned_start_date > today_date),
                        else_=literal(True)  # i.e., if mentorship, this clause is considered satisfied
                    ),
                    and_(
                        ~Batch.status.in_(["UNPUBLISHED","DRAFT"])
                    )
                    ), # batch hasn't started yet
                    Enrollment.enrolled_user_id == student_id,
                    *([
                    Product.name.ilike(f"%{prod_name}%")
                ] if prod_name else []),
                *([
                    Product.code.ilike(f"%{prod_code}%")
                ] if prod_code else []),
                *([
                    Offering.name.ilike(f"%{offering_name}%")
                ] if offering_name else []),
                *([
                    Offering.offering_category == offering_category
                ] if offering_category else []),
                *([
                    Product.branch_id == branch_id
                ] if branch_id else []),
                *([
                    Offering.id == offering_id
                ] if offering_id else [])
                ))
            .group_by(Purchase.id,sub_query.c.open_tasks,
                sub_query.c.closed_tasks)
            .order_by(Purchase.id.asc())
        )
        result = await session.execute(query)
        return result.mappings().all()
    
    async def get_user_products_with_studyplans_inprogress(
        self, 
        student_id: int,
        prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session
        batchincharge_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide

        today_date = datetime.now(timezone.utc)
        # Subquery for open/closed task counts per product/purchase
        sub_query = (
            select(
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0
                ).label("open_tasks"),
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0
                ).label("closed_tasks"),
                PlanTaskUser.student_id.label("student_id"),
                PlanTaskUser.purchase_id.label("purchase_id"),
            )
            .select_from(PlanTaskUser)
            .where(PlanTaskUser.student_id == student_id)
            .group_by(PlanTaskUser.student_id, PlanTaskUser.purchase_id)
            .subquery()
        )

        query = (
            select(
                Purchase.id.label("purchase_id"),Purchase.total_amount.label("purchase_amt"),Purchase.purchase_date.label("purchase_date"),Purchase.purchase_status.label("purchase_status"),
                # StudyPlan.name.label("studyplan_name"),
                func.jsonb_agg(
                     func.jsonb_build_object(
                          "purchase_user", Purchase.student_id,
                          "prod_id",Product.id, 
                          "prod_name", Product.name,
                          "prod_code",Product.code,
                          "prod_status",Product.status,
                          "branch", func.jsonb_build_object("branch",Branch.name),
                           "mentor",func.jsonb_build_object("id", mentor_alias.id,"name", mentor_alias.full_name,"photo", mentor_alias.photo),
                            "guide", func.jsonb_build_object("id",guide_alias.id,"name",guide_alias.full_name,"photo",guide_alias.photo),
                            "batch_incharge", func.jsonb_build_object("id",batchincharge_alias.id,"name",batchincharge_alias.full_name,"photo",batchincharge_alias.photo),
                            "mentor_name", mentor_alias.full_name,
                            "guide_name", guide_alias.full_name,
                            "batch_incharge_name", batchincharge_alias.full_name,
                          "offering", func.jsonb_build_object(
                            "id", Offering.id,
                            "offering_type", Offering.offering_type,
                            "offering_sub_type", Offering.offering_sub_type,
                            "is_batch_offering", Offering.is_batch_offering,
                            "offering_category", Offering.offering_category,
                            "display_seq_id", Offering.display_seq_id,
                            "name", Offering.name,
                            "photo", Offering.photo,
                            "exams", Offering.exams,
                            "stages", Offering.stages,
                            "papers", Offering.papers,
                            "subjects", Offering.subjects,
                            "offering_details", Offering.offering_details,
                            "status", Offering.status
                        ),
                        "batch", func.jsonb_build_object(
                            "id", Batch.id,
                            "offering_id", Batch.offering_id,
                            "max_students", Batch.max_students,
                            "students_enrolled", Batch.students_enrolled,
                            "status", Batch.status,
                            "batch_details", Batch.batch_details,
                            "enrollment_close_date", Batch.enrollment_close_date,
                            "planned_start_date", Batch.planned_start_date,
                            "planned_end_date", Batch.planned_end_date,
                            "actual_start_date", Batch.actual_start_date,
                            "actual_end_date", Batch.actual_end_date,
                            "duration", Batch.duration,
                            "batch_incharge_id", Batch.batch_incharge
                            # "guide_id", guide_alias
                        )

                        ).distinct()).label("products"),
                            
                # Product,
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "studyplan_name", StudyPlan.name,
                            "id", PlanTask.id,
                            "name", PlanTask.name,
                            "task_seq_id", PlanTask.task_seq_id,
                            "task_type", PlanTask.task_type,
                            "studyplan_id", PlanTask.studyplan_id,
                            "papers", PlanTask.papers,
                            "subjects", PlanTask.subjects,
                            "topics", PlanTask.topics,
                            "subject_area", PlanTask.subject_area,
                            "test_id", PlanTask.test_id,
                            "study_materials", PlanTask.study_materials,
                            "planned_time", PlanTask.planned_time,
                            "planned_completion_date", PlanTask.planned_completion_date,
                            "actual_completion_date", PlanTask.actual_completion_date,
                            "target_marks", PlanTask.target_marks,
                            "links", PlanTask.links,
                            "reference_materials", PlanTask.reference_materials,
                            "created_by_id", PlanTask.created_by_id,
                            "created_by", PlanTask.created_by,
                            "last_updated_by", PlanTask.last_updated_by,
                            "remarks", PlanTask.remarks,
                            "status", PlanTask.status,
                            "is_deleted", PlanTask.is_deleted,  # Adding the 'is_deleted' field
                            "user_id", PlanTaskUser.student_id
                        ).distinct()
                    )
                    
                ).label("task_users"), 
                  # Aggregate PlanTask objects into a JSON array
                sub_query.c.open_tasks,
                sub_query.c.closed_tasks,
            )
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .outerjoin(StudyPlan, StudyPlan.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .outerjoin(Batch,Batch.id == Product.batch_id)
            .outerjoin(Branch,Branch.id == Product.branch_id)
            .outerjoin(Enrollment,Enrollment.product_id == Product.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(batchincharge_alias,Batch.batch_incharge == batchincharge_alias.id)
            .outerjoin(PlanTaskUser, and_(PlanTaskUser.student_id == student_id, PlanTaskUser.purchase_id == Purchase.id))
            .outerjoin(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
            .where( and_(
                    Purchase.student_id == student_id,
                    Purchase.purchase_status == "COMPLETED",
                    func.coalesce(Batch.actual_start_date, Batch.planned_start_date) < today_date,
                    func.coalesce(Batch.actual_end_date, Batch.planned_end_date) > today_date,
                    ~Batch.status.in_(["UNPUBLISHED","DRAFT"]),
                    *([
                        Product.name.ilike(f"%{prod_name}%")
                    ] if prod_name else []),
                    *([
                        Product.code.ilike(f"%{prod_code}%")
                    ] if prod_code else []),
                    *([
                        Offering.name.ilike(f"%{offering_name}%")
                    ] if offering_name else []),
                    *([
                        Offering.offering_category == offering_category
                    ] if offering_category else []),
                    *([
                        Product.branch_id == branch_id
                    ] if branch_id else []),
                    *([
                        Offering.id == offering_id
                    ] if offering_id else [])
                            )) 
            .group_by(Purchase.id,sub_query.c.open_tasks,
                sub_query.c.closed_tasks)
            .order_by(Purchase.id.asc())
        )
        result = await session.execute(query)
        return result.mappings().all()

    async def get_user_products_with_studyplans_completed(
        self, 
        student_id: int,
        prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session
        batchincharge_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide

        today_date = datetime.now(timezone.utc)
        # Subquery for open/closed task counts per product/purchase
        sub_query = (
            select(
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0
                ).label("open_tasks"),
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0
                ).label("closed_tasks"),
                PlanTaskUser.student_id.label("student_id"),
                PlanTaskUser.purchase_id.label("purchase_id"),
            )
            .select_from(PlanTaskUser)
            .where(PlanTaskUser.student_id == student_id)
            .group_by(PlanTaskUser.student_id, PlanTaskUser.purchase_id)
            .subquery()
        )

        query = (
            select(
                Purchase.id.label("purchase_id"),Purchase.total_amount.label("purchase_amt"),Purchase.purchase_date.label("purchase_date"),Purchase.purchase_status.label("purchase_status"),
                # StudyPlan.name.label("studyplan_name"),
                func.jsonb_agg(
                     func.jsonb_build_object(
                          "purchase_user", Purchase.student_id,
                          "prod_id",Product.id, 
                          "prod_name", Product.name,
                          "prod_code",Product.code,
                          "prod_status",Product.status,
                          "branch", func.jsonb_build_object("branch",Branch.name),
                           "mentor",func.jsonb_build_object("id", mentor_alias.id,"name", mentor_alias.full_name,"photo", mentor_alias.photo),
                            "guide", func.jsonb_build_object("id",guide_alias.id,"name",guide_alias.full_name,"photo",guide_alias.photo),
                            "batch_incharge", func.jsonb_build_object("id",batchincharge_alias.id,"name",batchincharge_alias.full_name,"photo",batchincharge_alias.photo),
                            "mentor_name", mentor_alias.full_name,
                            "guide_name", guide_alias.full_name,
                            "batch_incharge_name", batchincharge_alias.full_name,
                          "offering", func.jsonb_build_object(
                            "id", Offering.id,
                            "offering_type", Offering.offering_type,
                            "offering_sub_type", Offering.offering_sub_type,
                            "is_batch_offering", Offering.is_batch_offering,
                            "offering_category", Offering.offering_category,
                            "display_seq_id", Offering.display_seq_id,
                            "name", Offering.name,
                            "photo", Offering.photo,
                            "exams", Offering.exams,
                            "stages", Offering.stages,
                            "papers", Offering.papers,
                            "subjects", Offering.subjects,
                            "offering_details", Offering.offering_details,
                            "status", Offering.status
                        ),
                        "batch", func.jsonb_build_object(
                            "id", Batch.id,
                            "offering_id", Batch.offering_id,
                            "max_students", Batch.max_students,
                            "students_enrolled", Batch.students_enrolled,
                            "status", Batch.status,
                            "batch_details", Batch.batch_details,
                            "enrollment_close_date", Batch.enrollment_close_date,
                            "planned_start_date", Batch.planned_start_date,
                            "planned_end_date", Batch.planned_end_date,
                            "actual_start_date", Batch.actual_start_date,
                            "actual_end_date", Batch.actual_end_date,
                            "duration", Batch.duration,
                            "batch_incharge_id", Batch.batch_incharge
                            # "guide_id", guide_alias
                        )

                        ).distinct()).label("products"),
                            
                # Product,
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "studyplan_name", StudyPlan.name,
                            "id", PlanTask.id,
                            "name", PlanTask.name,
                            "task_seq_id", PlanTask.task_seq_id,
                            "task_type", PlanTask.task_type,
                            "studyplan_id", PlanTask.studyplan_id,
                            "papers", PlanTask.papers,
                            "subjects", PlanTask.subjects,
                            "topics", PlanTask.topics,
                            "subject_area", PlanTask.subject_area,
                            "test_id", PlanTask.test_id,
                            "study_materials", PlanTask.study_materials,
                            "planned_time", PlanTask.planned_time,
                            "planned_completion_date", PlanTask.planned_completion_date,
                            "actual_completion_date", PlanTask.actual_completion_date,
                            "target_marks", PlanTask.target_marks,
                            "links", PlanTask.links,
                            "reference_materials", PlanTask.reference_materials,
                            "created_by_id", PlanTask.created_by_id,
                            "created_by", PlanTask.created_by,
                            "last_updated_by", PlanTask.last_updated_by,
                            "remarks", PlanTask.remarks,
                            "status", PlanTask.status,
                            "is_deleted", PlanTask.is_deleted,  # Adding the 'is_deleted' field
                            "user_id", PlanTaskUser.student_id
                        ).distinct()
                    )
                    
                ).label("task_users"), 
                  # Aggregate PlanTask objects into a JSON array
                sub_query.c.open_tasks,
                sub_query.c.closed_tasks,
            )
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .outerjoin(StudyPlan, StudyPlan.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .outerjoin(Batch,Batch.id == Product.batch_id)
            .outerjoin(Branch,Branch.id == Product.branch_id)
            .outerjoin(Enrollment,Enrollment.product_id == Product.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(batchincharge_alias,Batch.batch_incharge == batchincharge_alias.id)
            .outerjoin(PlanTaskUser, and_(PlanTaskUser.student_id == student_id, PlanTaskUser.purchase_id == Purchase.id))
            .outerjoin(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
            .where(and_(
                    Purchase.student_id == student_id,
                    Purchase.purchase_status == "COMPLETED",
                    and_(func.coalesce(Batch.actual_end_date, Batch.planned_end_date) < today_date, ~Batch.status.in_(["UNPUBLISHED","DRAFT"]) ),
                     *([
                        Product.name.ilike(f"%{prod_name}%")
                    ] if prod_name else []),
                    *([
                        Product.code.ilike(f"%{prod_code}%")
                    ] if prod_code else []),
                    *([
                        Offering.name.ilike(f"%{offering_name}%")
                    ] if offering_name else []),
                    *([
                        Offering.offering_category == offering_category
                    ] if offering_category else []),
                    *([
                        Product.branch_id == branch_id
                    ] if branch_id else []),
                    *([
                        Offering.id == offering_id
                    ] if offering_id else []) # batch hasn't started yet
                ))
            .group_by(Purchase.id,sub_query.c.open_tasks,
                sub_query.c.closed_tasks)
            .order_by(Purchase.id.asc())
        )
        result = await session.execute(query)
        return result.mappings().all()

    async def get_user_product_with_studyplans(
        self, 
        student_id: int,
        purchase_id :int,       db_session: AsyncSession | None = None
    ):
        session = db_session
        batchincharge_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide


        # Subquery for open/closed task counts per product/purchase
        sub_query = (
            select(
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "OPEN", 1), else_=None)), 0
                ).label("open_tasks"),
                func.coalesce(
                    func.count(case((PlanTaskUser.status == "CLOSED", 1), else_=None)), 0
                ).label("closed_tasks"),
                PlanTaskUser.student_id.label("student_id"),
                PlanTaskUser.purchase_id.label("purchase_id"),
            )
            .select_from(PlanTaskUser)
            .where(PlanTaskUser.student_id == student_id)
            .group_by(PlanTaskUser.student_id, PlanTaskUser.purchase_id)
            .subquery()
        )

        query = (
            select(
                Purchase.id.label("purchase_id"),Purchase.total_amount.label("purchase_amt"),Purchase.purchase_date.label("purchase_date"),Purchase.purchase_status.label("purchase_status"),
                # StudyPlan.name.label("studyplan_name"),
                func.jsonb_agg(
                     func.jsonb_build_object(
                          "purchase_user", Purchase.student_id,
                          "prod_id",Product.id, 
                          "prod_name", Product.name,
                          "prod_code",Product.code,
                          "prod_status",Product.status,
                          "branch", func.jsonb_build_object("branch",Branch.name),
                           "mentor",func.jsonb_build_object("id", mentor_alias.id,"name", mentor_alias.full_name,"photo", mentor_alias.photo),
                            "guide", func.jsonb_build_object("id",guide_alias.id,"name",guide_alias.full_name,"photo",guide_alias.photo),
                            "batch_incharge", func.jsonb_build_object("id",batchincharge_alias.id,"name",batchincharge_alias.full_name,"photo",batchincharge_alias.photo),
                            "mentor_name", mentor_alias.full_name,
                            "guide_name", guide_alias.full_name,
                            "batch_incharge_name", batchincharge_alias.full_name,
                          "offering", func.jsonb_build_object(
                            "id", Offering.id,
                            "offering_type", Offering.offering_type,
                            "offering_sub_type", Offering.offering_sub_type,
                            "is_batch_offering", Offering.is_batch_offering,
                            "offering_category", Offering.offering_category,
                            "display_seq_id", Offering.display_seq_id,
                            "name", Offering.name,
                            "photo", Offering.photo,
                            "exams", Offering.exams,
                            "stages", Offering.stages,
                            "papers", Offering.papers,
                            "subjects", Offering.subjects,
                            "offering_details", Offering.offering_details,
                            "status", Offering.status
                        ),
                        "batch", func.jsonb_build_object(
                            "id", Batch.id,
                            "offering_id", Batch.offering_id,
                            "max_students", Batch.max_students,
                            "students_enrolled", Batch.students_enrolled,
                            "status", Batch.status,
                            "batch_details", Batch.batch_details,
                            "enrollment_close_date", Batch.enrollment_close_date,
                            "planned_start_date", Batch.planned_start_date,
                            "planned_end_date", Batch.planned_end_date,
                            "actual_start_date", Batch.actual_start_date,
                            "actual_end_date", Batch.actual_end_date,
                            "duration", Batch.duration,
                            "batch_incharge_id", Batch.batch_incharge
                            # "guide_id", guide_alias
                        )

                        ).distinct()).label("products"),
                            
                # Product,
                func.coalesce(
                    func.jsonb_agg(
                        func.jsonb_build_object(
                            "studyplan_name", StudyPlan.name,
                            "id", PlanTask.id,
                            "name", PlanTask.name,
                            "task_seq_id", PlanTask.task_seq_id,
                            "task_type", PlanTask.task_type,
                            "studyplan_id", PlanTask.studyplan_id,
                            "papers", PlanTask.papers,
                            "subjects", PlanTask.subjects,
                            "topics", PlanTask.topics,
                            "subject_area", PlanTask.subject_area,
                            "test_id", PlanTask.test_id,
                            "study_materials", PlanTask.study_materials,
                            "planned_time", PlanTask.planned_time,
                            "planned_completion_date", PlanTask.planned_completion_date,
                            "actual_completion_date", PlanTask.actual_completion_date,
                            "target_marks", PlanTask.target_marks,
                            "links", PlanTask.links,
                            "reference_materials", PlanTask.reference_materials,
                            "created_by_id", PlanTask.created_by_id,
                            "created_by", PlanTask.created_by,
                            "last_updated_by", PlanTask.last_updated_by,
                            "remarks", PlanTask.remarks,
                            "status", PlanTask.status,
                            "is_deleted", PlanTask.is_deleted,  # Adding the 'is_deleted' field
                            "user_id", PlanTaskUser.student_id
                        ).distinct()
                    )
                    
                ).label("task_users"), 
                  # Aggregate PlanTask objects into a JSON array
                sub_query.c.open_tasks,
                sub_query.c.closed_tasks,
            )
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .outerjoin(StudyPlan, StudyPlan.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .outerjoin(Batch,Batch.id == Product.batch_id)
            .outerjoin(Branch,Branch.id == Product.branch_id)
            .outerjoin(Enrollment,Enrollment.product_id == Product.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(batchincharge_alias,Batch.batch_incharge == batchincharge_alias.id)
            .outerjoin(PlanTaskUser, and_(PlanTaskUser.student_id == student_id, PlanTaskUser.purchase_id == Purchase.id))
            .outerjoin(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
            .where(Purchase.student_id == student_id, Purchase.purchase_status == "COMPLETED",Purchase.id == purchase_id)
            .group_by(Purchase.id,sub_query.c.open_tasks,
                sub_query.c.closed_tasks)
            .order_by(Purchase.id.asc())
        )
        result = await session.execute(query)
        return result.mappings().all()

    async def get_test_atempts_with_details(self,test_id:int,product_name: str | None = None,
                                            product_code: str | None = None,
                                            branch_name: str | None = None,
                                            offering_name: str | None = None,
                                            student_name: str | None = None,
                                            student_phno: str | None = None,
                                            status: str | None = None,
                                            evaluation_status: str | None = None,db_session:AsyncSession| None = None):
        session = db_session
        filters = [TestAttempt.test_id == test_id]

        if product_name:
            filters.append(Product.name.ilike(f"%{product_name}%"))
        if product_code:
            filters.append(Product.code.ilike(f"%{product_code}%"))
        if branch_name:
            filters.append(Branch.name.ilike(f"%{branch_name}%"))
        if offering_name:
            filters.append(Offering.name.ilike(f"%{offering_name}%"))
        if student_name:
            filters.append(User.full_name.ilike(f"%{student_name}%"))
        if student_phno:
            filters.append(User.phone_number.ilike(f"%{student_phno}%"))
        if status:
            filters.append(TestAttempt.status == status)
        if evaluation_status:
            filters.append(TestAttempt.test_evaluation_status == evaluation_status)

        query = (select(
                    func.jsonb_build_object(
                        "branch", Branch.name,
                        "prod_name", Product.name,
                        "prod_code", Product.code,
                        "offering_name", Offering.name,
                        "user_id", User.id,
                        "user_name", User.full_name,
                        "student_phno", User.phone_number,
                        "test_attempt_mode", TestAttempt.test_attempt_mode,
                        "in_app_answering", TestAttempt.in_app_answering,
                        "status", TestAttempt.status,
                        "test_evaluation_status", TestAttempt.test_evaluation_status,
                        "score", TestAttempt.score,
                        "is_physical_test_attempt", TestAttempt.is_physical_test_attempt,
                        "max_marks", Test.max_marks,
                        "test_id", Test.id,
                        "test_attempt_id", TestAttempt.id
                    ).label("attempt_details")
                ).select_from(TestAttempt)
                .join(Test, Test.id == TestAttempt.test_id)
                # .outerjoin(PlanTask, PlanTask.test_id == TestAttempt.test_id)
                # .outerjoin(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
                # .outerjoin(Batch, Batch.id == StudyPlan.batch_id)
                .outerjoin(Product, Product.id == TestAttempt.product_id)
                .outerjoin(Offering, Offering.id == Product.offering_id)
                .outerjoin(Branch,Branch.id == Product.branch_id)
                .join(User, User.id == TestAttempt.attempted_by_id)
                .where(and_(*filters))
                .group_by(
                    Branch.name,
                    Product.name,
                    Product.code,
                    User.id,
                    User.phone_number,
                    TestAttempt.test_attempt_mode,
                    TestAttempt.in_app_answering,
                    TestAttempt.status,
                    TestAttempt.test_evaluation_status,
                    TestAttempt.score,
                    Test.max_marks,
                    Test.id,
                    TestAttempt.id,
                    User.full_name,
                    Offering.name
                ))
        
        res = await session.execute(query)
        return res.mappings().all()
        

    async def get_test_batch_summary(self,batch_id:int,db_session:AsyncSession| None = None):
        session = db_session

        query = (
                select(
                    Batch.students_enrolled.label("enrolled_count"),
                     func.count(PlanTask.test_id).filter(TestAttempt.id.isnot(None)).label("batch_attempt_tests_count"),
                    func.count(PlanTask.test_id).label("batch_tests_count"),
                    func.count(TestAttempt.id).label("test_eval_count"),
                    func.avg(Test.questions_count).label("test_q_count"),
                    func.avg(TestAttempt.score).label("mean_score"),
                    func.max(TestAttempt.score).label("max_score"),
                    func.min(TestAttempt.score).label("min_score"),
                    func.avg(Test.max_marks).label("avg_max_marks"),
                    func.percentile_cont(0.5).within_group(TestAttempt.score).label("median"),
                    func.mode().within_group(TestAttempt.score).label("mode")
                        )
                .select_from(Batch)
                .join(StudyPlan, StudyPlan.batch_id == Batch.id)
                .join(PlanTask, PlanTask.studyplan_id == StudyPlan.id)
                .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
                .join(Test, Test.id == PlanTask.test_id)
                .join(
                    TestAttempt,
                    and_(
                        TestAttempt.test_id == PlanTask.test_id,
                        TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                        TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                        ),
                        isouter=True
                    )
                    .where(
                        Batch.id == batch_id,
                        PlanTask.test_id.isnot(None),
                        # Test.stage.op("->>")("name").ilike("%Mains%")
                    )
                    .group_by(Batch.students_enrolled)
                )

        result = await session.execute(query)
        row = result.first()
        return row._asdict() if row else {}

    async def get_test_batch_top_performers(self, batch_id: int, session: AsyncSession):
        query = (
            select(
                User.full_name.label("student_name"),
                func.max(TestAttempt.score).label("score")
            )
            .select_from(PlanTask)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            )
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(User, User.id == TestAttempt.attempted_by_id )
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None)
            )
            .group_by(User.full_name)
            .order_by(desc("score"))
            .limit(5)
        )

        result = await session.execute(query)
        return result.mappings().all()


    async def get_score_median_mode(self, batch_id: int, stage_id: int, session: AsyncSession):
        score_query = (
            select(TestAttempt.score)
            .select_from(PlanTask)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            )
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None),
                cast(Test.stage.op("->>")("id"), Integer) == stage_id,
                TestAttempt.score.isnot(None)
            )
        )

        result = await session.execute(score_query)
        scores = [row.score for row in result.fetchall() if row.score is not None]

        if not scores:
            return {"median_score": None, "mode_score": None}

        med = float(median(scores))
        mode = mode(scores)
        # mode_count = Counter(scores).most_common(1)
        # mode = float(mode_count[0][0]) if mode_count else None

        return {"median_score": med, "mode_score": mode}

    async def get_tests_assigned_counts(self, student_ids: list[int], session: AsyncSession):
        query = (
            select(
                PlanTaskUser.student_id,
                func.count(PlanTaskUser.id).label("tests_assigned")
            )
            .join(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .where(
                PlanTaskUser.student_id.in_(student_ids),
                PlanTask.test_id.isnot(None)
            )
            .group_by(PlanTaskUser.student_id)
        )
        result = await session.execute(query)
        return {row.student_id: row.tests_assigned for row in result.fetchall()}

    async def get_tests_attempted_counts(self, student_ids: list[int], session: AsyncSession):
        query = (
            select(
                TestAttempt.attempted_by_id,
                func.count(TestAttempt.id).label("tests_attempted")
            )
            .where(
                TestAttempt.attempted_by_id.in_(student_ids),
                TestAttempt.status == TEST_ATTEMPT_STATUS.completed
            )
            .group_by(TestAttempt.attempted_by_id)
        )
        result = await session.execute(query)
        return {row.attempted_by_id: row.tests_attempted for row in result.fetchall()}


    async def get_all_paper_scores(self,batch_id:int,session: AsyncSession):
        query = (
            select(
                TestAttempt.attempted_by_id.label("student_id"),
                User.full_name.label("name"),
                Test.paper.op("->>")("name").label("paper_name"),
                TestAttempt.score,
                Test.max_marks,
                (TestAttempt.score / Test.max_marks * 100).label("percentage_score")
            )
            # .join(Test, Test.id == TestAttempt.test_id)
            # .join(User, User.id == TestAttempt.attempted_by_id)
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(User,User.id == PlanTaskUser.student_id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            )
            .where(
                StudyPlan.batch_id == batch_id,
                TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                PlanTask.test_id.isnot(None),
                TestAttempt.score.isnot(None),
            )
        )

        result = await session.execute(query)
        return result.mappings().all()


    async def compute_top_performers_per_paper(self,batch_id:int, session: AsyncSession):
        all_scores = await self.get_all_paper_scores(batch_id=batch_id,session=session)
        # Group all attempts by paper
        paper_map = defaultdict(list)
        for row in all_scores:
            paper_map[row.paper_name].append({
                "student_id": row.student_id,
                "name": row.name,
                "score": row.score,
                "max_marks": row.max_marks,
                "percentage_score": float(row.percentage_score),
            })

        final_output = {}

        for paper, records in paper_map.items():
            # Sort by percentage descending
            student_best_attempt = {}
            for rec in records:
                sid = rec["student_id"]
                if sid not in student_best_attempt or rec["percentage_score"] > student_best_attempt[sid]["percentage_score"]:
                    student_best_attempt[sid] = rec

            # Now deduplicate
            unique_records = list(student_best_attempt.values())

            # Sort by percentage descending
            sorted_records = sorted(unique_records, key=lambda x: -x["percentage_score"])
            # Compute percentiles (manual, relative to sorted list)
            total_students = len(sorted_records)
            percentiles = {}
            for idx, rec in enumerate(sorted_records):
                percentiles[rec["student_id"]] = round(100.0 * (total_students - idx - 1) / (total_students - 1 or 1), 2)

            # Only keep top 3
            top_3 = sorted_records[:3]

            # Fetch test count per student
            student_ids = [s["student_id"] for s in top_3]
            assigned_map = await self.get_tests_assigned_counts(student_ids, session)
            attempted_map = await self.get_tests_attempted_counts(student_ids, session)

            top_result = []
            for rank, s in enumerate(top_3, start=1):
                top_result.append({
                    "rank": rank,
                    "student_id": s["student_id"],
                    "name": s["name"],
                    "percentage_score": round(s["percentage_score"], 2),
                    "tests_assigned": assigned_map.get(s["student_id"], 0),
                    "tests_attempted": attempted_map.get(s["student_id"], 0),
                    "percentile": percentiles.get(s["student_id"], 0.0),
                })

            final_output[paper] = top_result

        return final_output

    async def get_batch_test_stats(self, batch_id: int, session: AsyncSession):
        subquery = (
            select(
                Test.id.label("test_id"),
                Test.title.label("test_title"),
                Test.paper.op("->>")("name").label("paper_name"),
                TestAttempt.score.label("score")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    # TestAttempt.test_evaluation_status.in_([
                    #     TEST_ASSESSMENT_STATUS.evaluated,
                    #     TEST_ASSESSMENT_STATUS.accepted
                    # ]),
                    TestAttempt.score.isnot(None)
                )
            )
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None)
            )
            .subquery()
        )

        query = (
            select(
                subquery.c.test_id,
                subquery.c.test_title,
                subquery.c.paper_name,
                func.avg(subquery.c.score).label("avg_score"),
                func.max(subquery.c.score).label("top_score"),
                func.min(subquery.c.score).label("low_score"),
                func.percentile_cont(0.5).within_group(subquery.c.score).label("median_score"),
                func.stddev_pop(subquery.c.score).label("stddev_score")
            )
            .group_by(subquery.c.test_id, subquery.c.test_title, subquery.c.paper_name)
            .order_by(subquery.c.test_id)
        )

        result = await session.execute(query)
        return result.mappings().all()
        
    
    async def get_paper_wise_anal_for_batch_tests(self, batch_id: int, session: AsyncSession):
        subquery = (
            select(
                Test.id.label("test_id"),
                Test.paper.op("->>")("name").label("paper_name"),
                Test.questions_count.label("questions_count"),
                # PlanTaskUser.student_id.label("student_id"),
                TestAttempt.score.label("score")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed
                )
            )
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None),
                TestAttempt.score.isnot(None),
            )
            .subquery()
        )

        query = (
            select(
                subquery.c.paper_name,
                func.sum(func.distinct(subquery.c.questions_count)).label("total_questions"),
                func.avg(subquery.c.score).label("avg_score"),
                func.max(subquery.c.score).label("top_score"),
                func.min(subquery.c.score).label("lowest_score"),
                func.stddev_pop(subquery.c.score).label("stddev_score")
            )
            .group_by(subquery.c.paper_name)
            .order_by(subquery.c.paper_name)
        )
        def categorize_score(avg_score: float) -> str:
            if avg_score >= 75:
                return "Very High"
            elif avg_score >= 60:
                return "High"
            elif avg_score >= 40:
                return "Medium"
            else:
                return "Low"

        result = await session.execute(query)
        rows = result.mappings().all()
        paper_wise_resp = [dict(row) for row in rows]

        # Annotate with score_category
        for item in paper_wise_resp:
            item["score_category"] = categorize_score(item["avg_score"])

        return paper_wise_resp
    
    async def get_subject_wise_anal_for_batch_tests(
        self, batch_id: int, db_session: AsyncSession
    ):
        session = db_session

        # Unnest subject from Question.subject (JSON)
        subjects_subquery = (select(
            Question.subject.label("subj"),
            Question.id.label("question_id"),
        ).subquery())

        # Aliases
        tqa = aliased(TestQuestionAttempt)
        q = aliased(Question)
        tq = aliased(TestQuestion)
        ta = aliased(TestAttempt)
        t = aliased(Test)
        pt = aliased(PlanTask)
        sp = aliased(StudyPlan)

        # Base query with per-attempt per-question data
        detailed_query = (
            select(
                 literal_column("(subj->>'name')").label("subject_name"),
                ta.id.label("test_attempt_id"),
                q.id.label("q_id"),
                func.sum(tqa.marks_obtained).label("score"),
                func.sum(q.max_marks).label("max_marks"),
            )
            .select_from(pt)
            .join(sp, sp.id == pt.studyplan_id)
            .join(t, t.id == pt.test_id)
            .join(tq, tq.test_id == t.id)
            .join(q, q.id == tq.question_id)
            .join(subjects_subquery, subjects_subquery.c.question_id == q.id)
            .join(ta, ta.test_id == t.id)
            .join(tqa, and_(
                tqa.test_attempt_id == ta.id,
                tqa.question_id == q.id
            ))
            .where(
                sp.batch_id == batch_id,
                ta.status == "COMPLETED",
                pt.test_id.isnot(None),
                ta.test_evaluation_status.in_([
                    TEST_ASSESSMENT_STATUS.evaluated,
                    TEST_ASSESSMENT_STATUS.accepted
                ])
            )
            .group_by("subject_name","q_id", ta.id)
            .subquery()
        )

        # Aggregate per subject
        stmt = (
            select(
                detailed_query.c.subject_name,
                func.count().label("total_attempts"),
                func.count(distinct(detailed_query.c.q_id)).label("total_questions"),
                func.sum(detailed_query.c.max_marks).label("total_max_marks"),
                func.avg(detailed_query.c.score).label("avg_score"),
                func.max(detailed_query.c.score).label("top_score"),
                func.min(detailed_query.c.score).label("lowest_score"),
                func.stddev_pop(detailed_query.c.score).label("stddev_score")
            )
            .group_by(detailed_query.c.subject_name)
            .order_by(detailed_query.c.subject_name)
        )
        def categorize_score(avg_score: float) -> str:
            if avg_score >= 75:
                return "Very High"
            elif avg_score >= 60:
                return "High"
            elif avg_score >= 40:
                return "Medium"
            else:
                return "Low"

        result = await session.execute(stmt)
        rows = result.mappings().all()
        subj_wise_resp = [dict(row) for row in rows]
        # Annotate with score_category
        for item in subj_wise_resp:
            item["score_category"] = categorize_score(item["avg_score"])

        return subj_wise_resp

        result = await session.execute(stmt)
        return result.mappings().all()
    
    async def get_test_ratio(self, batch_id: int, session: AsyncSession):
        # Subquery for assigned
        assigned_subq = (
            select(
                Test.id.label("test_id"),
                Test.title.label("test_name"),
                Test.paper.op("->>")("name").label("paper_name"),
                func.count(PlanTaskUser.student_id).label("assigned_count")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None)
            )
            .group_by(Test.id, Test.paper.op("->>")("name"))
            .subquery()
        )

        # Subquery for attempted
        attempted_subq = (
            select(
                Test.id.label("test_id"),
                func.count(distinct(TestAttempt.id)).label("attempted_count")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    TestAttempt.score.isnot(None)
                )
            )
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None)
            )
            .group_by(Test.id)
            .subquery()
        )
       
        # Final query joining assigned and attempted
        final_query = (
            select(
                assigned_subq.c.test_id,
                assigned_subq.c.test_name,
                assigned_subq.c.paper_name,
                assigned_subq.c.assigned_count,
                func.coalesce(attempted_subq.c.attempted_count, 0).label("attempted_count"),
                (
                    
                        (func.coalesce(attempted_subq.c.attempted_count, 0) / cast(assigned_subq.c.assigned_count, Float)) * 100
                    
                ).label("completion_rate")
            )
            .outerjoin(
                attempted_subq,
                attempted_subq.c.test_id == assigned_subq.c.test_id
            )
        )

        result = await session.execute(final_query)
        return result.fetchall()

    async def top_performers_data(self,batch_id:int , session:AsyncSession):
        # Subquery: Total and attempted tests per student in the batch
        attempts_subq = (
            select(
                TestAttempt.attempted_by_id.label("student_id"),
                func.count(TestAttempt.id).label("tests_attempted"),
                func.sum(TestAttempt.score).label("total_score"),
                func.sum(Test.max_marks).label("total_max"),
                (func.sum(TestAttempt.score) / func.sum(Test.max_marks) * 100).label("percent_score")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    TestAttempt.score.isnot(None)
                )
            )
            .where(
                TestAttempt.score.isnot(None),
                StudyPlan.batch_id == batch_id
            )
            .group_by(TestAttempt.attempted_by_id)
            .order_by((func.sum(TestAttempt.score) / cast(func.sum(Test.max_marks), Float)).desc())
            .limit(5)
            .subquery()
        )
        assigned_subq = (
            select(
                PlanTaskUser.student_id,
                func.count(PlanTaskUser.id).label("tests_assigned")
            ).select_from(PlanTaskUser)
            .join(PlanTask, PlanTask.id == PlanTaskUser.plantask_id)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .where(StudyPlan.batch_id == batch_id,PlanTask.test_id.isnot(None))
            .group_by(PlanTaskUser.student_id)
            .subquery()
        )
       
        strongest_paper_subq = (
            select(
                TestAttempt.attempted_by_id.label("student_id"),
                Test.paper.op("->>")("name").label("paper_name"),
                func.avg(TestAttempt.score).label("avg_score")
            )
            .select_from(PlanTask)
            .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
            .join(Test, Test.id == PlanTask.test_id)
            .join(PlanTaskUser, PlanTaskUser.plantask_id == PlanTask.id)
            .join(
                TestAttempt,
                and_(
                    TestAttempt.test_id == PlanTask.test_id,
                    TestAttempt.attempted_by_id == PlanTaskUser.student_id,
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    TestAttempt.score.isnot(None)
                )
            )
            .where(
                StudyPlan.batch_id == batch_id,
                PlanTask.test_id.isnot(None)
            )
            .group_by(TestAttempt.attempted_by_id, "paper_name")
            .subquery()
        )
        ranked_papers = (
            select(
                strongest_paper_subq.c.student_id,
                strongest_paper_subq.c.paper_name,
                strongest_paper_subq.c.avg_score,
                func.row_number().over(
                partition_by=strongest_paper_subq.c.student_id,
                order_by=strongest_paper_subq.c.avg_score.desc()
            ).label("rnk")
            )
        ).subquery()

        strongest_final = (
            select(
                ranked_papers.c.student_id,
                ranked_papers.c.paper_name.label("strongest_paper")
            )
            .where(ranked_papers.c.rnk == 1)
            .subquery()
        )
        final_query = (
            select(
                User.id.label("student_id"),
                User.full_name.label("student_name"),
                attempts_subq.c.percent_score,
                attempts_subq.c.tests_attempted,
                func.coalesce(assigned_subq.c.tests_assigned, 0).label("tests_assigned"),
                strongest_final.c.strongest_paper
            )
            .join(User, User.id == attempts_subq.c.student_id)
            .outerjoin(assigned_subq, assigned_subq.c.student_id == User.id)
            .outerjoin(strongest_final, strongest_final.c.student_id == User.id)
        )
        # ?? Execute the final_query *before* using student IDs
        result = await session.execute(final_query)
        students = [dict(row._mapping) for row in result.fetchall()]

        # 5. Get score trend data for the selected students
        student_ids = [s["student_id"] for s in students]

        if student_ids:
            trend_query = (
                select(
                    TestAttempt.attempted_by_id.label("student_id"),
                    TestAttempt.submitted_date,
                    TestAttempt.score
                )
                .join(Test, Test.id == TestAttempt.test_id)
                .join(PlanTask, PlanTask.test_id == Test.id)
                .join(StudyPlan, StudyPlan.id == PlanTask.studyplan_id)
                .where(
                    TestAttempt.status == TEST_ATTEMPT_STATUS.completed,
                    TestAttempt.score.isnot(None),
                    StudyPlan.batch_id == batch_id,
                    TestAttempt.attempted_by_id.in_(student_ids)
                )
                .order_by(TestAttempt.attempted_by_id, TestAttempt.submitted_date)
            )

            trend_result = await session.execute(trend_query)
            trend_map = defaultdict(list)
            for row in trend_result.fetchall():
                trend_map[row.student_id].append(row.score)

            def calc_diff_list(scores):
                return [curr - prev for prev, curr in zip(scores, scores[1:])]

            # Add score_diff_list to each student
            for student in students:
                sid = student["student_id"]
                student["score_diff_list"] = calc_diff_list(trend_map.get(sid, []))
        else:
            for student in students:
                student["score_diff_list"] = []

        return students
        
    async def update_plantaskusers_purids(self,pur_ids:list[int],plantask_id:int,is_deleted:bool, session:AsyncSession):
        query = (update(PlanTaskUser)
                 .values(is_deleted = is_deleted)
                 .where(PlanTaskUser.purchase_id.in_(pur_ids),PlanTaskUser.plantask_id==plantask_id ))
        await session.execute(query)
        await session.commit()
    
    def get_ca_minutes_for_cycle_type(self, cycle_type: str = None) -> int:
        """
        Calculate CA minutes based on cycle type.
        Cycle types: C2/C3 = 20 mins, C4/C5 = 60 mins, C6 = 30 mins, others = 0
        If no cycle_type provided, returns default of 30 minutes.
        """
        if cycle_type is None:
            return 30  # default
        
        cycle_map = {
            "C2": 20,
            "C3": 20,
            "C4": 60,
            "C5": 60,
            "C6": 30
        }
        return cycle_map.get(cycle_type.upper(), 0)
    
    async def generate_ca_tasks_for_studyplan(
        self,
        studyplan_id: int,
        start_date: date,
        end_date: date,
        daily_ca_minutes: int,
        created_by_id: int,
        created_by_info: dict,
        exclude_weekdays: list[int] = None,  # 0=Monday, 6=Sunday
        db_session: AsyncSession = None
    ) -> list[PlanTask]:
        """
        Generate daily current affairs reading tasks for a study plan.
        
        Args:
            studyplan_id: ID of the study plan
            start_date: Start date for CA tasks
            end_date: End date for CA tasks
            daily_ca_minutes: Minutes per day for CA reading
            created_by_id: User ID creating the tasks
            created_by_info: User info dict {"id": int, "name": str, "photo": str}
            exclude_weekdays: List of weekdays to exclude (0=Monday, 6=Sunday)
            db_session: Database session
        
        Returns:
            List of created PlanTask objects
        """
        from datetime import timedelta
        
        session = db_session
        exclude_weekdays = exclude_weekdays or []
        
        # Get the highest task_seq_id for this studyplan
        max_seq_query = select(func.coalesce(func.max(PlanTask.task_seq_id), 0)).where(
            PlanTask.studyplan_id == studyplan_id
        )
        result = await session.execute(max_seq_query)
        max_seq_id = result.scalar()
        
        ca_tasks = []
        current_date = start_date
        task_seq_id = max_seq_id + 1
        
        while current_date <= end_date:
            # Skip excluded weekdays (e.g., test days, catchup days)
            if current_date.weekday() not in exclude_weekdays:
                task_data = {
                    "name": "Current Affairs - Daily Reading",
                    "task_type": TASK_TYPE.reading.value,
                    "task_seq_id": task_seq_id,
                    "studyplan_id": studyplan_id,
                    "papers": [],
                    "subjects": [],
                    "topics": [],
                    "subject_area": SubjectArea.gs_currentaffairs.value,
                    "test_id": None,
                    "study_materials": [],
                    "planned_time": daily_ca_minutes,
                    "planned_completion_date": datetime.combine(current_date, datetime.min.time(), tzinfo=timezone.utc),
                    "actual_completion_date": None,
                    "target_marks": 0,
                    "links": [],
                    "mentorship_meetings": [],
                    "reference_materials": [],
                    "current_affairs_type": {"type": "CAReading"},
                    "created_by_id": created_by_id,
                    "created_by": created_by_info,
                    "last_updated_by": None,
                    "remarks": "Auto-generated current affairs task",
                    "status": TASK_STATUS.open.value,
                    "is_deleted": False
                }
                
                # Create the task
                task = PlanTask(**task_data)
                session.add(task)
                ca_tasks.append(task)
                task_seq_id += 1
            
            current_date += timedelta(days=1)
        
        await session.commit()
        
        # Refresh to get IDs
        for task in ca_tasks:
            await session.refresh(task)
        
        return ca_tasks


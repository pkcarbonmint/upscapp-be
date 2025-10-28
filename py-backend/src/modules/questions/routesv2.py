from fastapi import APIRouter, Depends
from fastapi.exceptions import RequestValidationError
from fastapi_async_sqlalchemy import db

from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_TYPE
from .service import *
from .models import Question
from .schemas import *
from src.users.models import User
from src.auth.deps import valid_token_user
from src.auth.security import validate_admin_access
from src.exceptions import NotFound
from src.external.cms.service import fetch_q_by_id, strapi, report_q_cms

question_router_v2 = APIRouter(prefix="/v2/questions", tags=["QuestionsV2"])


question_service = QuestionService(Question, db)
question_report_service = QuestionReportService(QuestionReport, db)


"""
Question Report reports
"""


@question_router_v2.post("/reports", response_model=QuestionReportResponse)
async def post_report(
    report_in: QuestionReportCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    question_db = await question_service.get(id=report_in.question_id,db_session=db.session)
    if not question_db:
        raise NotFound()

    q_report_in = QuestionReport(**report_in.model_dump(), reported_by_id=user.id)
    report_db = await question_report_service.create(obj_in=q_report_in,db_session=db.session)

    cms_q_report = await report_q_cms(
        q_type=question_db.question_type,
        cms_id=question_db.cms_id,
        q_num=question_db.q_num,
        report_in=ReportCMSCreate(
            **report_in.model_dump(),
            reportedById=user.id,
            reportedBy=UserBasicInfo(**user.__dict__)
        ),
    )

    return report_db

@question_router_v2.put("/reports",response_model=QuestionReportV2Response)
async def update_questions_reports( q_report_update:QuestionReportUpdate,report_id:int | None = None):
    question_db = await question_report_service.get(id=report_id,db_session=db.session)
    if not question_db:
        raise NotFound()

    question_update_db = await question_report_service.update(
        obj_current=question_db, obj_new=q_report_update,db_session=db.session
    )
    return question_update_db


@question_router_v2.get(
    "/reports",
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))],
    response_model=list[QuestionReportV2Response],
)
async def get_all_questions_reports(offset:int | None = None, limit: int | None = None):
    reports_db = await question_report_service.get_multi(skip=offset,limit=limit,db_session=db.session)
    return reports_db

@question_router_v2.get(
    "/reports/{id}",
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))],
    response_model=QuestionReportV2Response,
)
async def get_question_report(id:int):
    reports_db = await question_report_service.get_by_field(value=id,field="id",db_session=db.session)
    return reports_db


# @question_router_v2.get(
#     "/{question_id}/reports",
#     dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))],
#     response_model=list[QuestionReportResponse],
# )
# async def get_question_reports(question_id:int):
#     reports_db = await question_report_service.get_q_reports(question_id=question_id,db_session=db.session)
#     return reports_db


@question_router_v2.post("/reports/filters", response_model=list[ReportFiltersResponse])
async def get_user_question_report_filters( report_filters: ReportFilters,
    #   user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    reports_db = await question_report_service.get_user_q_report_v2(
        is_resolved=report_filters.is_resolved,offset=report_filters.offset,limit=report_filters.limit,
        user_id=report_filters.user_id, question_id=report_filters.question_id,
        user_name=report_filters.user_name,user_phno=report_filters.user_phno,reported_date=report_filters.reported_date,
        exam_ids=report_filters.exam_ids,paper_ids=report_filters.paper_ids,subject_ids=report_filters.subject_ids,topic_ids=report_filters.topic_ids,db_session=db.session
    )

    return reports_db


"""
Question routes
"""


# @question_router_v2.put("/{id}", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))])
# async def update_question(id: int, question_update: QuestionUpdateV2):
#     question_db = await question_service.get(id=id,db_session=db.session)
#     if not question_db:
#         raise NotFound()

#     question_update_db = await question_service.update(
#         obj_current=question_db, obj_new=question_update,db_session=db.session
#     )
#     return question_update_db

@question_router_v2.put("/{cms_id}", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))])
async def update_question_by_cms_id(cms_id: int,q_type: QUESTION_TYPE):
    question_db = await question_service.get_questions_by_cms_id_type(cms_id=cms_id,question_type=q_type,db_session=db.session)
    if not question_db:
        raise NotFound()
    cms_q = await fetch_q_by_id(id=cms_id, q_type=q_type)

    if q_type == QUESTION_TYPE.cq:
        cq = cms_q
        cms_id = cq.pop("id")
        cq_qs = cq.pop("questions")
        for q in cq_qs:
            q_num = q.pop("id")
            max_marks_q = q.pop("maxMarks") 
            neg_marks_q = q.pop("negativeMarks")
            question_db = await question_service.get_unique_constraint_q(
                cms_id=cms_id, q_num=q_num, question_type=QUESTION_TYPE.cq,db_session=db.session
            )
            question_in = QuestionCreate(
                **cq,
                **q,
                q_num=q_num,
                cms_id=cms_id,
                question_type=QUESTION_TYPE.cq,
                max_marks=max_marks_q,
                negative_marks=neg_marks_q,
            )

            question_db = await question_service.update(obj_current=question_db,obj_new=question_in.model_dump(),db_session=db.session)
    elif q_type == QUESTION_TYPE.mcq or QUESTION_TYPE.sq:
        q = cms_q
        cms_id = q.pop("id")
        max_marks_q = q.pop("maxMarks") 
        neg_marks_q = q.pop("negativeMarks")
        question_in = QuestionCreate(
                **q,
                max_marks=max_marks_q,
                negative_marks=neg_marks_q,
                cms_id=cms_id,
                question_type=q_type,
            )
        for q in question_db:
            question_db = await question_service.update(obj_current=q,obj_new=question_in.model_dump(),db_session=db.session)
    question_db = await question_service.get_questions_by_cms_id_type(cms_id=cms_id,question_type=q_type,db_session=db.session)
    return question_db


@question_router_v2.get("/{id}", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))])
async def get_question_by_id(id: int):
    question_db = await question_service.get(id=id,db_session=db.session)
    if not question_db:
        raise NotFound()

    return question_db

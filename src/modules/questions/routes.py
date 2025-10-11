from fastapi import APIRouter, Depends
from fastapi.exceptions import RequestValidationError
from fastapi_async_sqlalchemy import db
from .service import *
from .models import Question
from .schemas import *
from src.users.models import User
from src.auth.deps import valid_token_user
from src.auth.security import validate_admin_access
from src.exceptions import NotFound
from src.external.cms.service import strapi, report_q_cms

question_router = APIRouter(prefix="/questions", tags=["Questions"])


question_service = QuestionService(Question, db)
question_report_service = QuestionReportService(QuestionReport, db)


"""
Question reports
"""


@question_router.post("/reports", response_model=QuestionReportResponse)
async def post_report(
    report_in: QuestionReportCreate, user: User = Depends(valid_token_user)
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


@question_router.get(
    "/reports",
    dependencies=[Depends(validate_admin_access)],
    response_model=list[QuestionReportResponse],
)
async def get_all_questions_reports():
    reports_db = await question_report_service.get_multi(db_session=db.session)
    return reports_db


@question_router.get(
    "/{question_id}/reports",
    dependencies=[Depends(validate_admin_access)],
    response_model=list[QuestionReportResponse],
)
async def get_question_reports(question_id: int):
    reports_db = await question_report_service.get_q_reports(question_id=question_id,db_session=db.session)
    return reports_db


@question_router.get("/{question_id}/reports/me", response_model=QuestionReportResponse)
async def get_user_question_report(
    question_id: int, user: User = Depends(valid_token_user)
):
    reports_db = await question_report_service.get_user_q_report(
        user_id=user.id, question_id=question_id,db_session=db.session
    )

    if not reports_db:
        raise NotFound()

    return reports_db


"""
Question routes
"""


@question_router.post("", dependencies=[Depends(valid_token_user)])
async def create_question(question_in: QuestionCreate):
    question_db = await question_service.create(obj_in=question_in,db_session=db.session)

    return question_db


@question_router.put("/{id}", dependencies=[Depends(valid_token_user)])
async def update_question(id: int, question_update: QuestionUpdate):
    question_db = await question_service.get(id=id,db_session=db.session)
    if not question_db:
        raise NotFound()

    question_update_db = await question_service.update(
        obj_current=question_db, obj_new=question_update,db_session=db.session
    )
    return question_update_db


@question_router.get("/{id}", dependencies=[Depends(valid_token_user)])
async def get_question_by_id(id: int):
    question_db = await question_service.get(id=id,db_session=db.session)
    if not question_db:
        raise NotFound()

    return question_db

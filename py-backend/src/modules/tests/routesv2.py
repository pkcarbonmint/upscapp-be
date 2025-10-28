import base64
from datetime import datetime, date
import io
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body, Query
from fastapi.responses import JSONResponse
from fastapi_async_sqlalchemy import db
from jinja2 import Environment, FileSystemLoader
import markdown
from sqlalchemy import delete
from weasyprint import HTML
from src.config import settings
from strapi_client import StrapiClient, process_data, process_response

from src.modules.contentmgnt.deps import markdown_to_docx_parts
from src.modules.products.schemas import QBankType
from src.users.exceptions import QuotaExceed
from .service import (
    TestEvaluationService,
    TestService,
    TestQuestionService,
    TestAttemptService,
    TestQuestionAttemptService,
    TestShareService,
    QuestionFavoriteService,
)
from .models import *
from .schemas import *
from src.users.models import *
from src.users.schemas import USER_ROLE, USER_TYPE, FeatureName, QuotaName
from src.users.deps import CheckQuotaAccess, CheckUserAccess, CheckV2UserAccess
from src.users.service import UserQuotaService, UserService
from src.exceptions import PermissionDenied
from src.modules.questions.models import *
from src.modules.questions.schemas import *
from src.modules.questions.service import *
from src.modules.questions.exceptions import *
from src.modules.questions.routes import question_report_service
from src.auth.deps import valid_token_user, valid_token_user_admin
from src.auth.security import validate_admin_access
from src.external.cms.service import *
from .exceptions import *
from .utils import (
    create_test_mains_qs,
    process_question_attempt_mains,
    process_test_submit,
    process_question_attempt,
    evaluate_mcq_attempt,
    add_test_questions,
    get_paper_subj_topic_used_qs,
    create_test_qs,
)
from src.modules.teaching.routes import studyplan_service
from src.auth.exceptions import AuthorizationFailed, NotFound
from src.modules.notifications.utils import send_admin_tests_topic_notifications
from docxtpl import DocxTemplate


test_service = TestService(Test, db)
test_question_service = TestQuestionService(TestQuestion, db)
test_attempt_service = TestAttemptService(TestAttempt, db)
tq_attempt_service = TestQuestionAttemptService(TestQuestionAttempt, db)
test_eval_service = TestEvaluationService(TestEvaluation,db)
test_share_service = TestShareService(TestShare, db)
question_service = QuestionService(Question, db)
user_quota_service = UserQuotaService(UserQuota, db)
favorite_q_service = QuestionFavoriteService(QuestionFavorite, db)
user_service = UserService(User, db)

token = settings.CMS_API_KEY
cms_base_url = settings.CMS_BASE_URL
strapi = StrapiClient(baseurl=cms_base_url)
strapi._token = token

"""
Test routes
"""
test_router_v2 = APIRouter(prefix="/v2/tests", tags=["Tests V2"])


@test_router_v2.post("/prelims",response_model=TestResponse )
async def create_test(
    *,
    user: User = Depends(CheckQuotaAccess()),
    test_in: TestCreate,
):
    # check feature and quota access
    feature_name = FeatureName.prelims
    quota_source = await CheckQuotaAccess.check_subs_prod_quota(
        db_session=db.session,
        feature_name=feature_name,
        quota_name=QuotaName.test_create,
        qbank_type= QBankType.prelims,
        user=user,
    )
    # if not is_check:
    #     raise PermissionDenied()

    test_qs = await create_test_qs(test_in=test_in, user=user, db_session=db.session)  ## gets_test_qs
   
    total_qs = test_qs["total_qs"]
    cq_count = test_qs["cq_count"]
    context_questions = test_qs["context_qs"]
    total_q_count = cq_count + len(total_qs)
    if total_q_count < 5:
        raise NotEnoughQuestions()
    test_db = await test_service.create(obj_in=test_in,db_session=db.session)
    
    if quota_source["source"] == "subscription":
        user_dict = user.__dict__
        subs_dict = (user_dict["subscription"]).__dict__
        plans_dict = (subs_dict["plan"]).__dict__
        user_quota_in = UserQuota(
            user_id=user.id,
            subscription_id=user.subscription_id,
            quota_name=QuotaName.test_create,
            feature_name=feature_name,
            plan_name=plans_dict["name"],
            plan_id=plans_dict["id"],
        )
        # update quota
        user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)
    elif quota_source["source"] == "product":
        user_quota_in = UserQuota(
            user_id=user.id,
            quota_name=QuotaName.test_create,
            purchase_id = quota_source["purchase_id"],
            product_id = quota_source["product_id"]
            
        )
        # update quota
        user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)
        

    # test update fields calculated
    max_duration = test_in.paper.duration * (
        (len(total_qs) + cq_count) / test_in.paper.number_of_questions
    )
    duration_per_q = max_duration / (len(total_qs) + cq_count)
    max_marks = 0

    # add questions
    if (
        (not test_in.is_full_length)
        and (test_in.question_mode != TEST_SELECT_Q_MODE.all)  ## for qs from db
        and (test_in.question_mode != TEST_SELECT_Q_MODE.unused)
    ):
        for q in total_qs:
            cms_id = q.cms_id
            max_marks_q = q.max_marks or test_in.paper.max_marks_per_question
            neg_marks_q = q.negative_marks or test_in.paper.negative_marks_per_question
            max_marks += max_marks_q
            if not  q.context:
                cms_qs_db = await question_service.get_questions_by_cms_id_type(
                    # value=cms_id, field="cms_id"
                    cms_id=cms_id,
                    question_type=QUESTION_TYPE.mcq,db_session=db.session
                )
            else:
                cms_qs_db = await question_service.get_unique_constraint_q(
                    cms_id=cms_id, q_num=q.q_num, question_type=QUESTION_TYPE.cq,db_session=db.session
                )
            if not q.context:
                question_db = len(cms_qs_db) > 0 and cms_qs_db[0]
            else:
                question_db = cms_qs_db  

            if not question_db:
                question_in = QuestionCreate(
                    question=q.question,
                    source=q.source,
                    options=q.options,
                    explanation=q.explanation,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    q_num=q.q_num,
                    exam=q.exam,
                    paper=q.paper,
                    subject=q.subject,
                    topic=q.topic,
                    is_multi=q.is_multi,
                    question_form=q.question_form,
                    model_solution=q.model_solution,
                    context=q.context,
                    category=q.category,
                    difficulty_level=q.difficulty_level,
                    reference_material=q.reference_material,
                    publishing_status=q.publishing_status,
                    is_private=q.is_private,
                    is_deleted=q.is_deleted,
                    is_current_affairs=q.is_current_affairs,
                    current_affairs_topic=q.current_affairs_topic,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.cq if q.context else QUESTION_TYPE.mcq,
                )

                question_db = await question_service.create(obj_in=question_in,db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
            else:
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
    else:
        for q in total_qs:
            cms_id = q.pop("id")
            max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
            neg_marks_q = (
                q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
            )

            max_marks += max_marks_q

            cms_qs_db = await question_service.get_questions_by_cms_id_type(
                # value=cms_id, field="cms_id"
                cms_id=cms_id,
                question_type=QUESTION_TYPE.mcq,db_session=db.session
            )
            question_db = len(cms_qs_db) > 0 and cms_qs_db[0]

            if not question_db:
                question_in = QuestionCreate(
                    **q,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.mcq,
                )

                question_db = await question_service.create(obj_in=question_in,db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
            else:
                question_in = QuestionCreate(
                    **q,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.mcq,
                )

                question_db = await question_service.update(obj_current=question_db,obj_new=question_in.model_dump(),db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)

    # add context questions
    if cq_count > 0: # only used for all and unused so cq will be only from cms
        for cq in context_questions:
            cms_id = cq.pop("id")
            cq_qs = cq.pop("questions")
            for q in cq_qs:
                q_num = q.pop("id")
                max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
                neg_marks_q = (
                    q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
                )
                max_marks += max_marks_q
                question_db = await question_service.get_unique_constraint_q(
                    cms_id=cms_id, q_num=q_num, question_type=QUESTION_TYPE.cq,db_session=db.session
                )
                if not question_db:
                    question_in = QuestionCreate(
                        **cq,
                        **q,
                        q_num=q_num,
                        cms_id=cms_id,
                        question_type=QUESTION_TYPE.cq,
                        tenant_id=user.tenant_id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                    )

                    question_db = await question_service.create(obj_in=question_in,db_session=db.session)

                    tq_in = TestQuestionCreate(
                        test_id=test_db.id,
                        question_id=question_db.id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        duration=duration_per_q,
                    )

                    test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
                else:
                    question_in = QuestionCreate(
                        **cq,
                        **q,
                        q_num=q_num,
                        cms_id=cms_id,
                        question_type=QUESTION_TYPE.cq,
                        tenant_id=user.tenant_id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                    )

                    question_db = await question_service.update(obj_current=question_db,obj_new=question_in.model_dump(),db_session=db.session)

                    tq_in = TestQuestionCreate(
                        test_id=test_db.id,
                        question_id=question_db.id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        duration=duration_per_q,
                    )

                    test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)

    # update test with details
    test_update = test_db

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.tenant_id = user.tenant_id
    test_update.test_status = TEST_STATUS.ready
    test_update.questions_count = len(total_qs) + cq_count
    test_update.is_recommended = False
    test_update.created_by_id = user.id

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)
   
    return test_update_db


@test_router_v2.post("/mains", response_model=TestResponse)
async def create_custom_mains_test(test_in: TestCreateMains,is_qbank_create:bool | None = None, user: User = Depends(CheckUserAccess())):
    if not is_qbank_create:
        raise HTTPException(
            status_code=403,
            detail="Test cannot be created. Please buy product to create test"
        )
    if is_qbank_create:
        try:
            quota_info = await CheckV2UserAccess.check_prod_quota(
                db_session=db.session,
                quota_name=QuotaName.test_create,
                qbank_type = QBankType.mains ,
                user=user,
            )
            # quota_info will have product_id and purchase_id
            print("Quota OK from:", quota_info)

        except QuotaExceed:
            raise QuotaExceed()
    test_qs = await create_test_mains_qs(test_in=test_in,user=user,db_session=db.session)
    total_qs = test_qs["total_qs"]
    if len(total_qs) < 5:
        raise NotEnoughQuestions()
    test_db = await test_service.create(obj_in=test_in,db_session=db.session)
    max_duration = test_in.paper.duration * (
        (len(total_qs) ) / test_in.paper.number_of_questions
    )
    duration_per_q = max_duration / (len(total_qs))
    max_marks = 0
    if (
        (test_in.question_mode != TEST_SELECT_Q_MODE.all)  ## for qs from db
        and (test_in.question_mode != TEST_SELECT_Q_MODE.unused)
    ):
        for q in total_qs:
            cms_id = q.cms_id
            max_marks_q = q.max_marks or test_in.paper.max_marks_per_question
            neg_marks_q = q.negative_marks or test_in.paper.negative_marks_per_question
            max_marks += max_marks_q
            cms_qs_db = await question_service.get_questions_by_cms_id_type(
                    # value=cms_id, field="cms_id"
                    cms_id=cms_id,
                    question_type=QUESTION_TYPE.sq,db_session=db.session
                )
            question_db = cms_qs_db[0]
            # if not  q.context:
            #     cms_qs_db = await question_service.get_questions_by_cms_id_type(
            #         # value=cms_id, field="cms_id"
            #         cms_id=cms_id,
            #         question_type=QUESTION_TYPE.sq,db_session=db.session
            #     )
            # else:
            #     cms_qs_db = await question_service.get_unique_constraint_q(
            #         cms_id=cms_id, q_num=q.q_num, question_type=QUESTION_TYPE.sq,db_session=db.session
            #     )
            # if not q.context:
            #     question_db = len(cms_qs_db) > 0 and cms_qs_db[0]
            # else:
            #     question_db = cms_qs_db  

            if not question_db:
                question_in = QuestionCreate(
                    question=q.question,
                    source=q.source,
                    options=q.options,
                    explanation=q.explanation,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    q_num=q.q_num,
                    exam=q.exam,
                    paper=q.paper,
                    subject=q.subject,
                    topic=q.topic,
                    is_multi=q.is_multi,
                    question_form=q.question_form,
                    model_solution=q.model_solution,
                    category=q.category,
                    context=q.context,
                    difficulty_level=q.difficulty_level,
                    reference_material=q.reference_material,
                    publishing_status=q.publishing_status,
                    is_private=q.is_private,
                    is_deleted=q.is_deleted,
                    is_current_affairs=q.is_current_affairs,
                    current_affairs_topic=q.current_affairs_topic,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.sq,
                )

                question_db = await question_service.create(obj_in=question_in,db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
            else:
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
    else:
        for q in total_qs:
            cms_id = q.pop("id")
            max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
            neg_marks_q = (
                q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
            )

            max_marks += max_marks_q

            cms_qs_db = await question_service.get_questions_by_cms_id_type(
                # value=cms_id, field="cms_id"
                cms_id=cms_id,
                question_type=QUESTION_TYPE.sq,db_session=db.session
            )
            question_db = len(cms_qs_db) > 0 and cms_qs_db[0]

            if not question_db:
                question_in = QuestionCreate(
                    **q,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.sq,
                )

                question_db = await question_service.create(obj_in=question_in,db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)
            else:
                question_in = QuestionCreate(
                    **q,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    cms_id=cms_id,
                    tenant_id=user.tenant_id,
                    question_type=QUESTION_TYPE.sq,
                )

                question_db = await question_service.update(obj_current=question_db,obj_new=question_in.model_dump(),db_session=db.session)
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                    duration=duration_per_q,
                )

                test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)

    # update test with details
    test_update = test_db

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.tenant_id = user.tenant_id
    test_update.test_status = TEST_STATUS.ready
    test_update.questions_count = len(total_qs)
    test_update.created_by_id = user.id

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)
    if is_qbank_create:
        
        user_quota_in = UserQuota(
            user_id=user.id,
            quota_name=QuotaName.test_create,
            purchase_id = quota_info["purchase_id"],
            product_id = quota_info["product_id"]
        )
        user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)
        
    return test_update_db

@test_router_v2.put(
    "/mains/customized/status", response_model=list[TestCustomResponse]
)
async def get_custom_tests_by_status(test_in:TestCustomByStatus,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    tests = await test_attempt_service.get_mains_tests_by_status(user_id=current_user.id,paper_ids=test_in.paper_ids,subject_ids=test_in.subject_ids,topic_ids=test_in.topic_ids,
                                                                 is_evaluated=test_in.is_evaluated,test_attempt_mode=test_in.test_attempt_mode,offset=test_in.offset,limit=test_in.limit,status=test_in.status,db_session=db.session)
    return tests

@test_router_v2.put(
    "/mains/customized/new", response_model=list[TestV2Response]
)
async def get_custom_new_tests(test_in:TestNewCustom,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tests = await test_attempt_service.get_unattempted_customized_users_mains_tests_by_status(user_id=current_user.id,paper_ids=test_in.paper_ids,subject_ids=test_in.subject_ids,topic_ids=test_in.topic_ids,offset=test_in.offset,limit=test_in.limit,db_session=db.session)
    return tests

@test_router_v2.put(
    "/prelims/customized/status", response_model=list[TestCustomResponse]
)
async def get_custom_tests_by_status(test_in:TestCustomByStatus,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    tests = await test_attempt_service.get_prelims_tests_by_status(user_id=current_user.id,paper_ids=test_in.paper_ids,subject_ids=test_in.subject_ids,topic_ids=test_in.topic_ids,
                                                                 is_evaluated=test_in.is_evaluated,test_attempt_mode=test_in.test_attempt_mode,offset=test_in.offset,limit=test_in.limit,status=test_in.status,db_session=db.session)
    return tests

@test_router_v2.put(
    "/prelims/customized/new", response_model=list[TestV2Response]
)
async def get_custom_new_tests(test_in:TestNewCustom,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tests = await test_attempt_service.get_unattempted_customized_users_prelims_tests_by_status(user_id=current_user.id,paper_ids=test_in.paper_ids,subject_ids=test_in.subject_ids,topic_ids=test_in.topic_ids,offset=test_in.offset,limit=test_in.limit,db_session=db.session)
    return tests

@test_router_v2.post("/prelims/totd", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_todays_tests(
    stage_ids: list[int], paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None, current_user: User = Depends(valid_token_user)
):
    tests = await test_service.get_prelims_totd_tests(
        tenant_id=current_user.tenant_id, stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids,db_session=db.session
    )
    
    return tests

@test_router_v2.post("/prelims/pyq", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_pyq_tests(stage_ids: list[int], paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,current_user: User = Depends(valid_token_user)):
    tests = await test_service.get_prelims_pyq_tests(
        tenant_id=current_user.tenant_id, stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids,db_session=db.session
    )
    return tests

@test_router_v2.post("/prelims/model", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_model_tests(
    stage_ids: list[int],paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None, current_user: User = Depends(valid_token_user)
):
    tests = await test_service.get_prelims_model_tests(
        stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids, tenant_id=current_user.tenant_id,db_session=db.session
    )
    return tests

@test_router_v2.post("/prelims/recommended/all", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_all_recommended_tests(
    stage_ids: list[int],paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
    current_user: User = Depends(valid_token_user),

):
    tests = await test_service.get_prelims_recommended_all(
        stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids, tenant_id=current_user.tenant_id, db_session=db.session
    )

    return tests

@test_router_v2.post("/prelims/recommended", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_unattempted_recommended_tests(
    stage_ids: list[int],
    current_user: User = Depends(valid_token_user),
):
    
    tests = await test_service.get_prelims_unattempted_recommended_tests(
       stage_ids=stage_ids,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        db_session=db.session,
    )
    resp = [{**item._asdict()} for item in tests]

    return resp


@test_router_v2.get("/admin/all", response_model=list[TestV2Response])
async def get_tenant_tests(offset:int = 0, limit:int = 10,
                            test_title: str | None = None,
                            exam_id: int | None = None,
                            stage_id: int | None = None,
                            paper_id: int | None = None,
                            subject_id: int | None = None,
                            topic_id: str | None = None,
                            questions: int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    tests = await test_service.get_admin_tests_all_v2(tenant_id=current_user.tenant_id,
                                                      exam_id=exam_id,test_title=test_title,stage_id=stage_id,paper_id=paper_id,subject_id=subject_id,topic_id=topic_id,questions=questions,offset=offset,limit=limit,db_session=db.session)

    return tests

@test_router_v2.get("/admin/prelims", response_model=list[TestV2Response])
async def get_admin_prelims_tests(offset:int = 0, limit:int = 10,
                            test_title: str | None = None,
                            # exam_id: int | None = None,
                            # stage_id: int | None = None,
                            paper_id: int | None = None,
                            subject_id: int | None = None,
                            topic_id: str | None = None,
                            questions: int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    tests = await test_service.get_prelims_admin_tests(tenant_id=current_user.tenant_id,
                                                     test_title=test_title,paper_id=paper_id,subject_id=subject_id,topic_id=topic_id,questions=questions,offset=offset,limit=limit,db_session=db.session)

    return tests

@test_router_v2.get("/admin/mains", response_model=list[TestV2Response])
async def get_admin_mains_tests(offset:int = 0, limit:int = 10,
                            test_title: str | None = None,
                            # exam_id: int | None = None,
                            # stage_id: int | None = None,
                            paper_id: int | None = None,
                            subject_id: int | None = None,
                            topic_id: str | None = None,
                            questions: int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    tests = await test_service.get_mains_admin_tests(tenant_id=current_user.tenant_id,
                                                      test_title=test_title,paper_id=paper_id,subject_id=subject_id,topic_id=topic_id,questions=questions,offset=offset,limit=limit,db_session=db.session)

    return tests

@test_router_v2.post("/curate", response_model=TestResponse) # pyq
async def create_curated_test( *,
    test_in: TestCurate,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce])),bckgrnd_tasks: BackgroundTasks):
    # create test with test_in info
    test_db = await test_service.create(obj_in=TestCreate(**test_in.model_dump()),db_session=db.session)
    added_max_marks: float = 0.0
    added_q_count: int = 0
    if test_in.questions and len(test_in.questions) > 0:
        duration_per_q = test_in.paper.duration / test_in.paper.number_of_questions

        # process and add test questions
        added_max_marks, added_q_count = await add_test_questions(
            current_user=current_user,
            test_db=test_db,
            questions_in=test_in.questions,
            max_marks_per_q=test_in.paper.max_marks_per_question,
            neg_marks_per_q=test_in.paper.negative_marks_per_question,
            duration_per_q=duration_per_q, db_session=db.session
        )

    # update test with details
    test_update = test_db

    total_qs = (
        added_q_count + test_db.questions_count
        if test_db.questions_count
        else added_q_count
    )
    max_duration = duration_per_q * total_qs
    max_marks = (
        added_max_marks + test_db.max_marks if test_db.max_marks else added_max_marks
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs
    test_update.is_recommended = True
    test_update.created_by_id = current_user.id
    test_update.tenant_id = current_user.tenant_id
    if test_update.test_type == TEST_TYPE.pyq:
        test_update.test_status = TEST_STATUS.ready


    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)
    bckgrnd_tasks.add_task(
        send_admin_tests_topic_notifications,topic = settings.PUSH_NOTIFICATIONS_TOPIC, test_id=test_update_db.id,notify_type= "NEW_RECOMMENDED_TEST"
    )

    return test_update_db

@test_router_v2.post("/curate/prelims", response_model=TestResponse)
async def create_curate_prelims_test(
    test_in: TestCurateCreate,  current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    # create test with test_in info
    test_db = await test_service.create(obj_in=TestCreate(**test_in.model_dump()),db_session=db.session)
    added_max_marks: float = 0.0
    added_q_count: int = 0
    duration_per_q: float = 0.0
    if test_in.questions and len(test_in.questions) > 0:
        duration_per_q = test_in.paper.duration / test_in.paper.number_of_questions

        # process and add test questions
        # added_max_marks, added_q_count = await add_test_questions(
        #     current_user=current_user,
        #     test_db=test_db,
        #     questions_in=test_in.questions,
        #     max_marks_per_q=test_in.paper.max_marks_per_question,
        #     neg_marks_per_q=test_in.paper.negative_marks_per_question,
        #     duration_per_q=duration_per_q,
        # )

    # update test with details
    test_update = test_db

    total_qs = (
        added_q_count + test_db.questions_count
        if test_db.questions_count
        else added_q_count
    )
    max_duration = duration_per_q * total_qs
    max_marks = (
        added_max_marks + test_db.max_marks if test_db.max_marks else added_max_marks
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs
    test_update.is_recommended = True
    test_update.created_by_id = current_user.id
    test_update.tenant_id = current_user.tenant_id
    if test_in.is_daily_test == True:
        test_update.daily_test_date = test_in.daily_test_date
        test_update.is_daily_test = True

    else:
        test_update.daily_test_date = None
    

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)

    return test_update_db

@test_router_v2.put("/curate/{test_id}/prelims", response_model=TestResponse)
async def update_curate_test(test_id: int, test_in: TestCurateUpdate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    
    if not test_db:
        raise TestNotFound()
    
    updated_test = await test_service.update(obj_current=test_db, obj_new=
                                             {"subjects":[subject.__dict__ for subject in test_in.subjects] if (test_in.subjects and len(test_in.subjects)>0) or (test_in.subjects is not None) else None,
                                              "topics":[topic.to_dict() for topic in test_in.topics] if  (test_in.topics and len(test_in.topics) > 0) or (test_in.topics is not None) else None},db_session=db.session)
   
    added_max_marks: float = 0.0
    added_q_count: int = 0
    if test_in.questions and len(test_in.questions) > 0:
        duration_per_q = test_in.paper.duration / test_in.paper.number_of_questions

        # process and add test questions
        added_max_marks, added_q_count = await add_test_questions(
            current_user=current_user,
            test_db=updated_test,
            questions_in=test_in.questions,
            max_marks_per_q=test_in.paper.max_marks_per_question,
            neg_marks_per_q=test_in.paper.negative_marks_per_question,
            duration_per_q=duration_per_q,db_session=db.session
        )

    # update test with details
    test_update: Test = updated_test
    total_qs = (
        added_q_count + test_db.questions_count
        if test_db.questions_count
        else added_q_count
    )
    max_duration = duration_per_q * total_qs
    max_marks = (
        added_max_marks + test_db.max_marks if test_db.max_marks else added_max_marks
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs
    test_update.is_recommended = True
    test_update.created_by_id = current_user.id
    test_update.tenant_id = current_user.tenant_id
    if test_in.is_daily_test == True:
        test_update.daily_test_date = test_in.daily_test_date
        test_update.is_daily_test = True

    else:
        test_update.daily_test_date = None

    test_update_db = await test_service.update(obj_current=updated_test, obj_new=test_update,db_session=db.session)

    return test_update_db

@test_router_v2.post("/curate/mains", response_model=TestResponse) # pyq
async def create_curated_test( *,
    test_in: TestCurateMains,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce])),bckgrnd_tasks: BackgroundTasks):
    # create test with test_in info
    test_db = await test_service.create(obj_in=TestCreate(**test_in.model_dump()),db_session=db.session)
    added_max_marks: float = 0.0
    added_q_count: int = 0
    if test_in.questions and len(test_in.questions) > 0:
        duration_per_q = test_in.paper.duration / test_in.paper.number_of_questions

        # process and add test questions
        added_max_marks, added_q_count = await add_test_questions(
            current_user=current_user,
            test_db=test_db,
            questions_in=test_in.questions,
            max_marks_per_q=test_in.paper.max_marks_per_question,
            neg_marks_per_q=test_in.paper.negative_marks_per_question,
            duration_per_q=duration_per_q, db_session=db.session
        )

    # update test with details
    test_update = test_db

    total_qs = (
        added_q_count + test_db.questions_count
        if test_db.questions_count
        else added_q_count
    )
    max_duration = duration_per_q * total_qs
    max_marks = (
        added_max_marks + test_db.max_marks if test_db.max_marks else added_max_marks
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs
    test_update.is_recommended = True
    test_update.created_by_id = current_user.id
    test_update.tenant_id = current_user.tenant_id
    if test_in.is_daily_test == True:
        test_update.daily_test_date = test_in.daily_test_date
        test_update.is_daily_test = True

    else:
        test_update.daily_test_date = None
    if test_update.test_type == TEST_TYPE.pyq:
        test_update.test_status = TEST_STATUS.ready
    else:
         test_update.test_status = TEST_STATUS.pending


    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)
    if test_update.test_type == TEST_TYPE.pyq:
        bckgrnd_tasks.add_task(
            send_admin_tests_topic_notifications,topic = settings.PUSH_NOTIFICATIONS_TOPIC, test_id=test_update_db.id,notify_type= "NEW_RECOMMENDED_TEST"
        )

    return test_update_db

@test_router_v2.post(
    "/curate/{test_id}/questions", response_model=list[TestQuestionResponse]
)
async def add_curated_questions(
    test_id: int,
    questions_in: list[CuratedQuestion],  # cms question id
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    test_db = await test_service.get(id=test_id,db_session=db.session)

    if not test_db:
        raise TestNotFound()

    duration_per_q = (
        test_db.max_duration / test_db.questions_count
        if test_db.questions_count
        else test_db.paper["duration"] / test_db.paper["number_of_questions"]
    )

    # process and add test questions
    added_max_marks, added_q_count = await add_test_questions(
        current_user=current_user,
        test_db=test_db,
        questions_in=questions_in,
        max_marks_per_q=test_db.paper["max_marks_per_question"],
        neg_marks_per_q=test_db.paper["negative_marks_per_question"],
        duration_per_q=duration_per_q, db_session=db.session
    )

    # update test with details
    test_update = test_db

    total_qs = (
        added_q_count + test_db.questions_count
        if test_db.questions_count
        else added_q_count
    )
    max_duration = duration_per_q * total_qs
    max_marks = (
        added_max_marks + test_db.max_marks if test_db.max_marks else added_max_marks
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)

    t_questions = test_update_db.questions

    return t_questions

@test_router_v2.delete("/curate/{test_id}/questions/{q_id}")
async def delete_curated_questions(
    test_id: int,
    q_id: int,  # test question id
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    tq = await test_question_service.get_test_question(test_id=test_id, q_id=q_id,db_session=db.session)

    # if not test_db:
    #     raise TestNotFound()

    # process and delete test question
    if tq is None:
        QuestionNotFound()
    tq_delete = await test_question_service.delete_test_question(
        test_id=test_id, q_id=q_id, db_session=db.session
    )
    test_db = await test_service.get(id=test_id,db_session=db.session)
    duration_per_q = (
        test_db.max_duration / test_db.questions_count
        if test_db.questions_count
        else test_db.paper["duration"] / test_db.paper["number_of_questions"]
    )

    # update test with details
    test_update = test_db

    total_qs = test_db.questions_count - 1 if test_db.questions_count else 0
    max_duration = duration_per_q * total_qs
    max_marks = (
        test_db.max_marks - tq.max_marks
        if tq.max_marks
        else test_db.paper["max_marks_per_question"]
    )

    test_update.max_duration = max_duration
    test_update.max_marks = max_marks
    test_update.questions_count = total_qs

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)

    return test_update_db

@test_router_v2.put("/curate/{test_id}/questions")
async def save_curated_questions_order(
    test_id: int,
    ordered_q_ids: list[int],  # question_id from testquestions
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    test_db = await test_service.get(id=test_id,db_session=db.session)

    if not test_db:
        raise TestNotFound()

    # process and update test questions
    tqs = await test_question_service.get_tq_curate(test_id=test_id,db_session=db.session)
    for tq in tqs:
        if tq.question_id in ordered_q_ids:
            tq_order = ordered_q_ids.index(tq.question_id)
            tq_db_updated = await test_question_service.update(
                obj_current=tq, obj_new={"tq_order": tq_order},db_session=db.session
            )
    tqs_updated = await test_question_service.get_tq_curate(test_id=test_id,db_session=db.session)

    return tqs_updated

@test_router_v2.put("/curate/{test_id}/publish")
async def publish_curated_test(
    test_id: int,bckgrnd_tasks: BackgroundTasks,
    ordered_q_ids: list[int],  # question_id from testquestions
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    test_db = await test_service.get(id=test_id,db_session=db.session)

    if not test_db:
        raise TestNotFound()

    # process and update test questions
    tqs = await test_question_service.get_tq_curate(test_id=test_id,db_session=db.session)
    for tq in tqs:
        if tq.question_id in ordered_q_ids:
            tq_order = ordered_q_ids.index(tq.question_id) + 1
            tq_db_updated = await test_question_service.update(
                obj_current=tq, obj_new={"tq_order": tq_order},db_session=db.session
            )

    # update test status
    test_update = test_db

    test_update.test_status = TEST_STATUS.ready

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)

    bckgrnd_tasks.add_task(
        send_admin_tests_topic_notifications,topic = settings.PUSH_NOTIFICATIONS_TOPIC, test_id=test_update_db.id,notify_type= "NEW_RECOMMENDED_TEST"
    )


    return test_update_db

@test_router_v2.put("/{id}/status", response_model=TestResponse)
async def update_active_status(
    id: int,
    is_active: bool,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))
):
    db_obj = await test_service.get(id=id,db_session=db.session)
    if not db_obj:
        raise NotFound()
    if db_obj.created_by_id != current_user.id:
        raise AuthorizationFailed()

    db_obj_new = await test_service.update(
        obj_current=db_obj, obj_new={"is_active": is_active},db_session=db.session
    )

    return db_obj_new

@test_router_v2.get("/totd/{test_date}/{paper_id}")
async def get_test(test_date: date, paper_id:int, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    tests = await test_service.get_totds_by_date(paper_id = paper_id,test_date=test_date,db_session=db.session)
    resp = [{**item._asdict()} for item in tests]
    return resp

@test_router_v2.get("/{test_id}/questions")
async def get_test_questions(test_id: int, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    if not test_db:
        raise TestNotFound()

    qs_db = await test_question_service.get_by_filters_multi(filters={"test_id":test_id},db_session= db.session)

    return qs_db


@test_router_v2.get(
    "/sizes/options",
    response_model=list[int],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))],
)
async def get_test_size_options(paper_id: int):
    response = await strapi.get_entry("papers", document_id=paper_id)
    paper = process_data(entry=response)
    total_num = paper["numberOfQuestions"]
    current_num = 5
    size_options = []
    while current_num < total_num:
        size_options.append(current_num)
        current_num *= 2
    size_options.append(total_num)
    return size_options

@test_router_v2.post("/question/modes")
async def get_question_mode(
    paper_id: int,
    subject_ids: list[int] | None = [],
    topic_ids: list[int] | None = [],
    category: CATEGORY | None = None, is_external: bool | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    cms_q_count = await get_q_count_by_filter(
        tenant_id=current_user.tenant_id,
        paper_id=paper_id,
        subject_ids=subject_ids,
        topic_ids=topic_ids,
        category=category,
        is_external=is_external,
        

    )
   
    used_qs = await test_attempt_service.get_used_qs_count(
        paper_id=paper_id,
        user_id=current_user.id,
        subject_ids=subject_ids,
        topic_ids=topic_ids,db_session=db.session
    )
    unused_qs = cms_q_count - used_qs
    qs_ans_report = await tq_attempt_service.calc_tq_answered(
        subject_ids=subject_ids,
        paper_id=paper_id,
        user_id=current_user.id,
        topic_ids=topic_ids,db_session=db.session
    )
    fav_qs = await favorite_q_service.get_fav_qs_count_by_filter(
        user_id=current_user.id,
        paper_id=paper_id,
        subject_ids=subject_ids,
        topic_ids=topic_ids,db_session=db.session
    )
    response = {
        "all": cms_q_count,
        "unused_qs": unused_qs,
        "used_qs": used_qs,
        "correct": qs_ans_report["correct_attempts_count"],
        "incorrect": qs_ans_report["incorrect_attempts_count"],
        "ommitted": used_qs - qs_ans_report["attempts_count"],
        "fav_count": fav_qs,
    }
    return response

@test_router_v2.post("/currentaffairs/q/modes")
async def get_curr_aff_q_mode(
    paper_id: int,
    topic_ids: list[int] | None = [],
    category: CATEGORY | None = None, is_external: bool | None = None,
   current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    qs = await fetch_current_affairs_qs_with_category(
        q_type=QUESTION_TYPE.mcq,
        tenant_id=current_user.tenant_id,
        exam_id=settings.EXAM_ID,
        paper_id=paper_id,
        topic_ids=topic_ids,
        category=category,
        is_external=is_external
    )
    cms_q_count = len(qs)

    # unused
    used_q_count = await test_attempt_service.get_ca_used_qs_count(
        paper_id=paper_id, user_id=current_user.id, topic_ids= topic_ids,db_session=db.session
    )
    unused_q_count = cms_q_count - used_q_count
    # used_q - corr,incorr,omi,fav
    qs_ans_report = await tq_attempt_service.calc_ca_tq_answered(
        paper_id=paper_id,
        user_id=current_user.id,
        topic_ids=topic_ids,db_session=db.session
    )
    fav_qs = await favorite_q_service.get_ca_fav_qs_count(
        user_id=current_user.id,
        paper_id=paper_id,
        topic_ids=topic_ids,db_session=db.session
    )
    response = {
        "all": cms_q_count,
        "unused_qs": unused_q_count,
        "used_qs": used_q_count,
        "correct": qs_ans_report["correct_attempts_count"],
        "incorrect": qs_ans_report["incorrect_attempts_count"],
        "ommitted": (used_q_count if used_q_count else 0)
        - (
            (qs_ans_report["correct_attempts_count"]if qs_ans_report["correct_attempts_count"] else 0)
            + (qs_ans_report["incorrect_attempts_count"] if qs_ans_report["incorrect_attempts_count"] else 0)
        ),
        "fav_count": fav_qs,
    }
    return response

@test_router_v2.put("/taken")
async def all_tests_taken(*,stage_ids:list[int],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    ta_count = await test_attempt_service.calc_test_attempts_by_stages(user_id=current_user.id,stage_ids=stage_ids,db_session=db.session)
    return ta_count

@test_router_v2.post("/me")
async def get_test_created_by_me_count(
    stage_ids:list[int],
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
):
    # my_tests = await test_service.get_by_field_multi(
    #     value=current_user.id, field="created_by_id"
    # )
    my_tests = await test_service.get_test_created_by_stages(
        user_id=current_user.id, tenant_id=current_user.tenant_id, stage_ids=stage_ids,db_session=db.session
    )

    return my_tests

# @test_router_v2.post("/prelims/me")
# async def get_test_created_by_me_count(
#     paper_ids:list[int],
#     current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
# ):
#     # my_tests = await test_service.get_by_field_multi(
#     #     value=current_user.id, field="created_by_id"
#     # )
#     my_tests = await test_service.get_test_created_by_papers(
#         user_id=current_user.id, tenant_id=current_user.tenant_id, paper_ids=paper_ids,db_session=db.session
#     )

#     return my_tests

@test_router_v2.post("/prelims/ongoing", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))],response_model=list[TestAttempV2tResponse])
async def get_ongoing_tests(
        stage_ids: list[int], test_type: str,paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
        current_user: User = Depends(valid_token_user),
):
    tests = await test_attempt_service.get_ongoing_tests_by_testtype(
        user_id=current_user.id, stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids,test_type=test_type,db_session=db.session
    )
    # resp = [{**item._asdict()} for item in tests]
    return tests

@test_router_v2.post("/prelims/completed", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))],response_model=list[TestAttempV2tResponse])
async def get_completed_tests(
    stage_ids: list[int],
    test_type: str,
    paper_ids: list[int] | None = None,
        subject_ids: list[int] | None = None,
        topic_ids: list[int] | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    tests = await test_attempt_service.get_completed_tests_by_testtype(
        user_id=current_user.id, stage_ids=stage_ids,paper_ids=paper_ids,subject_ids=subject_ids,topic_ids=topic_ids,test_type=test_type,db_session=db.session
    )
    # resp = [{**item._asdict()} for item in tests]
    return tests

@test_router_v2.put("/questions/used/paper")
async def get_used_qs_by_subj(
    paper_ids: list[int],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
):
    resp = await tq_attempt_service.get_used_q_count_by_subj_for_papers(
        paper_ids=paper_ids, user_id=current_user.id,db_session=db.session
    )
    results = [{**item._asdict()} for item in resp]
    return results

@test_router_v2.put("/questions/used/stage")
async def get_used_qs_by_subj(
    stage_ids: list[int],category: CATEGORY | None = None, is_external: bool | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
):
    resp = await tq_attempt_service.get_used_q_count_by_subj_stages_filter(
        stage_ids=stage_ids, user_id=current_user.id,db_session=db.session
    )
    results = [{**item._asdict()} for item in resp]

    used_qs = await test_attempt_service.get_used_qs_count_by_stage_mode(
        stage_ids=stage_ids,
        user_id=current_user.id,db_session=db.session
    )
    used_qs = [{**item._asdict()} for item in used_qs]
    sq_count = await get_stage_q_count(
        q_type="SQ", tenant_id=current_user.tenant_id, stage_ids=stage_ids,category=category,
        is_external=is_external
    )
    mcq_count = await get_stage_q_count(
        q_type="MCQ", tenant_id=current_user.tenant_id, stage_ids=stage_ids,category=category,
        is_external=is_external
    )
    cq_count = await get_stage_q_count(
        q_type="CQ", tenant_id=current_user.tenant_id, stage_ids=stage_ids,category=category,
        is_external=is_external
    )
    cms_q_count = sq_count + mcq_count + cq_count
    unused_tutor_qs = cms_q_count - next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'TUTOR'), 0)
    unused_exam_qs = cms_q_count - next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'EXAM'), 0)
    qs_report = {
        "used_exam_qs": next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'EXAM'), 0),
        "unused_exam_qs": unused_exam_qs,
        "used_tutor_qs": next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'TUTOR'), 0),
        "unused_tutor_exam": unused_tutor_qs,
    }
    
    return {
            "qs_summary": qs_report,
            "used_subj_wise": results
        }
    
# Assign Evaluation → Assigns a test to an evaluator.
# Submit Evaluation → Marks the evaluation as completed.
# Review Evaluation → Accepts or rejects the evaluation.
# Withdraw Evaluation → Withdraws and reassigns a test.
# Request Reevaluation → Requests a reevaluation by the student.

@test_router_v2.put("/{test_id}/url", response_model=TestResponse)
async def update_test_download_url(
    *,
    test_id: int,
    test_download_url: str = Body(
        embed=True, alias="testDownloadUrl", validation_alias="testDownloadUrl"
    ),
):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    test_update_db = await test_service.update(
        obj_current=test_db, obj_new={"test_download_url": test_download_url},db_session=db.session
    )
    return test_update_db

@test_router_v2.get("/testquestions/{test_id}/download")
async def test_qs_download(test_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
        
        test_db = await test_service.get(id=test_id,db_session=db.session)
        if not test_db:
            raise TestNotFound()

        qs_db = await test_question_service.get_by_filters_multi(filters={"test_id":test_id},db_session= db.session)

        # template_path = "src/templates/test_templates/mains_test.docx"
        # doc = DocxTemplate(template_path)
        # context = {
        #     "qs": qs_db,
        #     "test": test_db, 
        #     "paper": test_db.paper["name"],
        #     "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
        # }
        # # print("qs_db>>>>>", qs_db[0].question.question, test_db.__dict__)
        # doc.render(context)
        # output_path1 = "src/templates/test_templates/output_material.docx"
        # doc.save(output_path1)
        # buffer = io.BytesIO()
        # doc.save(buffer)
        # buffer.seek(0)

        # base64_encoded_doc = base64.b64encode(buffer.read()).decode("utf-8")
        # return JSONResponse(content={"doc_base64": base64_encoded_doc})

        file_loader = FileSystemLoader('src/templates/test_templates')
        env = Environment(loader=file_loader)
    
        template = env.get_template('mains_test.html')
        # for q in qs_db:
        #     if q.question and q.question.question:
        #         q.question.question_html = markdown.markdown(q.question.question)
        #     else:
        #         q.question.question_html = ""
        for q in qs_db:
            if q.question and q.question.question:
                raw_html = markdown.markdown(q.question.question or "")
                soup = BeautifulSoup(raw_html, "html.parser")
                q.question.contains_image = bool(soup.find("img"))
                q.question.question_html = str(soup)
            else:
                q.question.contains_image = False
                q.question.question_html = ""
        data = {
                "qs": qs_db,
                "test": test_db, 
                "paper": test_db.paper["name"],
                "laex_icon": "src/assets/upscpro.svg"
            }
        
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

        return {"form_name":"Frontdesk Form","data": pdf_encoded}

@test_router_v2.get("/testquestions/{test_id}/download/questions")
async def test_qs_download(test_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
        
        test_db = await test_service.get(id=test_id,db_session=db.session)
        if not test_db:
            raise TestNotFound()

        qs_db = await test_question_service.get_by_filters_multi(filters={"test_id":test_id},db_session= db.session)

        file_loader = FileSystemLoader('src/templates/test_templates')
        env = Environment(loader=file_loader)
    
        template = env.get_template('mains_qs_test.html')
        
        for q in qs_db:
            if q.question and q.question.question:
                raw_html = markdown.markdown(q.question.question or "")
                soup = BeautifulSoup(raw_html, "html.parser")
                q.question.contains_image = bool(soup.find("img"))
                q.question.question_html = str(soup)
            else:
                q.question.contains_image = False
                q.question.question_html = ""
        data = {
                "qs": qs_db,
                "test": test_db, 
                "paper": test_db.paper["name"],
                "laex_icon": "src/assets/upscpro.svg"
            }
        
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

        return {"form_name":"Mains Qs PDF","data": pdf_encoded}

# test atempt 

@test_router_v2.post("/{test_id}/start", response_model=TestAttemptResponse)
async def test_attempt_start(
    test_id: int,is_qbank_attempt: bool | None = None,test_start_type: QBankType | None = None,plantask_id:int | None = None, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    if is_qbank_attempt:
        quota_info = await CheckQuotaAccess.check_subs_prod_quota(
            db_session=db.session,
            quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
            user=current_user,
            feature_name = FeatureName.prelims,
            qbank_type=test_start_type
        )
        # if not is_check:
        #     raise PermissionDenied()
    # test_db = await test_service.get(id=test_id,db_session=db.session)
    user_db = await user_service.get(id=current_user.id,db_session=db.session)
    test_attempt_db = await test_attempt_service.check_ongoing_test_attempt(
        test_id=test_id, attempted_by_id=current_user.id,db_session=db.session
    )
    if test_attempt_db:
        raise TestAttemptExists()

    test_attempt_db = await test_attempt_service.create(
        obj_in=TestAttemptCreate(test_id=test_id,plantask_id=plantask_id,is_qbank_attempt=is_qbank_attempt if is_qbank_attempt else False, attempted_by_id=current_user.id),db_session=db.session
    )
    ##update test attempt
    user_test_attempts = await test_attempt_service.calculate_user_test_attempts(
        user_id=current_user.id,db_session=db.session
    )
    user_update = User(test_attempts_count=user_test_attempts.get("attempts_count"))
    user_update_db = await user_service.update(obj_current=user_db, obj_new=user_update,db_session=db.session)
    if is_qbank_attempt:
        if quota_info["source"] == "subscription":

            user_dict = current_user.__dict__
            subs_dict = (user_dict["subscription"]).__dict__
            plans_dict = (subs_dict["plan"]).__dict__


            user_quota_in = UserQuota(
                user_id=current_user.id,
                subscription_id=current_user.subscription_id,
                quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
                feature_name=FeatureName.prelims ,
                plan_name=plans_dict["name"],
                plan_id=plans_dict["id"],
            )
            # update quota
            user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)
        elif quota_info["source"] == "product":
            user_quota_in = UserQuota(
            user_id=current_user.id,
            quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
            purchase_id = quota_info["purchase_id"],
            product_id = quota_info["product_id"]
        )
            user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)

    return test_attempt_db

@test_router_v2.post("/{test_id}/testattempt/upload") #this
async def upload_test_attempts(ts_uploads: list[UploadTestAttempt]):
    
    tas = await test_attempt_service.bulk_create(objects=ts_uploads,db=db.session)
    for obj in ts_uploads:
        user_db = await user_service.get(id=obj.attempted_by_id,db_session=db.session)
        user_test_attempts = await test_attempt_service.calculate_user_test_attempts(
            user_id=obj.attempted_by_id,db_session=db.session
        )
        user_update = User(test_attempts_count=user_test_attempts.get("attempts_count"))
        user_update_db = await user_service.update(obj_current=user_db, obj_new=user_update,db_session=db.session)
    return tas

@test_router_v2.put("/attempts/{id}/record/omr", response_model=TestAttemptResponse)
async def ta_record_omr(
    id: int,
    with_omr_sheet: bool,
    remember_option: bool | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    if remember_option:
        user_db = await user_service.get(id=current_user.id,db_session=db.session)
        user_update_db = await user_service.update(
            obj_current=user_db,
            obj_new={"user_preferences": {"with_omr_sheet": with_omr_sheet}},db_session=db.session
        )

    if not test_attempt_db:
        raise TestAttemptNotFound()

    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new={"with_omr_sheet": with_omr_sheet},db_session=db.session
    )

    return ta_update_db


@test_router_v2.put(
    "/attempts/{id}/record/elimination", response_model=TestAttemptResponse
)
async def ta_record_elimination(
    id: int,
    record_elimination: bool,
    remember_option: bool | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    if remember_option:
        user_db = await user_service.get(id=current_user.id,db_session=db.session)
        user_update_db = await user_service.update(
            obj_current=user_db,
            obj_new={
                "user_preferences": {"record_elimination_technique": record_elimination}
            },db_session=db.session
        )

    if not test_attempt_db:
        ta_update_db = await test_attempt_service.create(
            obj_in=TestAttempt({"record_elimination": record_elimination}),db_session=db.session
        )
    else:
        ta_update_db = await test_attempt_service.update(
            obj_current=test_attempt_db,
            obj_new={"record_elimination": record_elimination},db_session=db.session
        )

    return ta_update_db

@test_router_v2.put("/attempts/{id}/record/answermode", response_model=TestAttemptResponse)
async def ta_record_answermode(
    id: int,
    in_app_answering: bool,
    remember_option: bool | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    if in_app_answering:
            in_app_answering = True
            download_and_upload = False
    else:
            in_app_answering = False
            download_and_upload = True
    if remember_option:
        user_db = await user_service.get(id=current_user.id,db_session=db.session)
       
        user_update_db = await user_service.update(
            obj_current=user_db,
            obj_new={"user_preferences": {"in_app_answering": in_app_answering,"download_and_upload": download_and_upload}},db_session=db.session
        )

    if not test_attempt_db:
        raise TestAttemptNotFound()

    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new={"in_app_answering": in_app_answering},db_session=db.session
    )

    return ta_update_db


@test_router_v2.post("/attempts/{id}/pause", response_model=TestAttemptResponse)
async def test_attempt_pause(
    id: int,
    time_elapsed: float,
    unattempted: int,
    test_attempt_mode: TEST_ATTEMPT_MODE,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)

    if not test_attempt_db:
        raise TestAttemptNotFound()

    test_attempt_update = TestAttemptUpdate(
        time_elapsed=time_elapsed,
        unattempted=unattempted,
        test_attempt_mode=test_attempt_mode,
        status=TEST_ATTEMPT_STATUS.paused,
    )

    test_attempt_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db,
        obj_new=test_attempt_update,db_session=db.session
    )

    return test_attempt_update_db


@test_router_v2.post("/attempts/{id}/resume", response_model=TestAttemptResponse)
async def test_attempt_resume(id: int, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()

    test_attempt_update = TestAttemptUpdate(status=TEST_ATTEMPT_STATUS.ongoing)

    test_attempt_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new=test_attempt_update,db_session=db.session
    )

    return test_attempt_update_db


@test_router_v2.post("/attempts/{id}/mode", response_model=TestAttemptResponse)
async def change_test_attempt_mode(
    id: int,
    test_attempt_mode: TEST_ATTEMPT_MODE,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])),
):
    # test_attempt_db = await test_attempt_service.get(id=(id, current_user.id))

    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)

    if not test_attempt_db:
        raise TestAttemptNotFound()

    test_attempt_update = TestAttemptUpdate(test_attempt_mode=test_attempt_mode)

    test_attempt_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new=test_attempt_update,db_session=db.session
    )

    return test_attempt_update_db

@test_router_v2.post(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def test_question_attempt(
    *,
    # time_elapsed: float,
    # answer_text: str | None = None,  # for SQ
    # selected_options: list[OptionCMS] | None = None,
    test_q_attempt: TestQAttempt,
    test_attempt_id: int,
    q_id: int,
    current_user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
    bckgrnd_tasks: BackgroundTasks,
):
    test_attempt_db: TestAttempt = await test_attempt_service.get(id=test_attempt_id,db_session=db.session)

    if not test_attempt_db:
        raise TestAttemptNotFound()

    tq_attempt_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id,db_session=db.session
    )
    if tq_attempt_db:
        raise TestQuestionAttemptExists()

    question_attempt = TestQuestionAttemptCreate(
        test_attempt_id=test_attempt_id,
        test_id=test_attempt_db.test_id,
        question_id=q_id,
        attempted_by_id=current_user.id,
        time_elapsed=test_q_attempt.time_elapsed,
        answer_text=test_q_attempt.answer_text,
        selected_options=test_q_attempt.selected_options,
    )
    question_attempt_db = await tq_attempt_service.create(
        obj_in=question_attempt, db_session=db.session
    )

    bckgrnd_tasks.add_task(process_question_attempt, test_attempt_id=test_attempt_id,q_id=q_id,usage = "post")

    return question_attempt_db

@test_router_v2.put(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def update_test_question_attempt(
    *,
    # time_elapsed: float,
    # answer_text: str | None = None,
    # selected_options: list[OptionCMS] | None = None,
    test_q_attempt: TestQAttempt,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
    bckgrnd_tasks: BackgroundTasks,
):
    tq_attempt_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tq_attempt_db:
        raise TestQuestionAttemptNotFound()

    q_attempt_update = TestQuestionAttemptUpdate(
        time_elapsed=test_q_attempt.time_elapsed,
        selected_options=test_q_attempt.selected_options,
        answer_text=test_q_attempt.answer_text,
    )

    # update q attempt
    update_question_attempt_db = await tq_attempt_service.update(
        obj_current=tq_attempt_db, obj_new=q_attempt_update, db_session=db.session
    )
    bckgrnd_tasks.add_task(process_question_attempt,test_attempt_id=test_attempt_id,q_id=q_id,usage = "update")

    return update_question_attempt_db

@test_router_v2.delete(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def delete_test_question_attempt(
    *,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    question_attempt_db = await tq_attempt_service.del_test_question_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    ta_db = await test_attempt_service.get_by_field(value=test_attempt_id, field="id", db_session=db.session)

    if ta_db.unattempted is not None:
        ta_qs_count = ta_db.unattempted + 1
        ta_update_db = await test_attempt_service.update(obj_current=ta_db,obj_new={"unattempted":ta_qs_count}, db_session=db.session)   

    return question_attempt_db

@test_router_v2.get(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def get_test_question_attempt(
    *,
    test_attempt_id: int,
    q_id: int,
    current_user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    tq_attempt_db = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tq_attempt_db:
        TestQuestionAttemptNotFound()
    return tq_attempt_db

@test_router_v2.get(
    "/attempts/{test_attempt_id}/questions",
    response_model=list[TestQuestionAttemptResponse],
)
async def get_all_test_question_attempts(
    *,
    test_attempt_id: int,
    current_user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):
    tq_attempts_db = await tq_attempt_service.get_all_tq_attempts(
        test_attempt_id=test_attempt_id, db_session=db.session
    )
    if not tq_attempts_db or len(tq_attempts_db) == 0:
        TestQuestionAttemptNotFound()
    return tq_attempts_db

@test_router_v2.get(
    "/{test_id}/attempts/{test_attempt_id}"
)
async def get_testattempt_with_evals(
    test_id: int,
    test_attempt_id: int,
    is_physical_test_attempt: bool | None = None,
    current_user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
):

    attempt_evals = await test_eval_service.get_testattempt_evaluations(test_attempt_id = test_attempt_id,is_physical_test_attempt=is_physical_test_attempt,db_session = db.session)
    return attempt_evals

@test_router_v2.put("/evaluations/{test_evaluation_id}")
async def update_test_evaluaton_annotations(test_evaluation_id:int, annotaion_update: TestEvalAnnotationUpdate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])) ):
    test_eval_db = await test_eval_service.get(id = test_evaluation_id, db_session=db.session)
    test_eval_update = await test_eval_service.update(obj_current=test_eval_db,obj_new=TestEvaluation(**annotaion_update.model_dump(exclude_unset=True)),db_session=db.session)
    test_eval_db = await test_eval_service.get(id = test_evaluation_id, db_session=db.session)
    return test_eval_db

@test_router_v2.get("/evaluations/{test_evaluation_id}")
async def get_test_evaluatons(test_evaluation_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    evaluation = await test_eval_service.get(id = test_evaluation_id, db_session=db.session)
    return evaluation

@test_router_v2.post("/attempts/{id}/prelims/submit", response_model=TestAttemptResponse)
async def test_attempt_submit(
    bckgrnd_tasks: BackgroundTasks,
    id: int,
    time_elapsed: float,
    unattempted: int,
    answer_url: str | None = None,
    current_user: User = Depends(valid_token_user),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    user_db = await user_service.get(id = current_user.id ,db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()

    paper_type = test_attempt_db.test.paper["paper_type"]
    test_q_count = test_attempt_db.test.questions_count
    feature_name = FeatureName.prelims
    if test_attempt_db.is_qbank_attempt or not test_attempt_db.plantask_id:
        quota_source = await CheckQuotaAccess.check_subs_prod_quota(
            db_session=db.session,
            quota_name=QuotaName.questions_used,
            user=current_user,
            feature_name = FeatureName.prelims,
            qbank_type=QBankType.prelims
        )
    test_attempt_update = TestAttemptUpdate(
        time_elapsed=time_elapsed,
        unattempted=unattempted,
        status=TEST_ATTEMPT_STATUS.submitted,
        answer_upload_url=answer_url,
    )

    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new=test_attempt_update,db_session=db.session
    )

    subs: Subscription = current_user.subscription
    if test_attempt_db.is_qbank_attempt or not test_attempt_db.plantask_id:
        if quota_source["source"] == "subscription":
            user_q_quota = UserQuota(
                user_id=current_user.id,
                subscription_id=current_user.subscription_id,
                quota_name=QuotaName.questions_used,
                feature_name=feature_name,
                plan_name=subs.plan.name,
                plan_id=subs.plan.id,
                quota_consumed=test_q_count,
            )
            user_quota_q_db = await user_quota_service.create(obj_in=user_q_quota,db_session=db.session)
        elif quota_source["source"] == "product": 
            user_q_quota = UserQuota(
                user_id=current_user.id,
                quota_name=QuotaName.questions_used,
                purchase_id = quota_source["purchase_id"],
                product_id = quota_source["product_id"],
                quota_consumed=test_q_count,
            )
            user_quota_q_db = await user_quota_service.create(obj_in=user_q_quota,db_session=db.session)

    if paper_type == PaperType.objective:
        bckgrnd_tasks.add_task(
            process_test_submit,
            test_attempt_id=ta_update_db.id,
            user_id=current_user.id
        )

    return ta_update_db

@test_router_v2.post("/attempt/{id}/mains/submit")
async def submit_mains_test(*,id:int,mains_submit_in:MainsSubmitSchema,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    test_q_count = test_attempt_db.test.questions_count
    if test_attempt_db.is_qbank_attempt or not test_attempt_db.plantask_id:
        try:
            quota_info = await CheckV2UserAccess.check_prod_quota(
                db_session=db.session,
                quota_name=QuotaName.questions_used,
                qbank_type = QBankType.mains ,
                user=current_user,
            )
            # quota_info will have product_id and purchase_id
            print("Quota OK from:", quota_info)

        except QuotaExceed:
            raise QuotaExceed()
    
    if not test_attempt_db:
        raise TestAttemptNotFound()
    test_attempt_update = TestAttempt(
            time_elapsed=mains_submit_in.time_elapsed,
            unattempted=mains_submit_in.unattempted,
            status=TEST_ATTEMPT_STATUS.submitted,
            answer_upload_url=mains_submit_in.answer_url,
            test_evaluation_status = TEST_ASSESSMENT_STATUS.unassigned,
            submitted_date = datetime.now()
        )

    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new=test_attempt_update,db_session=db.session
    )
    if test_attempt_db.is_qbank_attempt or not test_attempt_db.plantask_id:
        user_quota_in = UserQuota(
            user_id=current_user.id,
            quota_name=QuotaName.questions_used,
            purchase_id=quota_info["purchase_id"],
            product_id=quota_info["product_id"],  
            quota_consumed=test_q_count, 
        )
        user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)
        
    return ta_update_db


@test_router_v2.post("/assign/{test_attempt_id}")
async def assign_evaluator(*,test_attempt_id:int,test_assign_in:TestAttemptAssign,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    #check if the test attempt is in submitted status, if it is assign evaluator create test eval and give assigned time, move eval status to assigned
    test_attempt_db: TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()
    if test_attempt_db.status != TEST_ATTEMPT_STATUS.submitted:
        raise HTTPException(status_code= 409, detail="Test is not in submitted status")

    test_eval_in = TestEvaluation(test_attempt_id = test_attempt_id, evaluator_id = test_assign_in.evaluator_id,
                                  is_reevaluation = True if test_attempt_db.re_evaluation_requested is True else False,
                                  status = TEST_ASSESSMENT_STATUS.assigned, assigned_at = datetime.now())
    test_eval_db = await test_eval_service.create(obj_in=test_eval_in,db_session=db.session)

    test_attempt_update = await test_attempt_service.update(obj_current=test_attempt_db,obj_new={"test_evaluation_status":TEST_ASSESSMENT_STATUS.assigned}, db_session=db.session)

    return test_eval_db

@test_router_v2.post("/evaluate/{test_attempt_id}")
async def start_evaluation(*,test_attempt_id:int,eval_start_in:TestAttemptEvalStart,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    #check if test eval is assinged, change test eval status to inprogress(update)
    test_attempt_db: TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()
    test_eval_db: TestEvaluation = await test_eval_service.get(id=eval_start_in.test_evaluation_id,db_session=db.session)
    if not test_eval_db:
        raise TestAttemptNotFound()
    if test_attempt_db.test_evaluation_status != TEST_ASSESSMENT_STATUS.assigned or test_eval_db.status != TEST_ASSESSMENT_STATUS.assigned:
        raise HTTPException(status_code= 409, detail="Test is not in assigned status")
    
    test_eval_update = await test_eval_service.update(obj_current=test_eval_db,obj_new={"status":TEST_ASSESSMENT_STATUS.in_progress},db_session=db.session)

    test_attempt_update = await test_attempt_service.update(obj_current=test_attempt_db,obj_new={"test_evaluation_status":TEST_ASSESSMENT_STATUS.in_progress}, db_session=db.session)

    return test_eval_update

@test_router_v2.post("/attempts/{test_attempt_id}/questions/{q_id}/evaluations")
async def submit_tq_evaluation_mains(
    *,
    test_attempt_id: int,
    q_id: int,
    tq_attempt: TQEvaluationMains,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))
):
    test_attempt_db: TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()

    tq_attempt_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    tq_attempt_in = TestQuestionAttempt(
        test_attempt_id=test_attempt_id,
        test_id=test_attempt_db.test_id,
        question_id=q_id,
        attempted_by_id=test_attempt_db.attempted_by_id,
        marks_obtained=tq_attempt.marks_obtained,
        micro_comment=tq_attempt.micro_comment,
        is_correct_attempt=(tq_attempt.marks_obtained > 0),
    )

    if tq_attempt_db:
        # update tq_attempt
        tqa_db = await tq_attempt_service.update(
            obj_current=tq_attempt_db, obj_new=tq_attempt_in, db_session=db.session
        )
    else:
        tqa_db = await tq_attempt_service.create(
            obj_in=tq_attempt_in, db_session=db.session
        )
    test_eval_db: TestEvaluation = await test_eval_service.get(id=tq_attempt.test_evaluation_id,db_session=db.session)
    if not test_eval_db:
        raise HTTPException(status_code= 409, detail="Test Evaluation not found")
    existing_questions = test_eval_db.evaluated_questions or []

    # Create new question entry
    new_question_entry = {
        "question_id": q_id,
        "marks_obtained": tq_attempt.marks_obtained,
        "micro_comment": tq_attempt.micro_comment,
    }

    # Check if the question already exists, update it; otherwise, append
    updated_questions = [
        q if q["question_id"] != q_id else new_question_entry for q in existing_questions
    ]

    # If question wasn't in the list, add it
    if not any(q["question_id"] == q_id for q in existing_questions):
        updated_questions.append(new_question_entry)

    # Update the TestEvaluation record
    test_eval_update = await test_eval_service.update(
        obj_current=test_eval_db,
        obj_new={"evaluated_questions": updated_questions},
        db_session=db.session
    )
    await process_question_attempt_mains(test_attempt_id=test_attempt_id,q_id=q_id)
    return tqa_db

@test_router_v2.post("/{test_id}/attempts/{test_attempt_id}/evaluations") # by the evaluator, chnge test eval status to evaluated, evaluated at
async def submit_test_evaluation_mains(
    *,
    test_id: int,
    test_attempt_id: int,
    test_eval: TestEvaluationMains,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student])),
    bckgrnd_tasks: BackgroundTasks,
):
    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt:
        raise TestAttemptNotFound()
    test_eval_db: TestEvaluation = await test_eval_service.get(id=test_eval.test_evaluation_id,db_session=db.session)
    if not test_eval_db:
        raise HTTPException(status_code= 409, detail="Test Evaluation not found")
    # if test_attempt.test_evaluation_status != TEST_ASSESSMENT_STATUS.in_progress or test_eval_db.status != TEST_ASSESSMENT_STATUS.in_progress:
    #     raise HTTPException(status_code= 409, detail="Test is not in in-progress status")
    

    user_db = await user_service.get(id=test_attempt.attempted_by_id, db_session=db.session)

    test_attempt_update = TestAttempt(
        evaluation_upload_url=test_eval.evaluation_upload_url,
        re_evaluation_upload_url=test_eval.re_evaluation_upload_url,
        unattempted=test_eval.unattempted,
        macro_comment=test_eval.macro_comment.model_dump(),
        test_evaluation_status = TEST_ASSESSMENT_STATUS.evaluated
    )
    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt, obj_new=test_attempt_update, db_session=db.session
    )
    test_attempt_results = await tq_attempt_service.calculate_test_attempt_results(
            test_attempt_id=test_attempt.id, db_session=db.session
        )
    
    test_eval_update = await test_eval_service.update(obj_current=test_eval_db,obj_new={"status":TEST_ASSESSMENT_STATUS.evaluated,"evaluated_at":datetime.now(),"score":test_attempt_results.get("score")},db_session=db.session)


    bckgrnd_tasks.add_task(
        process_test_submit,
        test_attempt_id=ta_update_db.id,
            user_id=user_db.id
    )

    return ta_update_db

@test_router_v2.put("/{test_id}/attempts/{test_attempt_id}/evaluations")
async def update_test_attempt( test_id: int,
    test_attempt_id: int,test_eval: TestAttemptReviewerUpdate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):

    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    test_attempt_update = TestAttempt(
        score=test_eval.score,
        unattempted=test_eval.unattempted,
        macro_comment=test_eval.macro_comment.model_dump(),
        
    )
    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt, obj_new=test_attempt_update, db_session=db.session
    )
    return ta_update_db

@test_router_v2.get("/{test_id}/attempts/{test_attempt_id}/performance/technique")
async def get_performance_technique(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    def categorize_score(score):
        if score < settings.PERF_TECH_LOW:
            return "Low"
        elif settings.PERF_TECH_MED_MIN <= score <= settings.PERF_TECH_MED_MAX:
            return "Medium"
        elif settings.PERF_TECH_HIGH_MIN < score <= settings.PERF_TECH_HIGH_MAX:
            return "High"
        else:
            return "unknown"

    ta_db = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    attempt_count = ta_db.correct + ta_db.incorrect

    result = await tq_attempt_service.calc_test_technique_results(
        test_id=test_id,
        test_attempt_id=test_attempt_id, db_session=db.session
    )
    if result is None:
        return []
    res = [{**item._asdict()} for item in result]
    for subject in res:
        # subject["effectiveness"] = categorize_score(subject["accuracy_percent"])
        subject["effectiveness"] = categorize_score(
            
                (subject["accuracy_percent"] )
              
           
        )

    return res

@test_router_v2.post("/review/{test_attempt_id}")
async def assign_reviewer_and_review(*,
    test_attempt_id: int,
    test_review_in: TestReviewSchema,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    #check if test eval is in evaluated status, change test eval status to either accepted or rejected, reviewwed at time(update)
    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt:
        raise TestAttemptNotFound()
    test_eval_db: TestEvaluation = await test_eval_service.get(id=test_review_in.test_evaluation_id,db_session=db.session)
    if not test_eval_db:
        raise TestAttemptNotFound()
    # if test_attempt.test_evaluation_status != TEST_ASSESSMENT_STATUS.evaluated or test_eval_db.status != TEST_ASSESSMENT_STATUS.evaluated:
    #     raise HTTPException(status_code= 409, detail="Test is not in evaluated status")
    
    # test_eval_update = await test_eval_service.update(obj_current=test_eval_db,obj_new=TestEvaluation(**test_review_in.model_dump(exclude_unset=True,exclude={"test_evaluation_id"},include={"reviewed_at","comments","review_id"}), reviewed_at = datetime.now() if test_review_in.status in {"ACCEPTED", "REJECTED"} else None ),db_session=db.session)
    test_eval_update = test_review_in.model_dump( exclude_unset=True,exclude={"test_evaluation_id"})
    if "status" in test_eval_update:
        test_eval_update["reviewed_at"] = datetime.now()
    else:
        test_eval_update["reviewed_at"] = None
    test_eval_update = await test_eval_service.update(
        obj_current=test_eval_db,
        obj_new=TestEvaluation(**test_eval_update),
        db_session=db.session
    )
    if test_review_in.status:
        test_attempt_update = await test_attempt_service.update(obj_current=test_attempt,obj_new={"test_evaluation_status":test_review_in.status}, db_session=db.session)
    
    return test_eval_update

@test_router_v2.post("/withdraw/{test_attempt_id}/{test_eval_id}")
async def withdraw_assigned_test(*,test_attempt_id:int,test_eval_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    #if the test eval is in assigned or inprogress, on withdraw change test eval status to withdraw, withdraw at, create new test eval with unassigned status
    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt:
        raise TestAttemptNotFound()
    test_eval_db: TestEvaluation = await test_eval_service.get(id=test_eval_id,db_session=db.session)
    if not test_eval_db:
        raise TestAttemptNotFound()
    
    test_eval_update = await test_eval_service.update(obj_current=test_eval_db,obj_new={"status":TEST_ASSESSMENT_STATUS.withdrawn,"withdrawn_at":datetime.now()},db_session=db.session)
    
    test_attempt_update = await test_attempt_service.update(obj_current=test_attempt,obj_new={"test_evaluation_status":TEST_ASSESSMENT_STATUS.unassigned}, db_session=db.session)

    return test_eval_update

@test_router_v2.post("/request/reevaluation/{test_attempt_id}")
async def request_reevaluation(*,test_attempt_id:int, reeval_in:TestAttemptReEval,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    #if the test eval is in accepted status, create new test eval with unassigned , is_reevaluation to true
    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt:
        raise TestAttemptNotFound()
    test_attempt_update = await test_attempt_service.update(obj_current=test_attempt,obj_new={"test_evaluation_status":TEST_ASSESSMENT_STATUS.unassigned,
                                                                                              "status": TEST_ATTEMPT_STATUS.submitted,
                                                                                              "re_evaluation_requested": True,
                                                                                              "re_evaluation_request_date": datetime.now(),
                                                                                              "re_evaluation_reason":reeval_in.re_evaluation_reason}, db_session=db.session)
    return test_attempt_update

@test_router_v2.get("/workforce/{workforce_type}")
async def get_evaluators_reviewers(workforce_type: str,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    if workforce_type == USER_ROLE.evaluation_evaluator:
        workforce_assigned = await  test_eval_service.get_evaluators_with_stats(db_session=db.session)
    elif workforce_type == USER_ROLE.evaluation_reviewer:
        workforce_assigned =  await test_eval_service.get_reviewer_with_stats(db_session=db.session)
    return workforce_assigned

@test_router_v2.get("/{id}", response_model=TestResponse)
async def get_test(id: int, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))):
    test = await test_service.get(id=id,db_session=db.session)
    if not test:
        raise TestNotFound()

    return test

@test_router_v2.get("/evaluation/{status}")
async def test_attempt_evaluations(*,status:TEST_ASSESSMENT_STATUS,is_reevaluation:bool,
                                    test_title: str | None = None,
                                    exam_id: int | None = None,
                                    stage_id: int | None = None,
                                    paper_id: int | None = None,
                                    subject_id: int | None = None,
                                    topic_id: str | None = None,
                                    q_count:int | None = None,
                                    is_physical_test_attempt: bool | None = None,
                                    submitted_date: date | None = None,
                                    assigned_date: date | None = None,
                                    evaluated_date: date | None = None,
                                    reviewed_date: date | None = None,
                                    withdrawn_date: date | None = None,limit: int = 10, offset: int = 0,
                                    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    attempts = await test_eval_service.get_test_attempts_by_status(status=status,
                                                                   is_reevaluation=is_reevaluation,
                                                                   exam_id=exam_id,title=test_title,
                                                                   stage_id=stage_id,paper_id=paper_id,
                                                                   is_physical_test_attempt=is_physical_test_attempt,
                                                                   subject_id=subject_id,topic_id=topic_id,
                                                                   q_count=q_count,submitted_date=submitted_date,
                                                                   assigned_date=assigned_date,evaluated_date=evaluated_date,
                                                                   reviewed_date=reviewed_date,withdrawn_date=withdrawn_date,
                                                                   limit=limit,offset=offset,
                                                              db_session=db.session)
    return attempts 

@test_router_v2.get("/evaluator/{evaluator_id}/evaluations")
async def get_evaluator_evaluations(*,evaluator_id:int,status:TEST_ASSESSMENT_STATUS= Query(...),
                                    test_title: str | None = None,
                                    exam_id: int | None = None,
                                    stage_id: int | None = None,
                                    paper_id: int | None = None,
                                    subject_id: int | None = None,
                                    topic_id: str | None = None,
                                    q_count:int | None = None,
                                    is_physical_test_attempt: bool | None = None,
                                    submitted_date: date | None = None,
                                    assigned_date: date | None = None,
                                    evaluated_date: date | None = None,
                                    reviewed_date: date | None = None,
                                    withdrawn_date: date | None = None,limit: int = 10, offset: int = 0,
                                    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    attempts = await test_eval_service.get_evaluator_evaluations_by_status(evaluator_id=evaluator_id,status=status,
                                                                           exam_id=exam_id,title=test_title,
                                                                   stage_id=stage_id,paper_id=paper_id,
                                                                   is_physical_test_attempt=is_physical_test_attempt,
                                                                   subject_id=subject_id,topic_id=topic_id,
                                                                   q_count=q_count,submitted_date=submitted_date,
                                                                   assigned_date=assigned_date,evaluated_date=evaluated_date,
                                                                   reviewed_date=reviewed_date,withdrawn_date=withdrawn_date,limit=limit,offset=offset,db_session = db.session)
    return attempts

@test_router_v2.get("/reviewer/{reviewer_id}/reviews")
async def get_reviewer_review(*,reviewer_id:int,status:TEST_ASSESSMENT_STATUS, is_reevaluation:bool,
                              test_title: str | None = None,
                                    exam_id: int | None = None,
                                    stage_id: int | None = None,
                                    paper_id: int | None = None,
                                    subject_id: int | None = None,
                                    topic_id: str | None = None,
                                    q_count:int | None = None,
                                    submitted_date: date | None = None,
                                    assigned_date: date | None = None,
                                    evaluated_date: date | None = None,
                                    reviewed_date: date | None = None,
                                    is_physical_test_attempt: bool | None = None,
                                    withdrawn_date: date | None = None,limit: int = 10, offset: int = 0,
                                    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    attempts = await test_eval_service.get_reviewer_reviews_by_status(reviewer_id=reviewer_id,is_reevaluation=is_reevaluation,
                                                                      exam_id=exam_id,title=test_title,
                                                                   stage_id=stage_id,paper_id=paper_id,
                                                                   is_physical_test_attempt=is_physical_test_attempt,
                                                                   subject_id=subject_id,topic_id=topic_id,
                                                                   q_count=q_count,submitted_date=submitted_date,
                                                                   assigned_date=assigned_date,evaluated_date=evaluated_date,
                                                                   reviewed_date=reviewed_date,withdrawn_date=withdrawn_date,limit=limit,offset=offset,status=status,db_session = db.session)
    return attempts

@test_router_v2.get("/attempts/evaluation/count")
async def get_attempt_eval_count(current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    attempt_counts = await test_eval_service.get_mains_test_status_counts(db_session=db.session)
    return attempt_counts

@test_router_v2.get("/evaluator/{evaluator_id}/evaluate/count")
async def get_evaluator_evaluations_count(*,evaluator_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    count = await test_eval_service.get_evaluator_evaluations_count(evaluator_id=evaluator_id,db_session = db.session)
    return count

@test_router_v2.get("/reviewer/{reviewer_id}/review/count")
async def get_reviewer_review_count(*,reviewer_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    count = await test_eval_service.get_reviewer_review_count(reviewer_id=reviewer_id,db_session = db.session)
    return count

@test_router_v2.get("/{test_id}/attempts", response_model=list[TestAttemptResponse])
async def get_test_attempts(
    test_id: int, current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    test_attempts = await test_attempt_service.get_by_field_multi(
        field="test_id", value=test_id,db_session=db.session
    )
    return test_attempts

@test_router_v2.get("/{test_id}/testattempts/details")
async def get_test_attempts(
    test_id: int,product_name: str | None = None,
    product_code: str | None = None,
    branch_name: str | None = None,
    offering_name: str | None = None,
    student_name: str | None = None,
    student_phno: str | None = None,
    status: str | None = None,
    evaluation_status: str | None = None,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    test_attempts = await studyplan_service.get_test_atempts_with_details(product_name=product_name,
        product_code=product_code,
        branch_name=branch_name,
        offering_name=offering_name,
        student_name=student_name,
        student_phno=student_phno,
        status=status,
        evaluation_status=evaluation_status,
        test_id= test_id,db_session=db.session
    )
    return test_attempts

@test_router_v2.get(
    "/{test_id}/attempts/users/{user_id}", response_model=list[TestAttemptResponse]
)
async def get_test_attempts_by_user(
    test_id: int,
    user_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    test_attempts = await test_attempt_service.get_test_attempts(
        attempted_by_id=user_id, test_id=test_id,db_session=db.session
    )
    # if not test_attempts or len(test_attempts) == 0:
    #     raise TestAttemptNotFound()

    return test_attempts

@test_router_v2.get("/attempts/users/{user_id}", response_model=list[TestAttemptResponse])
async def get_all_test_attempts_by_user(
    user_id: int,
   current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    attempted_tests = await test_attempt_service.get_by_field_multi(
        value=user_id, field="attempted_by_id",db_session=db.session
    )

    return attempted_tests

@test_router_v2.get(
    "/{test_id}/attempts/{test_attempt_id}/results", response_model=TestAttemptV2Result
)
async def get_results(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
    # current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    test_evals = await test_eval_service.get_by_field_multi(value=results.id,field="test_attempt_id",db_session=db.session)
    if results.score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score is not given for the test attempt made"
        )   

    rank_percentile = await test_attempt_service.calculate_rank_percentile(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    resp = [{**item._asdict()} for item in rank_percentile]
    print("resp>>>>>",resp)
    del resp[0]["test_id"] , resp[0]["id"]


    return TestAttemptV2Result(
            **results.__dict__,        # or use a Pydantic model's `.dict()` if needed
            **resp[0],                 # contains percentile, average_score, etc.
            annotations=test_evals     # list of annotation objects
        )

@test_router_v2.get("/{test_id}/attempts/{test_attempt_id}/performance/overall")
async def get_performance_overall(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    ta_result = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    test_db = await test_service.get(id=test_id, db_session=db.session)
    if not ta_result:
        raise TestAttemptNotFound()
    ta_report = {
        "correct": ta_result.correct,
        "incorrect": ta_result.incorrect,
        "un_attempted": ta_result.unattempted,
    }
    result = await test_attempt_service.calc_score_time_accuracy_reports_v2(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    # ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db.session)
   
    # if test_db.test_type == TEST_TYPE.custom or ta_count<5:
    #     result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q if test_db.paper["id"] == settings.GS_PAPER_ID else settings.CSAT_AVG_TIME_PER_Q
    #     result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
    #     result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
    
    return {"questions_report": ta_report, "overall_report": result}

@test_router_v2.get("/{test_id}/attempts/{test_attempt_id}/questions/results")
async def get_test_question_results(
    test_id: int,
    test_attempt_id: int,
    # current_user: User = Depends(valid_token_user),
    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))
):
    results = await test_question_service.get_tq_results(
        test_id=test_id, test_attempt_id=test_attempt_id, user_id=current_user.id, db_session=db.session
    )

    results2 = [
        {
            "question": obj[0].question,
            "attempt": obj[1],
            "favourite": obj[2].is_favorite if obj[2] else obj[2],
            "attempts_percent": obj[0].attempts_percent,
            "is_reported": obj[3]
        }
        for obj in results
    ]

    return results2

@test_router_v2.post(
    "/questions/favorites/{q_id}", response_model=QuestionFavoriteResponse
)
async def star_unstar_question(q_id: int,  user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    fav_q = await favorite_q_service.get_fav_q(user_id=user.id, q_id=q_id,db_session=db.session)
    if not fav_q:
        fav_q_db = await favorite_q_service.create(
            obj_in=QuestionFavorite(
                question_id=q_id, marked_by_id=user.id, is_favorite=True
            ),db_session=db.session
        )
        return fav_q_db
    fav_q_db = await favorite_q_service.update(
        obj_current=fav_q, obj_new={"is_favorite": not fav_q.is_favorite},db_session=db.session
    )
    return fav_q_db


@test_router_v2.get("/questions/favorites/all")
async def get_fav_qs(user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    _fav_qs = await favorite_q_service.get_all_fav_qs(user_id=user.id,db_session=db.session)

    # fav_qs = [{"prelims": item[0], "mains": item[1]} for item in _fav_qs]

    return _fav_qs
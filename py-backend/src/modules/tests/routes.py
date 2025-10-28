from functools import reduce
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from fastapi_async_sqlalchemy import db
from sqlalchemy import delete
from src.config import settings
from strapi_client import StrapiClient, process_data, process_response

from src.modules.products.schemas import QBankType
from .service import (
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
from src.users.schemas import USER_TYPE, FeatureName, QuotaName
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
    process_test_submit,
    process_question_attempt,
    evaluate_mcq_attempt,
    add_test_questions,
    get_paper_subj_topic_used_qs,
    create_test_qs,
)

from src.auth.exceptions import AuthorizationFailed, NotFound
from src.modules.notifications.utils import send_admin_tests_topic_notifications
from .routesv2 import test_router_v2


test_service = TestService(Test, db)
test_question_service = TestQuestionService(TestQuestion, db)
test_attempt_service = TestAttemptService(TestAttempt, db)
tq_attempt_service = TestQuestionAttemptService(TestQuestionAttempt, db)
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
test_router = APIRouter(prefix="/tests", tags=["Tests"])
# test_router_v2 = APIRouter(prefix="/v2/tests", tags=["Tests V2"])


# @test_router.post("", response_model=TestResponse)
# async def create_test(
#     *,
#     user: User = Depends(CheckUserAccess(subscr=True)),
#     test_in: TestCreate,
# ):
# check feature and quota access
# feature_name = FeatureName.prelims
# if test_in.paper.paper_type == PaperType.subjective:
#     feature_name = FeatureName.mains

# is_check = await CheckUserAccess.check_feature_quota(
#     db_session=db.session,
#     feature_name=feature_name,
#     quota_name=QuotaName.test_create,
#     user=user,
# )
# if not is_check:
#     raise PermissionDenied()

# user_tq_attempts = await tq_attempt_service.get_by_field_multi(
#     value=user.id, field="attempted_by_id"
# )

# if user_tq_attempts and len(user_tq_attempts) > 0:
#     exclude_ids = [attempt.question_id for attempt in user_tq_attempts]
# else:
#     exclude_ids = None

# if test_in.subjects and len(test_in.subjects) > 0:
#     subject_ids = [subject.id for subject in test_in.subjects]
# else:
#     subject_ids = None

# if test_in.topics and len(test_in.topics) > 0:
#     topic_ids = [topic.id for topic in test_in.topics]
# else:
#     topic_ids = None

# # fetch context questions if objective type paper
# cq_count: int = 0
# if test_in.paper.paper_type == PaperType.objective:
#     cq_size = max(1, test_in.test_size * 0.10)
#     print("cq_size", cq_size, type(cq_size))
#     context_questions = await fetch_questions(
#         q_type=QUESTION_TYPE.cq,
#         tenant_id=user.tenant_id,
#         exam_id=test_in.exam.id,
#         paper_id=test_in.paper.id,
#         subject_ids=subject_ids,
#         topic_ids=topic_ids,
#         difficulty_level=test_in.difficulty_level,
#         test_size=int(cq_size),
#         source=test_in.source,
#         exclude_ids=exclude_ids,
#     )

#     if context_questions and len(context_questions) > 0:
#         cq_count = reduce(
#             lambda x, y: x + len(y["questions"]), context_questions, 0
#         )
#         print("cq_qount>>>>", cq_count)

# # fetch questions
# if test_in.paper.paper_type == PaperType.objective:
#     q_type = QUESTION_TYPE.mcq
# else:
#     q_type = QUESTION_TYPE.sq

# q_size = test_in.test_size - cq_count
# questions = await fetch_questions(
#     q_type=q_type,
#     tenant_id=user.tenant_id,
#     exam_id=test_in.exam.id,
#     paper_id=test_in.paper.id,
#     subject_ids=subject_ids,
#     topic_ids=topic_ids,
#     difficulty_level=test_in.difficulty_level,
#     test_size=q_size,
#     source=test_in.source,
#     exclude_ids=exclude_ids,
# )

# # create test if enough questions found
# q_count = len(questions)
# total_qs = q_count + cq_count
# if total_qs < 5:
#     raise NotEnoughQuestions()
# test_db = await test_service.create(obj_in=test_in)
# user_dict = user.__dict__
# subs_dict = (user_dict["subscription"]).__dict__
# plans_dict = (subs_dict["plan"]).__dict__
# user_quota_in = UserQuota(
#     user_id=user.id,
#     subscription_id=user.subscription_id,
#     quota_name=QuotaName.test_create,
#     feature_name=feature_name,
#     plan_name=plans_dict["name"],
#     plan_id=plans_dict["id"],
# )
# user_quota_db = await user_quota_service.create(obj_in=user_quota_in)

# # test update fields calculated
# max_duration = test_in.paper.duration * (
#     total_qs / test_in.paper.number_of_questions
# )
# duration_per_q = max_duration / total_qs
# max_marks = 0

# # add questions
# for q in questions:
#     cms_id = q.pop("id")
#     max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
#     neg_marks_q = (
#         q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
#     )
#     max_marks += max_marks_q

#     cms_qs_db = await question_service.get_questions_by_cms_id_type(
#         # value=cms_id, field="cms_id"
#         cms_id=cms_id,
#         question_type=q_type,
#     )
#     question_db = len(cms_qs_db) > 0 and cms_qs_db[0]

#     if not question_db:
#         question_in = QuestionCreate(
#             **q,
#             cms_id=cms_id,
#             tenant_id=user.tenant_id,
#             question_type=q_type,
#             max_marks=max_marks_q,
#             negative_marks=neg_marks_q,
#         )

#         question_db = await question_service.create(obj_in=question_in)

#         tq_in = TestQuestionCreate(
#             test_id=test_db.id,
#             question_id=question_db.id,
#             max_marks=max_marks_q,
#             negative_marks=neg_marks_q,
#             duration=duration_per_q,
#         )

#         test_question_db = await test_question_service.create(obj_in=tq_in)
#     else:
#         tq_in = TestQuestionCreate(
#             test_id=test_db.id,
#             question_id=question_db.id,
#             max_marks=max_marks_q,
#             negative_marks=neg_marks_q,
#             duration=duration_per_q,
#         )

#         test_question_db = await test_question_service.create(obj_in=tq_in)

# # add context questions
# if cq_count > 0:
#     for cq in context_questions:
#         cms_id = cq.pop("id")
#         cq_qs = cq.pop("questions")
#         for q in cq_qs:
#             q_num = q.pop("id")
#             max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
#             neg_marks_q = (
#                 q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
#             )
#             max_marks += max_marks_q
#             question_db = await question_service.get_unique_constraint_q(
#                 cms_id=cms_id, q_num=q_num, question_type=QUESTION_TYPE.cq
#             )
#             if not question_db:
#                 question_in = QuestionCreate(
#                     **cq,
#                     **q,
#                     q_num=q_num,
#                     cms_id=cms_id,
#                     question_type=QUESTION_TYPE.cq,
#                     tenant_id=user.tenant_id,
#                     max_marks=max_marks_q,
#                     negative_marks=neg_marks_q,
#                 )

#                 question_db = await question_service.create(obj_in=question_in)

#                 tq_in = TestQuestionCreate(
#                     test_id=test_db.id,
#                     question_id=question_db.id,
#                     max_marks=max_marks_q,
#                     negative_marks=neg_marks_q,
#                     duration=duration_per_q,
#                 )

#                 test_question_db = await test_question_service.create(obj_in=tq_in)
#             else:
#                 tq_in = TestQuestionCreate(
#                     test_id=test_db.id,
#                     question_id=question_db.id,
#                     max_marks=max_marks_q,
#                     negative_marks=neg_marks_q,
#                     duration=duration_per_q,
#                 )

#                 test_question_db = await test_question_service.create(obj_in=tq_in)

# # update test with details
# test_update = test_db

# test_update.max_duration = max_duration
# test_update.max_marks = max_marks
# test_update.tenant_id = user.tenant_id
# test_update.test_status = TEST_STATUS.ready
# test_update.questions_count = total_qs
# if user.is_admin:
#     test_update.is_recommended = True
# test_update.created_by_id = user.id

# test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update)

# return test_update_db

@test_router.post("",response_model=TestResponse )
async def create_test(
    *,
    user: User = Depends(valid_token_user),
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
    # if test_in.paper.paper_type == PaperType.subjective:
    #     feature_name = FeatureName.mains

    # is_check = await CheckUserAccess.check_feature_quota(
    #     db_session=db.session,
    #     feature_name=feature_name,
    #     is_daily_test=False,
    #     quota_name=QuotaName.test_create,
    #     user=user,
    # )
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
        
    # user_dict = user.__dict__
    # subs_dict = (user_dict["subscription"]).__dict__
    # plans_dict = (subs_dict["plan"]).__dict__
    # user_quota_in = UserQuota(
    #     user_id=user.id,
    #     subscription_id=user.subscription_id,
    #     quota_name=QuotaName.test_create,
    #     feature_name=feature_name,
    #     plan_name=plans_dict["name"],
    #     plan_id=plans_dict["id"],
    # )
    # # update quota
    # user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)

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
    if user.is_admin:
        test_update.is_recommended = True
    test_update.created_by_id = user.id

    test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update,db_session=db.session)
   
    return test_update_db


@test_router.put("/{test_id}/url", response_model=TestResponse)
async def update_test_download_url(
    *,
    user: User = Depends(CheckUserAccess(subscr=True)),
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


@test_router.post("/curate", response_model=TestResponse)
async def create_curated_test( *,
    test_in: TestCurate,
    current_user: User = Depends(valid_token_user_admin),bckgrnd_tasks: BackgroundTasks):
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

# @test_router.post("/curate/all", response_model=TestResponse)
# async def create_curate_prelims_test(
#     test_in: TestCurateCreate, user: User = Depends(valid_token_user_admin)
# ):
#     if test_in.subjects and len(test_in.subjects) > 0:
#         subject_ids = [subject.id for subject in test_in.subjects]
#     else:
#         subject_ids = None

#     if test_in.topics and len(test_in.topics) > 0:
#         topic_ids = [topic.id for topic in test_in.topics]
#     else:
#         topic_ids = None

#     cq_count: int = 0
#     if (test_in.is_full_length) and (test_in.test_type != TEST_TYPE.pyq):
#         if test_in.paper.name == settings.GS_PAPER_NAME:
#             qs_list = []
#             for key, value in settings.GS_Q_DIST.items():
#                 subj_code = key
#                 subj_dist = value["dist"]
#                 qs = await fetch_qs_by_codes(
#                     q_type=QUESTION_TYPE.mcq,
#                     tenant_id=user.tenant_id,
#                     exam_id=test_in.exam.id,
#                     paper_id=test_in.paper.id,
#                     subject_codes=[subj_code],
#                     test_size=subj_dist,
#                 )
#                 print("qs>>>>>>>>>>>", len(qs))
#                 qs_list.append(qs)
#             total_subj_qs = [
#                 element for sublist in qs_list for element in sublist
#             ]  # flatten list
#             if len(total_subj_qs) != test_in.paper.number_of_questions:
#                 test_size = test_in.paper.number_of_questions - len(total_subj_qs)
#                 qs = await fetch_questions(
#                     q_type="MCQ",
#                     tenant_id=user.tenant_id,
#                     paper_id=test_in.paper.id,
#                     test_size=test_size,
#                 )
#                 print("qs>>>>>>>>>>>", len(qs), "testsizze", test_size)
#                 qs_list.append(qs)

#             questions = [
#                 element for sublist in qs_list for element in sublist
#             ]  # flatten list

#         elif test_in.paper.name == settings.CSAT_PAPER_NAME:
#             qs_list = []
#             for key, value in settings.CSAT_Q_DIST.items():
#                 subj_code = key
#                 subj_dist = value["dist"]
#                 if key == "CSAT-RC":
#                     cq_size = 7  # considering each cq will have max of 4 qs

#                     print("cq_size", cq_size, type(cq_size))
#                     context_questions = await fetch_qs_by_codes(
#                         q_type=QUESTION_TYPE.cq,
#                         tenant_id=user.tenant_id,
#                         exam_id=test_in.exam.id,
#                         paper_id=test_in.paper.id,
#                         test_size=cq_size,
#                     )

#                     if context_questions and len(context_questions) > 0:
#                         cq_count = reduce(
#                             lambda x, y: x + len(y["questions"]), context_questions, 0
#                         )
#                         print("cq_qount>>>>", cq_count)
#                 else:
#                     qs = await fetch_qs_by_codes(
#                         q_type=QUESTION_TYPE.mcq,
#                         tenant_id=user.tenant_id,
#                         exam_id=test_in.exam.id,
#                         paper_id=test_in.paper.id,
#                         subject_codes=[subj_code],
#                         test_size=subj_dist,
#                     )
#                     print("qs>>>>>>>>>>>", len(qs))
#                     qs_list.append(qs)
#             total_subj_qs = [
#                 element for sublist in qs_list for element in sublist
#             ]  # flatten list
#             total_qs_count = len(total_subj_qs) + cq_count
#             if len(total_subj_qs) != test_in.paper.number_of_questions:
#                 test_size = test_in.paper.number_of_questions - total_qs_count
#                 qs = await fetch_questions(
#                     q_type="MCQ",
#                     tenant_id=user.tenant_id,
#                     paper_id=test_in.paper.id,
#                     test_size=test_size,
#                 )
#                 print("qs>>>>>>>>>>>", len(qs), "testsizze", test_size)
#                 qs_list.append(qs)

#             questions = [
#                 element for sublist in qs_list for element in sublist
#             ]  # flatten list
    
#     if (test_in.is_full_length) and (test_in.test_type == TEST_TYPE.pyq):
#         questions = await fetch_questions( q_type=QUESTION_TYPE.mcq,
#                     tenant_id=user.tenant_id,
#                     exam_id=test_in.exam.id,
#                     paper_id=test_in.paper.id,
#                     test_size=test_in.paper.number_of_questions,select_year=test_in.select_exam_year)
#     if test_in.test_type == TEST_TYPE.current_affairs:
#         questions = await fetch_current_affairs_qs(
#             q_type=QUESTION_TYPE.mcq,
#             tenant_id=user.tenant_id,
#             exam_id=test_in.exam.id,
#             paper_id=test_in.paper.id,
#             topic_ids=topic_ids,
#             test_size=test_in.test_size,
#             source=test_in.source,
#         )

#     if (not test_in.is_full_length) and not (
#         test_in.test_type == TEST_TYPE.current_affairs
#     ):
#         if test_in.paper.name == settings.CSAT_PAPER_NAME:
#             if test_in.test_type == TEST_TYPE.pyq:
#                 select_year = test_in.select_exam_year
#             else:
#                 select_year = None
#             cq_size = max(1, test_in.test_size * 0.10)
#             print("cq_size", cq_size, type(cq_size))
#             context_questions = await fetch_questions(
#                 q_type=QUESTION_TYPE.cq,
#                 tenant_id=user.tenant_id,
#                 exam_id=test_in.exam.id,
#                 paper_id=test_in.paper.id,
#                 subject_ids=subject_ids,
#                 topic_ids=topic_ids,
#                 test_size=int(cq_size),
#                 select_year=select_year,
#                 source=test_in.source,
#             )

#             if context_questions and len(context_questions) > 0:
#                 cq_count = reduce(
#                     lambda x, y: x + len(y["questions"]), context_questions, 0
#                 )
#                 print("cq_qount>>>>", cq_count)

#         q_size = test_in.test_size - cq_count
#         if test_in.test_type == TEST_TYPE.pyq:
#             select_year = test_in.select_exam_year
#         else:
#             select_year = None

#         questions = await fetch_questions(
#             q_type=QUESTION_TYPE.mcq,
#             tenant_id=user.tenant_id,
#             exam_id=test_in.exam.id,
#             paper_id=test_in.paper.id,
#             subject_ids=subject_ids,
#             topic_ids=topic_ids,
#             test_size=q_size,
#             source=test_in.source,
#             select_year=select_year,
#         )

#         # create test if enough questions found
#     q_count = len(questions)
#     total_qs = q_count + cq_count
#     if total_qs < 5:
#         raise NotEnoughQuestions()

#     test = TestCreate(
#         title=test_in.title,
#         exam=test_in.exam,
#         stage=test_in.stage,
#         paper=test_in.paper,
#         test_size=test_in.test_size,
#         subjects=test_in.subjects,
#         topics=test_in.topics,
#         test_type=test_in.test_type,
#         source=test_in.source,
#         is_full_length=test_in.is_full_length,
#     )

#     test_db = await test_service.create(obj_in=test)

#     # test update fields calculated
#     max_duration = test_in.paper.duration * (
#         total_qs / test_in.paper.number_of_questions
#     )
#     duration_per_q = max_duration / total_qs
#     max_marks = 0

#     # add questions
#     for q in questions:
#         cms_id = q.pop("id")
#         max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
#         neg_marks_q = (
#             q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
#         )
#         max_marks += max_marks_q

#         cms_qs_db = await question_service.get_questions_by_cms_id_type(
#             cms_id=cms_id,
#             question_type=QUESTION_TYPE.mcq,
#         )
#         question_db = len(cms_qs_db) > 0 and cms_qs_db[0]

#         if not question_db:
#             question_in = QuestionCreate(
#                 **q,
#                 cms_id=cms_id,
#                 tenant_id=user.tenant_id,
#                 question_type=QUESTION_TYPE.mcq,
#                 max_marks=max_marks_q,
#                 negative_marks=neg_marks_q,
#             )

#             question_db = await question_service.create(obj_in=question_in)

#             tq_in = TestQuestionCreate(
#                 test_id=test_db.id,
#                 question_id=question_db.id,
#                 max_marks=max_marks_q,
#                 negative_marks=neg_marks_q,
#                 duration=duration_per_q,
#             )

#             test_question_db = await test_question_service.create(obj_in=tq_in)
#         else:
#             tq_in = TestQuestionCreate(
#                 test_id=test_db.id,
#                 question_id=question_db.id,
#                 max_marks=max_marks_q,
#                 negative_marks=neg_marks_q,
#                 duration=duration_per_q,
#             )

#             test_question_db = await test_question_service.create(obj_in=tq_in)

#     # add context questions
#     if cq_count > 0:
#         for cq in context_questions:
#             cms_id = cq.pop("id")
#             cq_qs = cq.pop("questions")
#             for q in cq_qs:
#                 q_num = q.pop("id")
#                 max_marks_q = q.pop("maxMarks") or test_in.paper.max_marks_per_question
#                 neg_marks_q = (
#                     q.pop("negativeMarks") or test_in.paper.negative_marks_per_question
#                 )
#                 max_marks += max_marks_q
#                 question_db = await question_service.get_unique_constraint_q(
#                     cms_id=cms_id, q_num=q_num, question_type=QUESTION_TYPE.cq
#                 )
#                 if not question_db:
#                     question_in = QuestionCreate(
#                         **cq,
#                         **q,
#                         q_num=q_num,
#                         cms_id=cms_id,
#                         question_type=QUESTION_TYPE.cq,
#                         tenant_id=user.tenant_id,
#                         max_marks=max_marks_q,
#                         negative_marks=neg_marks_q,
#                     )

#                     question_db = await question_service.create(obj_in=question_in)

#                     tq_in = TestQuestionCreate(
#                         test_id=test_db.id,
#                         question_id=question_db.id,
#                         max_marks=max_marks_q,
#                         negative_marks=neg_marks_q,
#                         duration=duration_per_q,
#                     )

#                     test_question_db = await test_question_service.create(obj_in=tq_in)
#                 else:
#                     tq_in = TestQuestionCreate(
#                         test_id=test_db.id,
#                         question_id=question_db.id,
#                         max_marks=max_marks_q,
#                         negative_marks=neg_marks_q,
#                         duration=duration_per_q,
#                     )

#                     test_question_db = await test_question_service.create(obj_in=tq_in)

#     # update test with details
#     test_update = test_db

#     test_update.max_duration = max_duration
#     test_update.max_marks = max_marks
#     test_update.tenant_id = user.tenant_id
#     test_update.test_status = TEST_STATUS.ready
#     test_update.questions_count = total_qs
#     test_update.is_recommended = True
#     test_update.created_by_id = user.id
#     if test_in.is_daily_test == True:
#         test_update.daily_test_date = test_in.daily_test_date
#         test_update.is_daily_test = True

#     else:
#         test_update.daily_test_date = None

#     test_update_db = await test_service.update(obj_current=test_db, obj_new=test_update)

#     return test_update_db


@test_router.post("/curate/prelims", response_model=TestResponse)
async def create_curate_prelims_test(
    test_in: TestCurateCreate, current_user: User = Depends(valid_token_user_admin)
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

@test_router.put("/curate/{test_id}/prelims", response_model=TestResponse)
async def update_curate_test(test_id: int, test_in: TestCurateUpdate, current_user: User = Depends(valid_token_user_admin)):
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

@test_router.post(
    "/curate/{test_id}/questions", response_model=list[TestQuestionResponse]
)
async def add_curated_questions(
    test_id: int,
    questions_in: list[CuratedQuestion],  # cms question id
    current_user: User = Depends(valid_token_user_admin),
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

    # added_questions_db = [
    #     await question_service.get_question_by_cms_id(value=q.id, field="cms_id")
    #     for q in questions_in
    # ]
    t_questions = test_update_db.questions

    return t_questions


@test_router.delete("/curate/{test_id}/questions/{q_id}")
async def delete_curated_questions(
    test_id: int,
    q_id: int,  # test question id
    current_user: User = Depends(valid_token_user_admin),
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


@test_router.put("/curate/{test_id}/questions")
async def save_curated_questions_order(
    test_id: int,
    ordered_q_ids: list[int],  # question_id from testquestions
    current_user: User = Depends(valid_token_user_admin),
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


@test_router.put("/curate/{test_id}/publish")
async def publish_curated_test(
    test_id: int,bckgrnd_tasks: BackgroundTasks,
    ordered_q_ids: list[int],  # question_id from testquestions
    current_user: User = Depends(valid_token_user_admin),
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


@test_router.get("/questions/used")
async def get_used_qs_by_subj(
    paper_id: int, current_user: User = Depends(valid_token_user)
):
    resp = await tq_attempt_service.get_used_q_count_by_subj(
        paper_id=paper_id, user_id=current_user.id,db_session=db.session
    )
    results = [{**item._asdict()} for item in resp]
    return results


@test_router.post("/question/modes")
async def get_question_mode(
    paper_id: int,
    subject_ids: list[int] | None = [],
    topic_ids: list[int] | None = [],
    category: CATEGORY | None = None, is_external: bool | None = None,
    current_user: User = Depends(valid_token_user),
):
    cms_q_count = await get_q_count_by_filter(
        tenant_id=current_user.tenant_id,
        paper_id=paper_id,
        subject_ids=subject_ids,
        topic_ids=topic_ids,
        category=category,
        is_external=is_external
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


@test_router.post("/currentaffairs/q/modes")
async def get_curr_aff_q_mode(
    paper_id: int,
    topic_ids: list[int] | None = [],
    category: CATEGORY | None = None, is_external: bool | None = None,
    current_user: User = Depends(valid_token_user),
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


@test_router.get(
    "/sizes/options",
    response_model=list[int],
    dependencies=[Depends(valid_token_user)],
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


@test_router.get("/me", response_model=list[TestResponse])
async def get_test_created_by_me(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    # my_tests = await test_service.get_by_field_multi(
    #     value=current_user.id, field="created_by_id"
    # )
    my_tests = await test_service.get_test_created_by_paper(
        user_id=current_user.id, tenant_id=current_user.tenant_id, paper_id=paper_id,db_session=db.session
    )

    return my_tests


@test_router.get(
    "/me/all", response_model=list[MyTestResponse]
)  # gets shared with me and created by me along with "attemptsByMe": 0,
# "sharedWithMe": false
async def get_all_my_tests(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    my_tests = await test_service.get_my_tests(
        paper_id=paper_id, user_id=current_user.id,db_session=db.session
    )

    results = [
        {"attempts_by_me": obj[1], "shared_with_me": obj[2], **obj[0].__dict__}
        for obj in my_tests
    ]

    return results


@test_router.get("/admin/all", response_model = AdminTestResp)
async def get_tenant_tests(offset:int = 0, limit:int = 10,current_user: User = Depends(valid_token_user_admin)):
    tests = await test_service.get_admin_tests_all(tenant_id=current_user.tenant_id,limit=limit, offset=offset,db_session=db.session)
    # resp = [{"total_count": item[0], **item._asdict()} for item in tests]
    return tests
    # tests = await test_service.get_admin_tests(
    #     db_session=db.session, tenant_id=current_user.tenant_id
    # )

    # # results = [{"created_by": obj[1], **obj[0].__dict__} for obj in tests]
    # # return results


@test_router.get("/mytests", response_model=list[TestResponse])
# gets shared with me and created by me
async def my_tests(
    current_user: User = Depends(valid_token_user),
):
    created_by_me_tests = await test_service.get_by_field_multi(
        value=current_user.id, field="created_by_id",db_session=db.session
    )

    shared_with_me_tests = await test_service.get_tests_sharedwith(
        user_id=current_user.id,db_session=db.session
    )
    my_tests = list(set(created_by_me_tests + shared_with_me_tests))
    # not_started_tests = []

    # for test in my_tests:
    #     attempted_test = await test_attempt_service.get_test_attempt(test_id=test.id, attempted_by_id=current_user.id)
    #     if not attempted_test:
    #     not_started_tests.append(attempted_test)
    # return not_started_tests

    return my_tests


@test_router.get("/sharedwithme", response_model=list[TestResponse])
async def get_tests_shared_with_me(
    current_user: User = Depends(valid_token_user),
):
    tests = await test_service.get_tests_sharedwith(user_id=current_user.id,db_session=db.session)
    return tests


@test_router.get("/sharedbyme", response_model=list[TestResponse])
async def get_tests_shared_by_me(
    current_user: User = Depends(valid_token_user),
):
    tests = await test_service.get_tests_sharedby(user_id=current_user.id,db_session=db.session)
    return tests


@test_router.get("/totd", dependencies=[Depends(valid_token_user)], response_model=list[TestResponse])
# @test_router_v2.get("/prelims/totd", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_todays_tests(
    paper_id: int, current_user: User = Depends(valid_token_user)
):
    tests = await test_service.get_totd_tests(
        tenant_id=current_user.tenant_id, paper_id=paper_id,db_session=db.session
    )
    
    return tests

@test_router.get("/pyq", dependencies=[Depends(valid_token_user)], response_model=list[TestResponse])
# @test_router_v2.get("/prelims/pyq", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_pyq_tests(paper_id: int, current_user: User = Depends(valid_token_user)):
    tests = await test_service.get_pyq_tests(
        tenant_id=current_user.tenant_id, paper_id=paper_id,db_session=db.session
    )
    return tests

@test_router.get("/model", dependencies=[Depends(valid_token_user)], response_model=list[TestResponse])
# @test_router_v2.get("/prelims/model", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
async def get_model_tests(
    paper_id: int, current_user: User = Depends(valid_token_user)
):
    tests = await test_service.get_model_tests(
        paper_id=paper_id, tenant_id=current_user.tenant_id,db_session=db.session
    )
    return tests

# @test_router_v2.get("/prelims/recommended/all", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
@test_router.get("/recommended/all", response_model=list[TestResponse])
async def get_all_recommended_tests(
    current_user: User = Depends(valid_token_user),
):
    # tests = await test_service.get_recommended(
    #     tenant_id=current_user.tenant_id, db_session=db.session
    # )
    # if not tests:
    #     raise RecommendedTestsNotFound()
    tests = await test_service.get_recommended_all(
        tenant_id=current_user.tenant_id, db_session=db.session
    )

    # if not tests:
    #     raise RecommendedTestsNotFound()

    # unique_tests = {test.id: test for test in tests}.values()

    return tests

# @test_router_v2.get("/prelims/recommended", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.student]))], response_model=list[TestResponse])
@test_router.get("/recommended")
async def get_unattempted_recommended_tests(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    # tests = await test_service.get_recommended(
    #     tenant_id=current_user.tenant_id, db_session=db.session
    # )
    # if not tests:
    #     raise RecommendedTestsNotFound()

    tests = await test_service.get_unattempted_recommended_tests(
        paper_id=paper_id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        db_session=db.session,
    )
    resp = [{**item._asdict()} for item in tests]

    # if not tests:
    #     raise RecommendedTestsNotFound()

    # unique_tests = {test.id: test for test in tests}.values()

    return resp

@test_router.get("/totd/{test_date}/{paper_id}")
async def get_test(test_date: date, paper_id:int, current_user: User = Depends(valid_token_user)):
    tests = await test_service.get_totds_by_date(paper_id = paper_id,test_date=test_date,db_session=db.session)
    resp = [{**item._asdict()} for item in tests]
    return resp


@test_router.get("/ongoing",response_model=list[TestStatusTestAttemptResponse])
async def get_ongoing_tests(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    tests = await test_attempt_service.get_ongoing_tests(
        user_id=current_user.id, paper_id=paper_id,db_session=db.session
    )
    resp = [{**item._asdict()} for item in tests]
    return resp

@test_router.get("/completed", response_model=list[TestStatusTestAttemptResponse])
async def get_completed_tests(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    tests = await test_attempt_service.get_completed_tests(
        user_id=current_user.id, paper_id=paper_id,db_session=db.session
    )
    resp = [{**item._asdict()} for item in tests]
    return resp


@test_router.get("/{id}", response_model=TestResponse)
async def get_test(id: int, current_user: User = Depends(valid_token_user)):
    test = await test_service.get(id=id,db_session=db.session)
    if not test:
        raise TestNotFound()

    return test


@test_router.put("/{id}/status", response_model=TestResponse)
async def update_active_status(
    id: int,
    is_active: bool,
    current_user: User = Depends(valid_token_user),
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


"""
Tests Performance Dashboard APIs
"""


@test_router.get("/performance/summary")
async def get_tests_taken_summary(
    paper_id: int,
    current_user: User = Depends(valid_token_user),
):
    # Full length tests

    fl_test_taken = await test_attempt_service.agg_test_type_reports(
        paper_id=paper_id, user_id=current_user.id, is_full_length=True,db_session=db.session
    )
    test_type_res = [{**item._asdict()} for item in fl_test_taken]
    ta_qs = await test_attempt_service.agg_ta_qs_results(
        user_id=current_user.id, paper_id=paper_id, is_full_length=True,db_session=db.session
    )
    ta_rank_perc = await test_attempt_service.agg_calc_rank_percentile(
        user_id=current_user.id, paper_id=paper_id, is_full_length=True,db_session=db.session
    )
    if len(ta_rank_perc)>0:
        rank_perc_list = [{**item._asdict()} for item in ta_rank_perc]
        ta_rank_perc = next(item for item in rank_perc_list if item["user_id"] == current_user.id)
        del ta_rank_perc["user_id"]

    # Non Full length tests
    tests_created = await test_service.get_tests_created_count(
        user_id=current_user.id, tenant_id=current_user.tenant_id, paper_id=paper_id,db_session=db.session
    )
    used_qs = await test_attempt_service.get_used_qs_count_by_paper_mode(
        paper_id=paper_id,
        user_id=current_user.id,db_session=db.session
    )
    used_qs = [{**item._asdict()} for item in used_qs]
   
    mcq_count = await get_paper_q_count(
        q_type="MCQ", tenant_id=current_user.tenant_id,category=CATEGORY.external,
        is_external=True, paper_id=paper_id
    )
    cq_count = await get_paper_q_count(q_type="CQ", tenant_id=current_user.tenant_id, paper_id=paper_id,category=CATEGORY.external,
        is_external=True)
    cms_q_count = mcq_count + cq_count
    unused_tutor_qs = cms_q_count - next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'TUTOR'), 0)
    unused_exam_qs = cms_q_count - next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'EXAM'), 0)
    qs_report = {
        "used_exam_qs": next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'EXAM'), 0),
        "unused_exam_qs": unused_exam_qs,
        "used_tutor_qs": next((qs['used_qs'] for qs in used_qs if qs['mode'] == 'TUTOR'), 0),
        "unused_tutor_exam": unused_tutor_qs,
    }
    tests_taken = await test_attempt_service.agg_ta_mode_results(
        user_id=current_user.id, paper_id=paper_id,db_session=db.session
    )
    tests_taken = [{**item._asdict()} for item in tests_taken]

    return {
        "full_length_report": {
            "tests_taken": test_type_res,
            "qs_ans": ta_qs,
            "rank_percentile": ta_rank_perc,
        },
        "q_bank_report": {
            "tests_created": tests_created,
            "tests_taken": tests_taken,
            "qs_summary": qs_report,
        },
    }
   


@test_router.post("/performance/overall")
async def get_overall_performance(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    result = await test_attempt_service.agg_score_time_accuracy(
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    qs_ans_report = await tq_attempt_service.calc_tq_fl_answered(
        paper_id=paper_id, user_id=current_user.id,db_session=db.session
    )
    ta_count = await test_attempt_service.get_count(db_session=db.session)
   
    if ta_count > 5:
        return result, qs_ans_report
    else:
        result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
       
        result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q if paper_id == 2 else settings.CSAT_AVG_TIME_PER_Q
   
        result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
        return result, qs_ans_report
    

@test_router.post("/performance/trend/papers")
async def get_performance_trend_by_papers(
    *,
    stage_id: int,
    from_date: date,
    till_date: date,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get_performance_trend_papers(
        stage_id=stage_id,
        from_date=from_date,
        till_date=till_date,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )

    if not len(results) > 0:
        return []

    res: dict[str, Any] = {}
    for item in results:
        resp = sorted(item[1], key=lambda x: x["test_attempt_date"])
        res[item[0]] = {
            "performance_trend": resp,
            "latest": resp[-1]["percentage"],
            "change": (resp[-1]["percentage"] - resp[0]["percentage"])
            if resp[-1]["percentage"] is not None and resp[0]["percentage"] is not None
            else 0,
        }

    results_list = [
        {
            **item._asdict(),
            "latest": item[1][-1]["percentage"],
            "change": (item[1][-1]["percentage"] - item[1][0]["percentage"])
            if item[1][-1]["percentage"] is not None
            and item[1][0]["percentage"] is not None
            else 0,
        }
        for item in results
    ]

    return res


@test_router.post("/performance/trend/subjects")
async def get_performance_trend_by_subjects(
    *,
    paper_id: int,
    from_date: date,
    till_date: date,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get_performance_trend_subjects(
        paper_id=paper_id,
        from_date=from_date,
        till_date=till_date,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    if not len(results) > 0:
        return []
    res: dict[str, Any] = {}
   
    # return res
    for item in results:
        # resp = sorted(item[1], key=lambda x: x["test_attempt_date"])
        resp = item[1]
        unique_performance_trend = [entry for i, entry in enumerate(resp) if entry["test_attempt_id"] not in [perf["test_attempt_id"] for perf in resp[:i]]]
        resp = unique_performance_trend
        res[item[0]] = {
            "performance_trend": resp,
            "latest": resp[-1]["percentage"],
            "change": (resp[-1]["percentage"] - resp[0]["percentage"] )
            if resp[-1]["percentage"] is not None and resp[0]["percentage"] is not None
            else 0.0,
        }

    overall_result = await test_attempt_service.get_overall_performance_trend(
        user_id=current_user.id, paper_id=paper_id, full_length_result = full_length_result,db_session=db.session
    )
    resp = overall_result["performance_trend"]
    unique_performance_trend = [entry for i, entry in enumerate(resp) if entry["test_attempt_id"] not in [perf["test_attempt_id"] for perf in resp[:i]]]

    overall_result["performance_trend"] = unique_performance_trend
    overall_result["latest"] = resp[-1]["percentage"]
    overall_result["change"] = (
        (resp[-1]["percentage"] - resp[0]["percentage"])
        if resp[-1]["percentage"] is not None and resp[0]["percentage"] is not None
        else 0.0
    )
    # res = [{**item._asdict()} for item in overall_result]

    return {"over_all": overall_result}, res

    # results_list = [
    #     {
    #         **item._asdict(),
    #         "latest": item[1][-1]["percentage"],
    #         "change": (item[1][-1]["percentage"] - item[1][0]["percentage"])
    #         if item[1][-1]["percentage"] is not None
    #         and item[1][0]["percentage"] is not None
    #         else 0,
    #     }
    #     for item in results
    # ]

    # return results_list

# not used in prelims app
@test_router.post("/performance/benchmark/papers")
async def get_performance_benchmark_by_papers(
    *,
    stage_id: int,
    from_date: date,
    till_date: date,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get_performance_benchmark_papers(
        stage_id=stage_id,
        user_id=current_user.id,
        from_date=from_date,
        till_date=till_date,
        full_length_result=full_length_result,db_session=db.session
    )
    if not len(results) > 0:
        return []

    res = [{**item._asdict()} for item in results]
    filters = {"stage": {"id": {"$eq": stage_id}}}
    cms_res = await strapi.get_entries("papers", filters=filters, get_all=True)

    cms_paper_res = process_data(entry=cms_res)
    res_dict = {item["paper_name"]: item for item in res}

    for item in cms_paper_res:
        paper_name = item["name"]
        if paper_name in res_dict:
            res_dict[paper_name]["global_average"] = item["aspirationalMarksPercentage"]
        # else:
        #     res_dict[paper_name]["global_average"] = None

    updated_res = list(res_dict.values())
    return updated_res

# not used in prelims app
@test_router.post("/performance/benchmark/subjects")
async def get_performance_benchmark_by_subjects(
    *,
    paper_id: int,
    from_date: date,
    till_date: date,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get_performance_benchmark_subjects(
        paper_id=paper_id,
        user_id=current_user.id,
        from_date=from_date,
        till_date=till_date,
        full_length_result=full_length_result,db_session=db.session
    )
    if not len(results) > 0:
        return []

    # res = [{**item._asdict()} for item in results]
    

    benchmark_dict = await fetch_subject_benchmarks(stage_id=settings.STAGE_ID)

    res = []
    for item in results:
        item_dict = item._asdict()
        subject_name = item_dict["subject_name"]
        if subject_name in benchmark_dict:
            item_dict["global_average"] = benchmark_dict[subject_name]
        else:
            item_dict["global_average"] = None

        res.append(item_dict)

    return res


@test_router.post("/performance/benchmark/score")
async def get_agg_performance_score(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    ta_count = await test_attempt_service.get_count(db_session=db.session)
    results = await test_attempt_service.get_agg_score_benchmark(
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    if not len(results) > 0:
        return []
    if ta_count > 5:
        res = [{**item._asdict()} for item in results]
        return res
    else:
        # benchmark_dict = await fetch_subject_benchmarks(stage_id=settings.STAGE_ID)
        res = []
        for item in results:
            item_dict = item._asdict()
            # subject_name = item_dict["subject_name"]
            # if subject_name in benchmark_dict:
            item_dict["others_subject_score"] = settings.SUBJECT_BENCHMARK_SCORE
            # else:
            #     item_dict["others_subject_score"] = None

            res.append(item_dict)

        return res


@test_router.post("/performance/benchmark/accuracy")
async def get_agg_performance_accuracy(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    ta_count = await test_attempt_service.get_count(db_session=db.session)

    results = await test_attempt_service.get_agg_accuracy_benchmark(
        user_id=current_user.id,
        paper_id=paper_id,
        full_length_result=full_length_result,db_session=db.session
    )
    if not len(results) > 0:
        return []
    if ta_count > 5:
        
        res = [{**item._asdict()} for item in results]
        return res
    else:
        # benchmark_dict = await fetch_subject_benchmarks(stage_id=settings.STAGE_ID)

        res = []
        for item in results:
            item_dict = item._asdict()
            # subject_name = item_dict["subject_name"]
            # if subject_name in benchmark_dict:
            item_dict["others_subject_score"] = settings.SUBJECT_ACCURACY_BENCHMARK_SCORE
            # else:
            #     item_dict["others_subject_score"] = None

            res.append(item_dict)

        return res


@test_router.post("/performance/technique")
async def get_agg_performance_technique(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
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

    res = await tq_attempt_service.calc_agg_technique_results(
        user_id=current_user.id,
        paper_id=paper_id,
        db_session=db.session,
        full_length_result=full_length_result,
    )
    res2 = [{**item._asdict()} for item in res]
    ta_count = await test_attempt_service.get_used_qs_count(
        paper_id=paper_id, user_id=current_user.id,db_session=db.session
    )
    for subject in res2:
        subject["effectiveness"] = categorize_score(
            
                (subject["accuracy_percent"])
               
        )
        # subject["effectiveness"] = categorize_score(subject["accuracy_percent"])

    return res2


@test_router.post("/performance/subject/strength")
async def get_agg_subject_matrix(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "high"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"


    results = await tq_attempt_service.calc_agg_subject_matrix(
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        for key, value in settings.MAX_MIN_Q_DIST.items():
            subj = key
            if subj == subject["subject_name"]:
                subj_min = value["min"]
                subj_max = value["max"]
                subject["score_category"] = categorize_score(subject["accuracy_percent"])
                subject["min_qs"] = subj_min
                subject["max_qs"] = subj_max

    return res


@test_router.post("/performance/topic/strength")
async def get_agg_topic_matrix(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    def categorize_score(score):

        if score < settings.SCORE_LOW:
            return "low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "high"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"


    results = await tq_attempt_service.calc_agg_topic_matrix(
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])

    return res


@test_router.post("/performance/currentaffairs/strength")
async def get_agg_ca_matrix(
    paper_id: int,
    full_length_result: bool,
    current_user: User = Depends(valid_token_user),
):
    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "high"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"


    results = await tq_attempt_service.calc_agg_curr_aff_matrix(
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db.session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])

    return res


# @test_router.post("/performance/subject/trend")
# async def get_performance_trend(
#     stage_id: int,
#     from_date: date,
#     till: date,
#     current_user: User = Depends(valid_token_user),
# ):
#     filters = {"exam": {"id": {"$eq": 3}}, "stage": {"id": {"$eq": stage_id}}}
#     populate = {"subjects": "true"}
#     response = await strapi.get_entries("papers", filters=filters, populate=populate)

#     res_process = process_data(entry=response)

#     subjects_list = [obj.get("subjects", []) for obj in res_process]
#     subject_names = [
#         item["attributes"]["name"]
#         for sublist in subjects_list
#         for item in sublist["data"]
#     ]
#     print("subje>>>>>", subject_names, len(subject_names))

#     subj_results = []
#     for name in subject_names:
#         result = await tq_attempt_service.calculate_percent_score(
#             subject_name=name,
#             from_date=from_date,
#             till_date=till,
#             user_id=current_user.id,
#         )
#         subj_results.append({f"{name}": result})

#     return subj_results

"""
Favourite Question Routes
"""


@test_router.post(
    "/questions/favorites/{q_id}", response_model=QuestionFavoriteResponse
)
async def star_unstar_question(q_id: int, user: User = Depends(valid_token_user)):
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


@test_router.get("/questions/favorites/all")
async def get_fav_qs(user: User = Depends(valid_token_user)):
    _fav_qs = await favorite_q_service.get_all_fav_qs(user_id=user.id,db_session=db.session)

    # fav_qs = [{"prelims": item[0], "mains": item[1]} for item in _fav_qs]

    return _fav_qs

@test_router_v2.get("/questions/favorites/paper")
@test_router.get("/questions/favorites/paper")
async def get_fav_qs_by_paper(paper_id: int, user: User = Depends(valid_token_user)):
    fav_qs = await favorite_q_service.get_fav_qs_by_paper(
        user_id=user.id, paper_id=paper_id,db_session=db.session
    )
    return fav_qs


"""
Test Question routes
"""


@test_router.post(
    "/{id}/questions",
    response_model=TestQuestionResponse,
    dependencies=[Depends(CheckUserAccess(admin=True))],
)
async def create_test_question(id: int, question_id: int):
    test_db = await test_service.get(id=id,db_session=db.session)
    if not test_db:
        raise TestNotFound()
    q_db = await question_service.get(id=question_id,db_session=db.session)
    if not q_db:
        raise NotFound()

    tq_in = TestQuestionCreate(test_id=test_db.id, question_id=q_db.id)

    test_question_db = await test_question_service.create(obj_in=tq_in,db_session=db.session)

    return test_question_db


@test_router.get(
    "/{test_id}/questions",
    # response_model=list[TestQuestionResponse],
    dependencies=[Depends(valid_token_user)],
)
async def get_test_questions(test_id: int, user: User = Depends(valid_token_user)):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    if not test_db:
        raise TestNotFound()

    qs_db = await test_question_service.get_test_questions(
        test_id=test_id, user_id=user.id,db_session=db.session
    )
    results = [{"is_reported": obj[1], **obj[0].__dict__} for obj in qs_db]

    return results


"""
Test Attempt routes
"""


@test_router.post("/{test_id}/start", response_model=TestAttemptResponse)
async def test_attempt_start(
    test_id: int, current_user: User = Depends(valid_token_user)
):
    test_db = await test_service.get(id=test_id,db_session=db.session)
    user_db = await user_service.get(id=current_user.id,db_session=db.session)
    # check feature and quota access
    # feature_name = FeatureName.prelims
    # if test_db.paper["paper_type"] == PaperType.subjective:
    #     feature_name = FeatureName.mains
    
    quota_info = await CheckQuotaAccess.check_subs_prod_quota(
            db_session=db.session,
            quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
            user=current_user,
            feature_name = FeatureName.prelims,
            qbank_type="PRELIMS"
        )
    
    # is_check = await CheckUserAccess.check_feature_quota(
    #     db_session=db.session,
    #     feature_name=feature_name,
    #     quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
    #     is_daily_test=test_db.is_daily_test,
    #     user=current_user,
    # )

    # if not is_check:
    #     raise PermissionDenied()

    if not test_db or test_db.test_status == TEST_STATUS.pending:
        raise TestNotFound()
    if test_db.test_status == TEST_STATUS.pending:
        raise TestNotReady()

    test_attempt_db = await test_attempt_service.check_ongoing_test_attempt(
        test_id=test_id, attempted_by_id=current_user.id,db_session=db.session
    )
    if test_attempt_db:
        raise TestAttemptExists()

    test_attempt_db = await test_attempt_service.create(
        obj_in=TestAttemptCreate(test_id=test_id,is_qbank_attempt=True, attempted_by_id=current_user.id),db_session=db.session
    )
    ##update test attempt
    user_test_attempts = await test_attempt_service.calculate_user_test_attempts(
        user_id=current_user.id,db_session=db.session
    )
    user_update = User(test_attempts_count=user_test_attempts.get("attempts_count"))
    user_update_db = await user_service.update(obj_current=user_db, obj_new=user_update,db_session=db.session)
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

    # user_dict = current_user.__dict__
    # subs_dict = (user_dict["subscription"]).__dict__
    # plans_dict = (subs_dict["plan"]).__dict__

    
    # user_quota_in = UserQuota(
    #     user_id=current_user.id,
    #     subscription_id=current_user.subscription_id,
    #     quota_name=QuotaName.test_attempt if test_db.test_type == TEST_TYPE.custom else test_db.test_type,
    #     feature_name=feature_name,
    #     plan_name=plans_dict["name"],
    #     plan_id=plans_dict["id"],
    # )
    

    # user_quota_db = await user_quota_service.create(obj_in=user_quota_in,db_session=db.session)

    return test_attempt_db


@test_router.put("/attempts/{id}/record/omr", response_model=TestAttemptResponse)
async def ta_record_omr(
    id: int,
    with_omr_sheet: bool,
    remember_option: bool | None = None,
    current_user: User = Depends(valid_token_user),
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


@test_router.put(
    "/attempts/{id}/record/elimination", response_model=TestAttemptResponse
)
async def ta_record_elimination(
    id: int,
    record_elimination: bool,
    remember_option: bool | None = None,
    current_user: User = Depends(valid_token_user),
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


@test_router.post("/attempts/{id}/pause", response_model=TestAttemptResponse)
async def test_attempt_pause(
    id: int,
    time_elapsed: float,
    unattempted: int,
    test_attempt_mode: TEST_ATTEMPT_MODE,
    current_user: User = Depends(valid_token_user),
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


@test_router.post("/attempts/{id}/resume", response_model=TestAttemptResponse)
async def test_attempt_resume(id: int, current_user: User = Depends(valid_token_user)):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()

    test_attempt_update = TestAttemptUpdate(status=TEST_ATTEMPT_STATUS.ongoing)

    test_attempt_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db, obj_new=test_attempt_update,db_session=db.session
    )

    return test_attempt_update_db


@test_router.post("/attempts/{id}/mode", response_model=TestAttemptResponse)
async def change_test_attempt_mode(
    id: int,
    test_attempt_mode: TEST_ATTEMPT_MODE,
    current_user: User = Depends(valid_token_user),
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

@test_router.post("/attempts/{id}/submit", response_model=TestAttemptResponse)
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
    # if paper_type == PaperType.subjective:
    #     feature_name = FeatureName.mains
    
    quota_source = await CheckQuotaAccess.check_subs_prod_quota(
        db_session=db.session,
        quota_name=QuotaName.questions_used,
        user=current_user,
        feature_name = FeatureName.prelims,
        qbank_type=QBankType.prelims
    )
        
        # is_check = await CheckUserAccess.check_feature_quota(
        #     is_daily_test=test_attempt_db.test.is_daily_test,
        #     db_session=db.session,
        #     feature_name=feature_name,
        #     quota_name=QuotaName.questions_used,
        #     user=current_user,
        # )
        # if not is_check:
        #     raise PermissionDenied()

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

        # user_q_quota = UserQuota(
        #     user_id=current_user.id,
        #     subscription_id=current_user.subscription_id,
        #     quota_name=QuotaName.questions_used,
        #     feature_name=feature_name,
        #     plan_name=subs.plan.name,
        #     plan_id=subs.plan.id,
        #     quota_consumed=test_q_count,
        # )
        # user_quota_q_db = await user_quota_service.create(obj_in=user_q_quota,db_session=db.session)

    if paper_type == PaperType.objective:
        bckgrnd_tasks.add_task(
            process_test_submit,
            test_attempt_id=ta_update_db.id,
            user_id=current_user.id
        )

    return ta_update_db


@test_router.get("/{test_id}/attempts", response_model=list[TestAttemptResponse])
async def get_test_attempts(
    test_id: int, current_user: User = Depends(valid_token_user)
):
    test_attempts = await test_attempt_service.get_by_field_multi(
        field="test_id", value=test_id,db_session=db.session
    )
    return test_attempts


@test_router.get(
    "/{test_id}/attempts/users/{user_id}", response_model=list[TestAttemptResponse]
)
async def get_test_attempts_by_user(
    test_id: int,
    user_id: int,
    current_user: User = Depends(valid_token_user),
):
    test_attempts = await test_attempt_service.get_test_attempts(
        attempted_by_id=user_id, test_id=test_id,db_session=db.session
    )
    # if not test_attempts or len(test_attempts) == 0:
    #     raise TestAttemptNotFound()

    return test_attempts


@test_router.get("/attempts/users/{user_id}", response_model=list[TestAttemptResponse])
async def get_all_test_attempts_by_user(
    user_id: int,
    current_user: User = Depends(valid_token_user),
):
    attempted_tests = await test_attempt_service.get_by_field_multi(
        value=user_id, field="attempted_by_id",db_session=db.session
    )

    return attempted_tests


@test_router.post(
    "/attempts/{id}/request/reevaluation", response_model=TestAttemptResponse
)
async def re_evaluation_request(
    id: int,
    re_evaluation_requested: bool,
    re_evaluation_reason: str | None = None,
    current_user: User = Depends(valid_token_user),
):
    test_attempt_db = await test_attempt_service.get(id=id,db_session=db.session)

    if not test_attempt_db:
        raise TestAttemptNotFound()

    test_attempt_update = TestAttempt(
        re_evaluation_requested=re_evaluation_requested,
        re_evaluation_reason=re_evaluation_reason,
    )

    test_attempt_update_db = await test_attempt_service.update(
        obj_current=test_attempt_db,
        obj_new=test_attempt_update,db_session=db.session
    )

    return test_attempt_update_db


"""
Test Question Attempt routes
"""


@test_router.post(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def test_question_attempt(
    *,
    time_elapsed: float,
    answer_text: str | None = None,  # for SQ
    selected_options: list[OptionCMS] | None = None,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(valid_token_user),
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
        time_elapsed=time_elapsed,
        answer_text=answer_text,
        selected_options=selected_options,
    )
    question_attempt_db = await tq_attempt_service.create(
        obj_in=question_attempt, db_session=db.session
    )

    bckgrnd_tasks.add_task(process_question_attempt, test_attempt_id=test_attempt_id,q_id=q_id,usage = "post")

    return question_attempt_db


@test_router.put(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def update_test_question_attempt(
    *,
    time_elapsed: float,
    answer_text: str | None = None,
    selected_options: list[OptionCMS] | None = None,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(valid_token_user),
    bckgrnd_tasks: BackgroundTasks,
):
    tq_attempt_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tq_attempt_db:
        raise TestQuestionAttemptNotFound()

    q_attempt_update = TestQuestionAttemptUpdate(
        time_elapsed=time_elapsed,
        selected_options=selected_options,
        answer_text=answer_text,
    )

    # update q attempt
    update_question_attempt_db = await tq_attempt_service.update(
        obj_current=tq_attempt_db, obj_new=q_attempt_update, db_session=db.session
    )
    bckgrnd_tasks.add_task(process_question_attempt,test_attempt_id=test_attempt_id,q_id=q_id,usage = "update")

    return update_question_attempt_db


@test_router.get(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def get_test_question_attempt(
    *,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(valid_token_user),
):
    tq_attempt_db = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tq_attempt_db:
        TestQuestionAttemptNotFound()
    return tq_attempt_db


@test_router.get(
    "/attempts/{test_attempt_id}/questions",
    response_model=list[TestQuestionAttemptResponse],
)
async def get_all_test_question_attempts(
    *,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
):
    tq_attempts_db = await tq_attempt_service.get_all_tq_attempts(
        test_attempt_id=test_attempt_id, db_session=db.session
    )
    if not tq_attempts_db or len(tq_attempts_db) == 0:
        TestQuestionAttemptNotFound()
    return tq_attempts_db


@test_router.delete(
    "/attempts/{test_attempt_id}/questions/{q_id}",
    response_model=TestQuestionAttemptResponse,
)
async def delete_test_question_attempt(
    *,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(valid_token_user),
):
    question_attempt_db = await tq_attempt_service.del_test_question_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    ta_db = await test_attempt_service.get_by_field(value=test_attempt_id, field="id", db_session=db.session)

    if ta_db.unattempted is not None:
        ta_qs_count = ta_db.unattempted + 1
        ta_update_db = await test_attempt_service.update(obj_current=ta_db,obj_new={"unattempted":ta_qs_count}, db_session=db.session)   

    return question_attempt_db


@test_router.post("/attempts/{test_attempt_id}/questions/{q_id}/evaluations")
async def submit_tq_evaluation_mains(
    *,
    test_attempt_id: int,
    q_id: int,
    tq_attempt: TQEvaluationMains,
    current_user: User = Depends(valid_token_user),
):
    test_attempt_db: TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt_db:
        raise TestAttemptNotFound()

    tq_attempt_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    tq_attempt = TestQuestionAttempt(
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
            obj_current=tq_attempt_db, obj_new=tq_attempt, db_session=db.session
        )
    else:
        tqa_db = await tq_attempt_service.create(
            obj_in=tq_attempt, db_session=db.session
        )

    await process_question_attempt(tq_attempt=tqa_db,usage = "post mains")
    return tqa_db

"""
Test Record Elimination Routes
"""
@test_router_v2.post(
    "/prelims/attempts/{test_attempt_id}/questions/{q_id}/elimination",
    response_model=TestQuestionAttemptResponse,
)
@test_router.post(
    "/attempts/{test_attempt_id}/questions/{q_id}/elimination",
    response_model=TestQuestionAttemptResponse,
)
async def record_elimination(
    *,
    test_attempt_id: int,
    q_id: int,
    elimination_technique: ELIMINATION_TECHINQUE,
    current_user: User = Depends(valid_token_user),
):
    tqa_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tqa_db:
        raise TestQuestionAttemptNotFound()
    # ta: TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    eli_update = TestQuestionAttemptUpdate(elimination_technique=elimination_technique)
    # if not tqa_db:
    #     eli_in = TestQuestionAttemptCreate(
    #         test_attempt_id=test_attempt_id,
    #         test_id=ta.test_id,
    #         question_id=q_id,
    #         attempted_by_id=ta.attempted_by_id,
    #         elimination_technique=elimination_technique,
    #     )
    #     tqa_elimination_db = await tq_attempt_service.create(obj_in=eli_in, db_session=db.session)
    # else:
    # update q attempt
    tqa_elimination_db = await tq_attempt_service.update(
        obj_current=tqa_db, obj_new=eli_update, db_session=db.session
    )

    return tqa_elimination_db

@test_router_v2.delete(
    "/prelims/attempts/{test_attempt_id}/questions/{q_id}/elimination",
    response_model=TestQuestionAttemptResponse,
)
@test_router.delete(
    "/attempts/{test_attempt_id}/questions/{q_id}/elimination",
    response_model=TestQuestionAttemptResponse,
)
async def delete_record_elimination(
    *,
    test_attempt_id: int,
    q_id: int,
    current_user: User = Depends(valid_token_user),
):
    tqa_db: TestQuestionAttempt = await tq_attempt_service.get_tq_attempt(
        test_attempt_id=test_attempt_id, question_id=q_id, db_session=db.session
    )
    if not tqa_db:
        raise TestQuestionAttemptNotFound()

    update_tqa_elimination_db = await tq_attempt_service.update(
        obj_current=tqa_db, obj_new={"elimination_technique": None}, db_session=db.session
    )

    return update_tqa_elimination_db


# """
# Favourite Question Routes
# """


# @test_router.post("/{test_attempt_id}/questions/{q_id}/favorite")
# async def mark_unmark_favorite_question(
#     *, test_attempt_id: int, q_id: int, current_user: User = Depends(valid_token_user)
# ):
#     tq_attempt_db = await tq_attempt_service.get_tq_attempt(
#         test_attempt_id=test_attempt_id, question_id=q_id
#     )

#     if not tq_attempt_db:
#         tq_fav = await tq_attempt_service.create(
#             obj_in=TestQuestionAttempt(is_starred=True)
#         )

#     starred_value = not tq_attempt_db.is_starred if tq_attempt_db.is_starred else True

#     tq_fav = await tq_attempt_service.update(
#         obj_current=tq_attempt_db, obj_new=TestQuestionAttempt(is_starred=starred_value)
#     )
#     return tq_fav


# @test_router.get("/favorite/questions/{user_id}")
# async def favorite_questions(
#     *, user_id: int, current_user: User = Depends(valid_token_user)
# ):
#     fav_qs = await tq_attempt_service.get_fav_qs(
#         user_id=current_user.id, tenant_id=current_user.tenant_id
#     )
#     return fav_qs


"""
Test share routes
"""


@test_router.post("/{id}/share")
async def share_test(
    id: int,
    share_with_ids: list[int],
    current_user: User = Depends(valid_token_user),
):
    for share_with_id in share_with_ids:
        test_share_in = TestShareCreate(
            test_id=id, shared_by_id=current_user.id, shared_with_id=share_with_id
        )
        await test_share_service.create(obj_in=test_share_in, db_session=db.session)

    return {"success": True, "message": "Test shared successfully."}


@test_router.post("/{id}/share/register")
async def share_test(
    id: int,
    shared_by_id: int,
    current_user: User = Depends(valid_token_user),
):
    test_share_in = TestShareCreate(
        test_id=id, shared_by_id=shared_by_id, shared_with_id=current_user.id
    )
    await test_share_service.create(obj_in=test_share_in, db_session=db.session)

    return {"success": True, "message": "Test shared successfully."}


"""
Test results routes

"""


# @test_router.post("/{test_id}/analysis")
# async def aggregate_analysis(
#     test_id: int,
#     current_user: User = Depends(valid_token_user),
# ):
#     rank_percentile = await test_attempt_service.calculate_rank_percentile(
#         test_id=test_id, attempted_by_id=current_user.id
#     )
#     aggregates = await test_attempt_service.calculate_test_aggregates(test_id=test_id)

#     analysis = {**rank_percentile, **aggregates}

#     return analysis


@test_router.post("/{test_id}/attempts/{test_attempt_id}/evaluations")
async def submit_test_evaluation_mains(
    *,
    test_id: int,
    test_attempt_id: int,
    test_eval: TestEvaluationMains,
    bckgrnd_tasks: BackgroundTasks,
):
    test_attempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
    if not test_attempt:
        raise TestAttemptNotFound()

    user_db = await user_service.get(id=test_attempt.attempted_by_id, db_session=db.session)

    test_attempt_update = TestAttempt(
        evaluation_upload_url=test_eval.evaluation_upload_url,
        re_evaluation_upload_url=test_eval.re_evaluation_upload_url,
        unattempted=test_eval.unattempted,
        macro_comment=test_eval.macro_comment.model_dump(),
        status=TEST_ATTEMPT_STATUS.completed,
    )
    ta_update_db = await test_attempt_service.update(
        obj_current=test_attempt, obj_new=test_attempt_update, db_session=db.session
    )

    bckgrnd_tasks.add_task(
        process_test_submit,
        test_attempt_id=ta_update_db.id,
            user_id=user_db.id
    )

    return ta_update_db


@test_router.get(
    "/{test_id}/attempts/{test_attempt_id}/results", response_model=TestAttemptResult
)
async def get_results(
    test_id: int,
    test_attempt_id: int,
    # current_user: User = Depends(valid_token_user),
):
    results = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)

    rank_percentile = await test_attempt_service.calculate_rank_percentile(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    resp = [{**item._asdict()} for item in rank_percentile]
    print("resp>>>>>",resp)
    del resp[0]["test_id"] , resp[0]["id"]


    return results, resp[0]


@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/overall")
async def get_performance_overall(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
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
    result = await test_attempt_service.calc_score_time_accuracy_reports(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db.session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count<5:
        result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q if test_db.paper["id"] == settings.GS_PAPER_ID else settings.CSAT_AVG_TIME_PER_Q
        result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
        result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
    
    return {"questions_report": ta_report, "overall_report": result}


@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/accuracy")
async def get_performance_accuracy(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
):
    test_db = await test_service.get(id=test_id, db_session=db.session)
    ta_count = test_db.attempts_count
    results = await test_attempt_service.calc_accuracy_benchmark_subjects(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    if not len(results) > 0:
        return []
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db.session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count <5:
        res = []
        for item in results:
           
            item_dict = item._asdict()
            # subject_name = item_dict["subject_name"]
            # if subject_name in benchmark_dict:
            item_dict["others_subject_score"] = settings.SUBJECT_ACCURACY_BENCHMARK_SCORE
            # else:
            #     item_dict["others_subject_score"] = None

            res.append(item_dict)
        return res          
        
    else:
        # benchmark_dict = await fetch_subject_benchmarks(stage_id=test_db.stage["id"])
        res = [{**item._asdict()} for item in results]
        return res
        

@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/score")
async def get_performance_score(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
):
    test_db = await test_service.get(id=test_id, db_session=db.session)
    ta_count = test_db.attempts_count
    results = await test_attempt_service.calc_score_benchmark_subjects(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    user_res = [{**item._asdict()} for item in results[0]]
    others_res = [{**item._asdict()} for item in results[1]]
    res = []
    for subject1 in user_res:
        combined_subject = subject1.copy()
        for subject2 in others_res:
            if subject1["subject_name"] == subject2["subject_name"]:
                combined_subject.update(subject2)
                break
        res.append(combined_subject)
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db.session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count <5:
        resp = []
        for item_dict in res:
            # item_dict = item._asdict()
            # subject_name = item_dict["subject_name"]
            # if subject_name in benchmark_dict:
            item_dict["others_subject_score"] = settings.SUBJECT_BENCHMARK_SCORE
            # else:
            #     item_dict["others_subject_score"] = None

            resp.append(item_dict)

        return resp
        
    else:
        # benchmark_dict = await fetch_subject_benchmarks(stage_id=test_db.stage["id"])
        return res    
        # res = [{**item._asdict()} for item in results]
        # return res

        


@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/technique")
async def get_performance_technique(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
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


@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/subject/strength")
async def get_subject_matrix(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
):
    # results = await tq_attempt_service.calc_test_subject_matrix(
    #     test_id=test_id, test_attempt_id=test_attempt_id, user_id=current_user.id
    # )
    # total_res = await tq_attempt_service.calc_total_q_subject_matrix(test_id=test_id)

    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "high"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"

    results = await tq_attempt_service.calc_test_subj_strength(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )
    res = [{**item._asdict()} for item in results]

    for subject in res:
        for key, value in settings.MAX_MIN_Q_DIST.items():
            subj = key
            if subj == subject["subject_name"]:
                subj_min = value["min"]
                subj_max = value["max"]
                subject["score_category"] = categorize_score(subject["accuracy_percent"])
                subject["min_qs"] = subj_min
                subject["max_qs"] = subj_max

    return res


@test_router.get("/{test_id}/attempts/{test_attempt_id}/performance/topic/strength")
async def get_topic_matrix(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
):
    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "high"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"
    results = await tq_attempt_service.calc_test_topic_strength(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db.session
    )

    res = [{**item._asdict()} for item in results]
    
    for topic in res:
        topic["score_category"] = categorize_score(topic["accuracy_percent"])

    return res


@test_router.get("/{test_id}/attempts/{test_attempt_id}/questions/results")
async def get_test_question_results(
    test_id: int,
    test_attempt_id: int,
    current_user: User = Depends(valid_token_user),
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

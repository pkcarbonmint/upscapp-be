from .service import (
    TestAttemptService,
    TestService,
    TestQuestionAttemptService,
    TestQuestionService,
    TestShareService,
    QuestionFavoriteService
)
from src.users.service import UserService
from .schemas import *
from .exceptions import *
from .models import (
    Test,
    TestQuestion,
    TestAttempt,
    TestQuestionAttempt,
    TestShare,
    QuestionFavorite,
)
from src.users.models import User
from src.users.routes import service
from src.modules.questions.models import Question
from src.modules.questions.schemas import *
from src.modules.questions.service import QuestionService
from src.external.cms.service import *
from itertools import chain
from functools import reduce
from src.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_async_sqlalchemy import db

question_service = QuestionService(Question, db)
user_service = UserService(User,db)
test_service = TestService(Test, db)
tq_service = TestQuestionService(TestQuestion, db)
test_attempt_service = TestAttemptService(TestAttempt, db)
tq_attempt_service = TestQuestionAttemptService(TestQuestionAttempt, db)
favorite_q_service = QuestionFavoriteService(QuestionFavorite, db)
# test_share_service = TestShareService(TestShare, db)


async def process_test_submit(test_attempt_id: int, user_id: int):
    # process and update test attempt table - score, correct, incorrect, status. #rank and %ile can be updated on the fly
    async with db():
        user:User = await user_service.get(id=user_id, db_session=db.session)
        test_attempt:TestAttempt = await test_attempt_service.get(id=test_attempt_id, db_session=db.session)
        test_attempt_results = await tq_attempt_service.calculate_test_attempt_results(
            test_attempt_id=test_attempt.id, db_session=db.session
        )
    
        test_attempt_update = TestAttemptUpdate(
            correct=test_attempt_results.get("correct"),
            incorrect=test_attempt_results.get("incorrect"),
            score=test_attempt_results.get("score"),
            status=TEST_ATTEMPT_STATUS.completed,
        )
        await test_attempt_service.update(
            obj_current=test_attempt, obj_new=test_attempt_update, db_session=db.session
        )

        # process and update test table - attempts count, avg score, max score.
        test_aggregates = await test_attempt_service.calculate_test_aggregates(
            test_id=test_attempt.test_id, db_session=db.session
        )
        ta_count = await test_attempt_service.get_test_attempts_counts(
            test_id=test_attempt.test_id, db_session=db.session
        )

        test_db = await test_service.get(id=test_attempt.test_id, db_session=db.session)
        user_db = await service.get(id=user.id, db_session=db.session)

        test_update = Test(
            attempts_count=ta_count.get("attempts_count"),
            avg_score=test_aggregates.get("avg_score"),
            max_score=test_aggregates.get("max_score"),
            avg_accuracy=test_aggregates.get("avg_accuracy"),
            avg_time_per_q=test_aggregates.get("avg_time_per_q"),
        )
        print("ta_count>>>>>>", ta_count)
        user_test_attempts = await test_attempt_service.calculate_user_test_attempts(
            user_id=user.id, db_session=db.session
        )

        user_update = User(test_attempts_count=user_test_attempts.get("attempts_count"))
        await test_service.update(obj_current=test_db, obj_new=test_update, db_session=db.session)
        test_db = await test_service.get(id=test_attempt.test_id, db_session=db.session)
        # print("tests>>>>>>>>>???????????",test_db.__dict__ )
        await service.update(obj_current=user_db, obj_new=user_update, db_session=db.session)

        return test_aggregates

async def process_question_attempt_mains(test_attempt_id:int,q_id:int):
    async with db():
        tq_attempt = await tq_attempt_service.get_tq_attempt(test_attempt_id=test_attempt_id,question_id=q_id,db_session=db.session)
        q = await question_service.get(id=tq_attempt.question_id,db_session=db.session)
        test_db = await test_service.get(id=tq_attempt.test_id, db_session=db.session)
        # process and update question table - attempts_count, percent_correct
        q_aggregates = await tq_attempt_service.calculate_q_aggregates(
            question_id=tq_attempt.question_id, db_session=db.session
        )

        q_update = Question(
            attempts_count=q_aggregates["attempts_count"],
            correct_attempts_percent=q_aggregates["correct_attempts_percent"],
        )
        q_db = await question_service.update(obj_current=q, obj_new=q_update, db_session=db.session)
        # process and update test question table - attempts_count, percent_correct
        tq_aggregates = await tq_attempt_service.calculate_tq_aggregates(
            test_id=tq_attempt.test_id, question_id=tq_attempt.question_id, db_session=db.session
        )
        attempts_percent = (
            (tq_aggregates["attempts_count"] / test_db.attempts_count) * 100
            if test_db.attempts_count
            else 100
        )

        tq = await tq_service.get_test_question(
            test_id=tq_attempt.test_id, q_id=tq_attempt.question_id, db_session=db.session
        )

        tq_update = TestQuestion(
            attempts_count=tq_aggregates["attempts_count"],
            correct_attempts_percent=tq_aggregates["correct_attempts_percent"],
            attempts_percent=attempts_percent,
        )
        
        tq_db = await tq_service.update(obj_current=tq, obj_new=tq_update, db_session=db.session)
        return True


async def process_question_attempt(test_attempt_id:int,q_id:int, usage: str):
    # evaluate and update question attempt results if MCQ or CQ
    async with db():
        tq_attempt = await tq_attempt_service.get_tq_attempt(test_attempt_id=test_attempt_id,question_id=q_id,db_session=db.session)
        q = await question_service.get(id=tq_attempt.question_id,db_session=db.session)
        test_db = await test_service.get(id=tq_attempt.test_id, db_session=db.session)
        if q.question_type == QUESTION_TYPE.mcq or q.question_type == QUESTION_TYPE.cq:
            # evaluate q attempt
            selected_options: list[OptionCMS] = tq_attempt.selected_options
            is_correct_attempt = evaluate_mcq_attempt(selected_options, q.options)

            # calculate marks
            if not test_db:
                raise TestNotFound()
            marks = q.max_marks or test_db.paper["max_marks_per_question"]
            neg_marks = q.negative_marks or test_db.paper["negative_marks_per_question"]
            marks_obtained = marks if is_correct_attempt else -neg_marks

            # update q attempt with results
            q_attempt_update = TestQuestionAttemptUpdate(
                is_correct_attempt=is_correct_attempt, marks_obtained=marks_obtained
            )

            # update q attempt
            q_attempt_db = await tq_attempt_service.update(
                obj_current=tq_attempt, obj_new=q_attempt_update, db_session=db.session
            )

        # process and update question table - attempts_count, percent_correct
        q_aggregates = await tq_attempt_service.calculate_q_aggregates(
            question_id=tq_attempt.question_id, db_session=db.session
        )

        q_update = Question(
            attempts_count=q_aggregates["attempts_count"],
            correct_attempts_percent=q_aggregates["correct_attempts_percent"],
        )
        q_db = await question_service.update(obj_current=q, obj_new=q_update, db_session=db.session)
        # process the q option attempt and update q table
        q_options_result = await test_attempt_service.get_q_options_attempt_result(
            q_id=tq_attempt.question_id, db_session=db.session
        )
        q_option_resp = [{**item._asdict()} for item in q_options_result]

        print("q_OPTION>>>>>>", q_option_resp)

        new_options = []
        for option in q.options:
            for q_resp in q_option_resp:
                if str(q_resp["selected_option_id"]) == str(option["id"]):
                    new_option = option.copy()
                    new_option["attempts_percent"] = float(q_resp["attempts_option_perc"])
                    new_options.append(new_option)
                    break
            else:
                new_options.append(option)

            # else:
            #     if opt["attempts_percent"] == 0.0:
            #         opt["attempts_percent"]: 0.0
            #     else:
            #         opt["attempts_percent"]: float(item["attempts_option_perc"])
        q_update = QuestionUpdate(options=new_options)
        q_db = await question_service.update(
            obj_current=q_db,
            obj_new=q_update, db_session=db.session
        )

        # process and update test question table - attempts_count, percent_correct
        tq_aggregates = await tq_attempt_service.calculate_tq_aggregates(
            test_id=tq_attempt.test_id, question_id=tq_attempt.question_id, db_session=db.session
        )
        attempts_percent = (
            (tq_aggregates["attempts_count"] / test_db.attempts_count) * 100
            if test_db.attempts_count
            else 100
        )

        tq = await tq_service.get_test_question(
            test_id=tq_attempt.test_id, q_id=tq_attempt.question_id, db_session=db.session
        )

        tq_update = TestQuestion(
            attempts_count=tq_aggregates["attempts_count"],
            correct_attempts_percent=tq_aggregates["correct_attempts_percent"],
            attempts_percent=attempts_percent,
        )
        
        tq_db = await tq_service.update(obj_current=tq, obj_new=tq_update, db_session=db.session)
        if usage == "post":
            ta_db = await test_attempt_service.get_by_field(value=tq_attempt.test_attempt_id, field="id", db_session=db.session)
        
            t_qs_count = test_db.questions_count
            if (ta_db.unattempted is None or 0):
                ta_qs_count = t_qs_count - 1
            else:
                ta_qs_count = ta_db.unattempted - 1


            ta_update_db = await test_attempt_service.update(obj_current=ta_db,obj_new={"unattempted":ta_qs_count}, db_session=db.session)   

        return True


def evaluate_mcq_attempt(
    user_options: list[OptionCMS], options: list[OptionCMS]
) -> bool:
    is_correct: bool = False

    correct_options_ids = [option["id"] for option in options if option["is_correct"]]

    user_options_ids = [option["id"] for option in user_options]

    is_correct = set(user_options_ids) == set(correct_options_ids)

    return is_correct


async def add_test_questions(
    current_user: User,
    test_db: Test,
    questions_in: list[CuratedQuestion],
    max_marks_per_q: float,
    neg_marks_per_q: float,
    duration_per_q: float,
    db_session: AsyncSession | None = None,
) -> tuple[float, int]:
    added_max_marks: float = 0.0
    added_q_count: int = 0

    for question in questions_in:
        question_id = question.id  # cms_id

        """
        #check if question in db, if not fetch from cms and create in Question table
        #create entry in TestQuestion table
        """
        cms_qs_db = await question_service.get_questions_by_cms_id_type(
            # value=question_id, field="cms_id"
            cms_id=question_id,
            question_type=question.q_type, db_session= db_session
        )

        if (question.q_type == QUESTION_TYPE.mcq) or (
            question.q_type == QUESTION_TYPE.sq
        ):
            if not cms_qs_db or len(cms_qs_db) == 0:
                q = await fetch_q_by_id(q_type=question.q_type, id=question_id)
                cms_id = q.pop("id")
                max_marks_q = q.pop("maxMarks") or max_marks_per_q
                neg_marks_q = q.pop("negativeMarks") or neg_marks_per_q
                question_in = QuestionCreate(
                    **q,
                    cms_id=cms_id,
                    tenant_id=current_user.tenant_id,
                    question_type=question.q_type,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                )

                question_db = await question_service.create(obj_in=question_in,db_session= db_session)
            else:
                # question_db = cms_qs_db[0]
                q = await fetch_q_by_id(q_type=question.q_type, id=cms_qs_db[0].cms_id)
                cms_id = q.pop("id")
                max_marks_q = q.pop("maxMarks") or max_marks_per_q
                neg_marks_q = q.pop("negativeMarks") or neg_marks_per_q
                question_in = QuestionCreate(
                    **q,
                    cms_id=cms_id,
                    tenant_id=current_user.tenant_id,
                    question_type=question.q_type,
                    max_marks=max_marks_q,
                    negative_marks=neg_marks_q,
                )

                question_db = await question_service.update(obj_current=cms_qs_db[0],obj_new=question_in.model_dump(),db_session= db_session)

            test_question_db = await tq_service.get_test_question(
                test_id=test_db.id, q_id=question_db.id,db_session= db_session
            )

            if not test_question_db:
                tq_in = TestQuestionCreate(
                    test_id=test_db.id,
                    question_id=question_db.id,
                    max_marks=question_db.max_marks or max_marks_per_q,
                    negative_marks=question_db.negative_marks or neg_marks_per_q,
                    duration=duration_per_q,
                )
                test_question_db = await tq_service.create(obj_in=tq_in,db_session= db_session)
                # accumulate max marks
                added_max_marks += question_db.max_marks or max_marks_per_q
                added_q_count += 1

        elif question.q_type == QUESTION_TYPE.cq:
            # db_qs = await question_service.get_questions_by_cms_id_type(
            #     # value=question_id, field="cms_id"
            #     cms_id=question_id,
            #     question_type=question.q_type,
            # )
            if cms_qs_db and len(cms_qs_db) > 0:
                
                cq = await fetch_q_by_id(q_type=question.q_type, id=question_id)
                cms_id = cq.pop("id")
                cq_qs = cq.pop("questions")
                context = cq.pop("context")

                for q in cq_qs:
                    
                    q_num = q.pop("id")
                    max_marks_q = q.pop("maxMarks") or max_marks_per_q
                    neg_marks_q = q.pop("negativeMarks") or neg_marks_per_q
                    added_max_marks += max_marks_q
                    added_q_count += 1
                    question_db = await question_service.get_unique_constraint_q(
                    cms_id=cms_id, q_num=q_num, question_type=QUESTION_TYPE.cq,db_session= db_session
                )
                    question_in = QuestionCreate(
                        **q,
                        **cq,
                        q_num=q_num,
                        cms_id=cms_id,
                        question_type=QUESTION_TYPE.cq,
                        tenant_id=current_user.tenant_id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        context=context,
                    )

                    question_db = await question_service.update(obj_current=question_db,obj_new=question_in.model_dump(),db_session= db_session)


                    tq_in = TestQuestionCreate(
                        test_id=test_db.id,
                        question_id=question_db.id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        duration=duration_per_q,
                    )

                    test_question_db = await tq_service.create(obj_in=tq_in,db_session= db_session)
            else:
                cq = await fetch_q_by_id(q_type=question.q_type, id=question_id)
                cms_id = cq.pop("id")
                cq_qs = cq.pop("questions")
                context = cq.pop("context")

                for q in cq_qs:
                    q_num = q.pop("id")
                    max_marks_q = q.pop("maxMarks") or max_marks_per_q
                    neg_marks_q = q.pop("negativeMarks") or neg_marks_per_q

                    added_max_marks += max_marks_q
                    added_q_count += 1
                    question_in = QuestionCreate(
                        **q,
                        **cq,
                        q_num=q_num,
                        cms_id=cms_id,
                        question_type=QUESTION_TYPE.cq,
                        tenant_id=current_user.tenant_id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        context=context,
                    )

                    question_db = await question_service.create(obj_in=question_in,db_session= db_session)

                    tq_in = TestQuestionCreate(
                        test_id=test_db.id,
                        question_id=question_db.id,
                        max_marks=max_marks_q,
                        negative_marks=neg_marks_q,
                        duration=duration_per_q,
                    )

                    test_question_db = await tq_service.create(obj_in=tq_in,db_session= db_session)

    return added_max_marks, added_q_count


async def get_paper_subj_topic_used_qs(
    current_user: User,
    paper_id: int,
    subject_ids: list[int] | None = [],
    topic_ids: list[int] | None = [],
):
    if len(subject_ids) == 0:
        used_qs = await test_attempt_service.get_used_qs_count(
            paper_id=paper_id, user_id=current_user.id
        )
    else:
        if len(topic_ids) == 0:
            qs = await tq_attempt_service.get_used_q_count_by_subj_ids(
                paper_id=paper_id, user_id=current_user.id
            )
            res = [{**item._asdict()} for item in qs]
            count = 0
            for subj in res:
                if int(subj["subject_id"]) in subject_ids:
                    count = count + subj["used_questions"]
            used_qs = count
        else:
            group_resp = await group_topics_by_subj(
                subject_ids=subject_ids, topic_ids=topic_ids
            )
            print("group_resp", group_resp["subjs_w/o_topics"])
            qs = await tq_attempt_service.get_used_q_count_by_subj_ids(
                paper_id=paper_id, user_id=current_user.id
            )
            res = [{**item._asdict()} for item in qs]
            count = 0
            for subj in res:
                if int(subj["subject_id"]) in group_resp["subjs_w/o_topics"]:
                    count = count + subj["used_questions"]
            subj_q_count = count

            qs = await tq_attempt_service.get_used_q_count_by_topics(
                user_id=current_user.id
            )
            res = [{**item._asdict()} for item in qs]
            count = 0
            for item in res:
                if int(item["topic_id"]) in topic_ids:
                    count = count + item["used_questions"]
            topic_q_count = count
            used_qs = subj_q_count + topic_q_count
    return used_qs


async def create_test_qs(test_in: TestCreate, user: User,db_session: AsyncSession | None = None):
        cq_count: int = 0
        context_qs = []
        if test_in.subjects and len(test_in.subjects) > 0:
            subject_codes = [subject.code for subject in test_in.subjects]
        else:
            subject_codes = None

        if test_in.topics and len(test_in.topics) > 0:
            topic_codes = [topic.code for topic in test_in.topics]
            topic_ids = [topic.id for topic in test_in.topics]
        else:
            topic_codes = None
            topic_ids = None

        if test_in.test_type == TEST_TYPE.current_affairs or test_in.is_current_affairs == True:
            
            if (
                test_in.is_full_length == True
                or test_in.question_mode == TEST_SELECT_Q_MODE.all
            ):
                total_qs = await fetch_current_affairs_qs_with_category(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    topic_ids=topic_ids,
                    test_size=test_in.test_size,
                    category= CATEGORY.external,
                    is_external=True,
                    is_published=True
                )
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.unused
                and test_in.is_full_length == False
            ):
                used_qs = await test_attempt_service.get_ca_used_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    topic_codes=topic_codes,db_session=db_session
                )
                print("used_qs>>>", len(used_qs))
                # used_cms_q_ids = [tq.question.cms_id for tq in used_qs]
                cms_qs = await fetch_current_affairs_qs_with_category(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    topic_ids=topic_ids,
                    category= CATEGORY.external,
                    is_external=True,
                    is_published=True
                    # test_size=test_in.test_size,
                )
                
                # total_qs = [item for item in cms_qs if item not in used_qs]  # get unused qs
                # Extract the questions from used_qs
                used_questions = {q.question.cms_id for q in used_qs}
                
                # Filter cms_qs to get only the questions not in used_questions
                total_qs = [q for q in cms_qs if q['id'] not in used_questions]

                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs = total_qs
    
                # # Convert dictionaries to tuples
                # total_qs_tuples = [tuple(d.items()) for d in total_qs]

                # # Use random.sample on the tuples
                # selected_qs_tuples = random.sample(total_qs_tuples, test_in.test_size)

                # # Convert tuples back to dictionaries
                # total_qs = [dict(t) for t in selected_qs_tuples]
            # Q MODE - INCORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.incorrect
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_ca_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    topic_ids=topic_ids,db_session=db_session
                )
                total_qs = attempted_qs[1]
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
                print("INCORRECT CA QS")    
            # Q MODE - CORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.correct
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_ca_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    topic_ids=topic_ids,db_session=db_session
                )
                total_qs = attempted_qs[0]
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - OMITTED
            elif (
                # test_in.test_type == TEST_TYPE.custom
                test_in.question_mode == TEST_SELECT_Q_MODE.omitted
                and test_in.is_full_length == False
            ):
                omitted_qs = await test_attempt_service.get_ca_omitted_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    topic_ids=topic_ids,db_session=db_session
                )
                print("omitted ca qs?>>>", len(omitted_qs), topic_ids)
                # omitted_qs = [q.question for q in omitted_qs]
                total_qs = omitted_qs
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - FAV
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.favorite
                and test_in.is_full_length == False
            ):
                fav_qs = await favorite_q_service.get_ca_fav_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    topic_ids=topic_ids,db_session=db_session
                )
                total_qs = fav_qs
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs

        ## GS paper
        elif (
            test_in.paper.name == settings.GS_PAPER_NAME
        ):
            # Full length
            if test_in.is_full_length == True:
                total_qs = []
                for key, value in settings.GS_Q_DIST.items():
                    subj_code = key
                    subj_dist = value["dist"]
                    qs = await fetch_qs_by_codes_n_category(
                        q_type="MCQ",
                        tenant_id=user.tenant_id,
                        exam_id=test_in.exam.id,
                        paper_id=test_in.paper.id,
                        subject_codes=[subj_code],
                        test_size=subj_dist,
                        category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                    )
                    total_qs.append(qs)

                total_subj_qs = [
                    element for sublist in total_qs for element in sublist
                ]  # flatten list
                if len(total_subj_qs) != test_in.paper.number_of_questions:
                    test_size = test_in.paper.number_of_questions - len(total_subj_qs)
                    qs = await fetch_questions_with_category(
                        q_type="MCQ",
                        tenant_id=user.tenant_id,
                        paper_id=test_in.paper.id,
                        test_size=test_size,
                        category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                    )
                    total_qs.append(qs)

                total_qs = [
                    element for sublist in total_qs for element in sublist
                ]  # flatten list

            # Q MODE - ALL
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.all
                and test_in.is_full_length == False
            ):
                total_qs = await fetch_qs_by_codes_n_category(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    test_size=test_in.test_size,
                    category= CATEGORY.external,
                    is_external = True,
                    is_published=True
                )
                print("print>>>>>>>>>>>>>>>", len(total_qs))
            # Q MODE - UNUSED
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.unused
                and test_in.is_full_length == False
            ):
                used_qs = await test_attempt_service.get_used_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                # used_q_ids = [q.question.id for q in used_qs]
                cms_qs = await fetch_qs_by_codes_n_category(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    category= CATEGORY.external,
                    is_external = True,
                    is_published=True
                    # exclude_ids=used_q_ids,
                )
                # total_qs = [item for item in cms_qs if item not in used_qs]  # get unused qs
                # Extract the questions from used_qs
                used_questions = {q.question.cms_id for q in used_qs}
               
                # Filter cms_qs to get only the questions not in used_questions
                total_qs = [q for q in cms_qs if q['id'] not in used_questions]

                print("unused>>>", len(total_qs), len(cms_qs), len(used_qs), len(used_questions))
                
                # # Convert dictionaries to tuples
                # total_qs_tuples = [tuple(d.items()) for d in total_qs]

                # Use random.sample on the tuples
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs = total_qs
                # Convert tuples back to dictionaries
                # total_qs = [dict(t) for t in selected_qs_tuples]
               
            # Q MODE - INCORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.incorrect
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = attempted_qs[1]
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs

            # Q MODE - CORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.correct
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = attempted_qs[0]
                print("CORRECT QS>>>>>>>", len(total_qs))
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - OMITTED
            elif (
                # test_in.test_type == TEST_TYPE.custom
                test_in.question_mode == TEST_SELECT_Q_MODE.omitted
                and test_in.is_full_length == False
            ):
                omitted_qs = await test_attempt_service.get_omitted_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                # omitted_qs = [q.question for q in omitted_qs]
                total_qs = omitted_qs
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - FAV
            elif (
                test_in.test_type == TEST_TYPE.custom
                and test_in.question_mode == TEST_SELECT_Q_MODE.favorite
                and test_in.is_full_length == False
            ):
                fav_qs = await favorite_q_service.get_fav_qs_by_filter(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = fav_qs
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
        # CSAT paper
        elif (
            test_in.paper.name == settings.CSAT_PAPER_NAME
        ):
            # Full length
            print("CSAT>>>>>>>>>>")
            if test_in.is_full_length == True:
                total_qs = []

                cq_size = max(1, test_in.test_size * 0.10)
                print("cq_size", cq_size, type(cq_size))
                context_questions = await fetch_qs_by_codes_n_category(
                    q_type=QUESTION_TYPE.cq,
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    test_size=int(cq_size),
                    source=test_in.source,
                    category= CATEGORY.external,
                    is_external = True,
                    is_published=True
                )
                # total_qs.append(context_questions)
                context_qs = context_questions

                if context_questions and len(context_questions) > 0:
                    cq_count = reduce(
                        lambda x, y: x + len(y["questions"]), context_questions, 0
                    )
                    print("cq_qount>>>>", cq_count)

                for key, value in settings.CSAT_Q_DIST.items():
                    subj_code = key
                    subj_dist = value["dist"]

                    q_size = subj_dist
                    print("q_size", q_size)
                    questions = await fetch_qs_by_codes_n_category(
                        q_type=QUESTION_TYPE.mcq,
                        tenant_id=user.tenant_id,
                        exam_id=test_in.exam.id,
                        paper_id=test_in.paper.id,
                        subject_codes=[subj_code],
                        test_size=q_size,
                        source=test_in.source,
                        category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                    )
                    total_qs.append(questions)

                total_subj_qs = [
                    element for sublist in total_qs for element in sublist
                ]  # flatten list
                total_qs_count = len(total_subj_qs) + cq_count
                if total_qs_count != test_in.paper.number_of_questions:
                    test_size = test_in.paper.number_of_questions - total_qs_count
                    print("test_size>>>>", test_size)
                    qs = await fetch_questions_with_category(
                        q_type=QUESTION_TYPE.mcq,
                        tenant_id=user.tenant_id,
                        paper_id=test_in.paper.id,
                        test_size=test_size,
                        category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                    )
                    total_qs.append(qs)
                    print("extra_QS>>>>>>>>", len(qs))
                total_qs = [
                    element for sublist in total_qs for element in sublist
                ]  # flatten list

            # Q MODE - ALL
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.all
                and test_in.is_full_length == False
            ):
                total_qs = []
                cq_size = max(1, test_in.test_size * 0.10)
                print("cq_size", cq_size, type(cq_size))
                context_questions = await fetch_qs_by_codes_n_category(
                    q_type=QUESTION_TYPE.cq,
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    test_size=int(cq_size),
                    source=test_in.source,
                    category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                )
                # total_qs.append(context_questions)
                context_qs = context_questions

                if context_questions and len(context_questions) > 0:
                    cq_count = reduce(
                        lambda x, y: x + len(y["questions"]), context_questions, 0
                    )
                    

                q_size = test_in.test_size - cq_count
                
                questions = await fetch_qs_by_codes_n_category(
                    q_type=QUESTION_TYPE.mcq,
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    test_size=q_size,
                    source=test_in.source,
                    category= CATEGORY.external,
                    is_external = True,
                    is_published=True
                )
                total_qs.append(questions)
                total_qs = [
                    element for sublist in total_qs for element in sublist
                ]  # flatten list


            # Q MODE - UNUSED
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.unused
                and test_in.is_full_length == False
            ):
                total_qs = []
                used_qs = await test_attempt_service.get_used_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                print("used_qs>>>>", len(used_qs))
                # used_mcqs = [q for q in used_qs if q.question.question_type == 'MCQ']
                # used_cqs = [q for q in used_qs if q.question.question_type == 'CQ']

                # used_q_ids = [q.question.id for q in used_qs]
                cms_mcq_qs = await fetch_qs_by_codes_n_category(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                )
                cms_cq_qs = await fetch_qs_by_codes_n_category(
                    q_type=QUESTION_TYPE.cq,
                    tenant_id=user.tenant_id,
                    exam_id=test_in.exam.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,
                    category= CATEGORY.external,
                        is_external = True,
                        is_published=True
                )   

                #  # Extract the questions from used_qs
                # used_mcq_questions = {q.question.question for q in used_mcqs}
                # used_cq_questions = {q.question.context for q in used_cqs}
                used_mcq_questions = set()
                used_cq_questions = set()

                for q in used_qs:
                    if q.question.question_type == 'MCQ':
                        used_mcq_questions.add(q.question.cms_id)
                    elif q.question.question_type == 'CQ':
                        used_cq_questions.add(q.question.cms_id)
               
                # Filter cms_qs to get only the questions not in used_questions
                unused_mcq_qs = [q for q in cms_mcq_qs if q['id'] not in used_mcq_questions]
                unused_cq_qs = [q for q in cms_cq_qs if q['id'] not in used_cq_questions]
               
                print("unused_csat>>>>>", len(unused_cq_qs),len(unused_mcq_qs), len(used_mcq_questions), len(used_cq_questions))
                if len(unused_cq_qs) >0:
                    cq_size = int(max(1, test_in.test_size * 0.10))
                    if len(unused_cq_qs) > cq_size:
                        context_qs = random.sample(unused_cq_qs, cq_size)
                    else:
                        context_qs = unused_cq_qs    
                    cq_count = reduce(
                        lambda x, y: x + len(y["questions"]), context_qs, 0
                    )
                mcq_q_size = test_in.test_size - cq_count
                if mcq_q_size > 0:
                    if len(unused_mcq_qs) > mcq_q_size:
                        total_qs = random.sample(unused_mcq_qs, mcq_q_size)
                    else:
                        total_qs = unused_mcq_qs   
                else:
                    context_qs = []
                    cq_count = 0
                    if len(unused_mcq_qs) > test_in.test_size:
                        total_qs = random.sample(unused_mcq_qs, test_in.test_size)
                    else:
                        total_qs = unused_mcq_qs    
            # Q MODE - INCORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.incorrect
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = attempted_qs[1]
                print("total_qs>>>>>>>", len(total_qs))
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - CORRECT
            elif (
                test_in.question_mode == TEST_SELECT_Q_MODE.correct
                and test_in.is_full_length == False
            ):
                attempted_qs = await tq_attempt_service.get_tq_ans_qs(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = attempted_qs[0]
                print("total_qs>>>>>>>", len(total_qs))
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - OMITTED
            elif (
                test_in.test_type == TEST_TYPE.custom
                and test_in.question_mode == TEST_SELECT_Q_MODE.omitted
                and test_in.is_full_length == False
            ):
                omitted_qs = await test_attempt_service.get_omitted_qs(
                    paper_id=test_in.paper.id,
                    user_id=user.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                # omitted_qs = [q.question for q in omitted_qs]
                total_qs = omitted_qs
                print("omitted_qs", len(omitted_qs))
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
            # Q MODE - FAV
            elif (
                test_in.test_type == TEST_TYPE.custom
                and test_in.question_mode == TEST_SELECT_Q_MODE.favorite
                and test_in.is_full_length == False
            ):
                fav_qs = await favorite_q_service.get_fav_qs_by_filter(
                    user_id=user.id,
                    paper_id=test_in.paper.id,
                    subject_codes=subject_codes,
                    topic_codes=topic_codes,db_session=db_session
                )
                total_qs = fav_qs
                if len(total_qs) > test_in.test_size:
                    total_qs = random.sample(total_qs, test_in.test_size)
                else:
                    total_qs
        else:
            raise HTTPException(status_code=422,detail="Incorrect inputs")
        return {"cq_count": cq_count, "total_qs": total_qs, "context_qs": context_qs}

async def create_test_mains_qs(test_in: TestCreateMains, user: User,db_session: AsyncSession | None = None):
        
        if test_in.subjects and len(test_in.subjects) > 0:
            subject_ids = [subject.id for subject in test_in.subjects]
        else:
            subject_ids = None

        # if test_in.paper and len(test_in.papers) > 0:
        #     paper_ids = [paper.id for paper in test_in.papers]
        # else:
        #     paper_ids = None

        if test_in.topics and len(test_in.topics) > 0:
            
            topic_ids = [topic.id for topic in test_in.topics]
        else:
            
            topic_ids = None
       
        # Q MODE - ALL
        if (
            test_in.question_mode == TEST_SELECT_Q_MODE.all
        ):
            total_qs = await fetch_questions_with_category(
                                        q_type= QUESTION_TYPE.sq,
                                        tenant_id=user.tenant_id,
                                        exam_id=test_in.exam.id,
                                        paper_id=test_in.paper.id,
                                        subject_ids=subject_ids,
                                        topic_ids=topic_ids,
                                        test_size=test_in.test_size,
                                        category= CATEGORY.external,
                                        is_external = True,
                                        is_published=True)
            print("print>>>>>>>>>>>>>>>", len(total_qs))
        # Q MODE - UNUSED
        elif (
            test_in.question_mode == TEST_SELECT_Q_MODE.unused
          
        ):
            used_qs = await test_attempt_service.get_used_mains_qs(
                user_id=user.id,
                paper_ids=[test_in.paper.id], subject_ids=subject_ids,topic_ids=topic_ids,db_session=db_session
            )
            # used_q_ids = [q.question.id for q in used_qs]
            cms_qs = await fetch_questions_with_category(
                                        q_type= QUESTION_TYPE.sq,
                                        tenant_id=user.tenant_id,
                                        exam_id=test_in.exam.id,
                                        paper_id=test_in.paper.id,
                                        subject_ids=subject_ids,
                                        topic_ids=topic_ids,
                                        test_size=test_in.test_size,
                                        category= CATEGORY.external,
                                        is_external = True,
                                        is_published=True
                                )
            # total_qs = [item for item in cms_qs if item not in used_qs]  # get unused qs
            # Extract the questions from used_qs
            used_questions = {q.question.cms_id for q in used_qs}
            
            # Filter cms_qs to get only the questions not in used_questions
            total_qs = [q for q in cms_qs if q['id'] not in used_questions]

            print("unused>>>", len(total_qs), len(cms_qs), len(used_qs), len(used_questions))
            
            # # Convert dictionaries to tuples
            # total_qs_tuples = [tuple(d.items()) for d in total_qs]

            # Use random.sample on the tuples
            if len(total_qs) > test_in.test_size:
                total_qs = random.sample(total_qs, test_in.test_size)
            else:
                total_qs = total_qs
            # Convert tuples back to dictionaries
            # total_qs = [dict(t) for t in selected_qs_tuples]
            
        # Q MODE - INCORRECT
        elif (
            test_in.question_mode == TEST_SELECT_Q_MODE.incorrect
        ):
            attempted_qs = await tq_attempt_service.get_tq_ans_qs_mains(
                user_id=user.id,
                paper_ids=[test_in.paper.id],
                subject_ids=subject_ids,
                topic_ids=topic_ids,db_session=db_session
            )
            total_qs = attempted_qs[1]
            if len(total_qs) > test_in.test_size:
                total_qs = random.sample(total_qs, test_in.test_size)
            else:
                total_qs

        # Q MODE - CORRECT
        elif (
            test_in.question_mode == TEST_SELECT_Q_MODE.correct
        ):
            attempted_qs = await tq_attempt_service.get_tq_ans_qs_mains(
                user_id=user.id,
                paper_ids=[test_in.paper.id],
                subject_ids=subject_ids,
                topic_ids=topic_ids,db_session=db_session
            )
            total_qs = attempted_qs[0]
            print("CORRECT QS>>>>>>>", len(total_qs))
            if len(total_qs) > test_in.test_size:
                total_qs = random.sample(total_qs, test_in.test_size)
            else:
                total_qs
        # Q MODE - OMITTED
        elif (
            # test_in.test_type == TEST_TYPE.custom
            test_in.question_mode == TEST_SELECT_Q_MODE.omitted
        ):
            omitted_qs = await test_attempt_service.get_omitted_qs_mains(
                user_id=user.id,
                paper_ids=[test_in.paper.id],
                subject_ids=subject_ids,
                topic_ids=topic_ids,db_session=db_session
            )
            # omitted_qs = [q.question for q in omitted_qs]
            total_qs = omitted_qs
            if len(total_qs) > test_in.test_size:
                total_qs = random.sample(total_qs, test_in.test_size)
            else:
                total_qs
        # Q MODE - FAV
        elif (
            test_in.test_type == TEST_TYPE.custom
            and test_in.question_mode == TEST_SELECT_Q_MODE.favorite
        ):
            fav_qs = await favorite_q_service.get_fav_mains_qs_by_filter(
               user_id=user.id,
                paper_ids=[test_in.paper.id],
                subject_ids=subject_ids,
                topic_ids=topic_ids,db_session=db_session
            )
            total_qs = fav_qs
            if len(total_qs) > test_in.test_size:
                total_qs = random.sample(total_qs, test_in.test_size)
            else:
                total_qs
        # CSAT paper
        else:
            raise HTTPException(status_code=422,detail="Incorrect inputs")
        return {"total_qs": total_qs}
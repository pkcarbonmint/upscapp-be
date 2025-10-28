from itertools import chain
from src.modules.contentmgnt.schemas import CATEGORY
from src.modules.tests.service import (
    TestService,
    TestQuestionService,
    TestAttemptService,
    TestQuestionAttemptService,
    TestShareService,
    QuestionFavoriteService,
)
from src.modules.tests.models import *
from src.external.cms.service import get_paper_ids, get_paper_q_count, get_stage_q_count
from fastapi_async_sqlalchemy import db
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from typing import Any
from strapi_client import process_data
from src.external.cms.service import strapi, fetch_subjects
from src.modules.tests.exceptions import TestAttemptNotFound
from src.modules.tests.schemas import TEST_TYPE, TestAttemptResult, TestAttemptResponse, ComparativeAnalysis



test_service = TestService(Test, db)
test_question_service = TestQuestionService(TestQuestion, db)
test_attempt_service = TestAttemptService(TestAttempt, db)
tq_attempt_service = TestQuestionAttemptService(TestQuestionAttempt, db)
test_share_service = TestShareService(TestShare, db)
favorite_q_service = QuestionFavoriteService(QuestionFavorite, db)

async def agg_pef_summary(current_user, paper_id,from_date,
        till_date, db_session: AsyncSession | None = None):

    fl_test_taken = await test_attempt_service.agg_test_type_reports(
        paper_id=paper_id, user_id=current_user.id, from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    test_type_res = [{**item._asdict()} for item in fl_test_taken]
    ta_qs = await test_attempt_service.agg_ta_qs_results(
        user_id=current_user.id, paper_id=paper_id,from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    ta_rank_perc = await test_attempt_service.agg_calc_rank_percentile(
        user_id=current_user.id, paper_id=paper_id,from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    if len(ta_rank_perc)>0:
        rank_perc_list = [{**item._asdict()} for item in ta_rank_perc]
        ta_rank_perc = next(item for item in rank_perc_list if item["user_id"] == current_user.id)
        del ta_rank_perc["user_id"]

    # Non Full length tests
    tests_created = await test_service.get_tests_created_count(
        user_id=current_user.id, tenant_id=current_user.tenant_id, paper_id=paper_id,db_session=db_session
    )
    used_qs = await test_attempt_service.get_used_qs_count_by_paper_mode(
        paper_id=paper_id,from_date=from_date, till_date=till_date,
        user_id=current_user.id,db_session=db_session
    )
    used_qs = [{**item._asdict()} for item in used_qs]
   
    mcq_count = await get_paper_q_count(
        q_type="MCQ", tenant_id=current_user.tenant_id, paper_id=paper_id,category=CATEGORY.external,
        is_external=True
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
        user_id=current_user.id, from_date=from_date, till_date=till_date,paper_id=paper_id,db_session=db_session
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

async def agg_prelims_pef_summary(current_user, stage_ids,from_date,
        till_date, db_session: AsyncSession | None = None):

    fl_test_taken = await test_attempt_service.agg_prelims_test_type_reports(
        stage_ids=stage_ids, user_id=current_user.id, from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    test_type_res = [{**item._asdict()} for item in fl_test_taken]
    ta_qs = await test_attempt_service.agg_prelims_ta_qs_results(
        user_id=current_user.id, stage_ids=stage_ids,from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    ta_rank_perc = await test_attempt_service.agg_prelims_calc_rank_percentile(
        user_id=current_user.id, stage_ids=stage_ids,from_date=from_date, till_date=till_date, is_full_length=True,db_session=db_session
    )
    if len(ta_rank_perc)>0:
        rank_perc_list = [{**item._asdict()} for item in ta_rank_perc]
        ta_rank_perc = next(item for item in rank_perc_list if item["user_id"] == current_user.id)
        del ta_rank_perc["user_id"]

    # Non Full length tests
    tests_created = await test_service.get_prelims_tests_created_count(
        user_id=current_user.id, tenant_id=current_user.tenant_id, stage_ids=stage_ids,db_session=db_session
    )
    used_qs = await test_attempt_service.get_prelims_used_qs_count_by_paper_mode(
        stage_ids=stage_ids,from_date=from_date, till_date=till_date,
        user_id=current_user.id,db_session=db_session
    )
    used_qs = [{**item._asdict()} for item in used_qs]
   
    mcq_count = await get_stage_q_count(
        q_type="MCQ", tenant_id=current_user.tenant_id, stage_ids=stage_ids,category=CATEGORY.external,
        is_external=True
    )
    cq_count = await get_stage_q_count(q_type="CQ", tenant_id=current_user.tenant_id, stage_ids=stage_ids,category=CATEGORY.external,
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
    tests_taken = await test_attempt_service.agg_prelims_ta_mode_results(
        user_id=current_user.id, from_date=from_date, till_date=till_date,stage_ids=stage_ids,db_session=db_session
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
        }
    }
 

async def agg_overall(current_user,from_date,till_date,paper_id,db_session: AsyncSession | None = None):

    result = await test_attempt_service.agg_score_time_accuracy_by_time_filters(
        from_date=from_date, till_date=till_date,
        paper_id=paper_id,
        user_id=current_user.id,
        full_length_result=True,db_session=db_session
    )
    qs_ans_report = await tq_attempt_service.calc_tq_fl_answered_with_time_filters(
        paper_id=paper_id,from_date=from_date, till_date=till_date, user_id=current_user.id,db_session=db_session
    )
    ta_count = await test_attempt_service.get_count(db_session=db_session)
   
    if ta_count > 5:
        return result, qs_ans_report
    else:
        result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
       
        result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q if paper_id == 2 else settings.CSAT_AVG_TIME_PER_Q
   
        result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
        return result, qs_ans_report

async def agg_prelims_overall(current_user,from_date,till_date,stage_ids,db_session: AsyncSession | None = None):

    result = await test_attempt_service.agg_score_time_accuracy_by_time_n_stage_filters(
        from_date=from_date, till_date=till_date,
        stage_ids=stage_ids,
        user_id=current_user.id,
        full_length_result=True,db_session=db_session
    )
    qs_ans_report = await tq_attempt_service.calc_prelims_tq_fl_answered_with_time_filters(
        stage_ids=stage_ids,from_date=from_date, till_date=till_date, user_id=current_user.id,db_session=db_session
    )
    ta_count = await test_attempt_service.get_count(db_session=db_session)
   
    if ta_count > 5:
        return result, qs_ans_report
    else:
        result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
       
        result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q 
   
        result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
        return result, qs_ans_report
    
async def agg_trend(current_user,paper_id,from_date,till_date,full_length_result,db_session: AsyncSession | None = None):
    results = await test_attempt_service.get_performance_trend_subjects(
        paper_id=paper_id,
        from_date=from_date,
        till_date=till_date,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db_session
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
        user_id=current_user.id, paper_id=paper_id, full_length_result = full_length_result,db_session=db_session
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
    
    return {"over_all": overall_result}, res

async def agg_prelims_trend(current_user,stage_ids,from_date,till_date,full_length_result,db_session: AsyncSession | None = None):
    results = await test_attempt_service.get_prelims_performance_trend_subjects(
        stage_ids=stage_ids,
        from_date=from_date,
        till_date=till_date,
        user_id=current_user.id,
        full_length_result=full_length_result,db_session=db_session
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

    overall_result = await test_attempt_service.get_prelims_overall_performance_trend(
        user_id=current_user.id, stage_ids=stage_ids, full_length_result = full_length_result,db_session=db_session
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
    
    return {"over_all": overall_result}, res

async def agg_paper_mains_trend(current_user_id,from_date,till_date,paper_ids:int | None = None,db_session: AsyncSession | None = None):
    results = await test_attempt_service.get_performance_mains_trend_papers(
       
        from_date=from_date,
        till_date=till_date,
        user_id=current_user_id,
        db_session=db_session
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

    overall_result = await test_attempt_service.get_overall_mains_perf_trend(
        user_id=current_user_id, paper_ids=paper_ids,db_session=db_session
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
    
    return {"over_all": overall_result}, res

async def agg_subj_mains_trend(current_user_id,from_date,till_date,db_session: AsyncSession | None = None):
    results = await test_attempt_service.get_performance_mains_trend_subjects( 
        from_date=from_date,
        till_date=till_date,
        user_id=current_user_id,
        db_session=db_session
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
    subj_ids = await test_attempt_service.get_subject_ids_attempted_by_user(user_id=current_user_id,db_session=db_session)
    overall_result = await test_attempt_service.get_overall_mains_perf_trend(
        user_id=current_user_id, subject_ids=subj_ids,db_session=db_session
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
    
    return {"over_all": overall_result}, res

async def agg_score_bnmark(current_user,paper_id,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):
        ta_count = await test_attempt_service.get_count(db_session=db_session)
        results = await test_attempt_service.get_agg_score_benchmark_with_time_filters(
            paper_id=paper_id,
            user_id=current_user.id,
            from_date=from_date,
            till_date=till_date,
            full_length_result=is_full_length,db_session=db_session
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
                item_dict["others_subject_score"] = settings.SUBJECT_BENCHMARK_SCORE
                res.append(item_dict)

            return res
        
async def agg_prelims_score_bnmark(current_user,stage_ids,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):
        ta_count = await test_attempt_service.get_count(db_session=db_session)
        results = await test_attempt_service.get_prelims_agg_score_benchmark_with_time_filters(
            stage_ids=stage_ids,
            user_id=current_user.id,
            from_date=from_date,
            till_date=till_date,
            full_length_result=is_full_length,db_session=db_session
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
                item_dict["others_subject_score"] = settings.SUBJECT_BENCHMARK_SCORE
                res.append(item_dict)

            return res


async def agg_mains_score_bnmark(current_user_id,db_session: AsyncSession | None = None):
        ta_count = await test_attempt_service.get_count(db_session=db_session)
        results = await test_attempt_service.get_agg_mains_score_benchmark(
           
            user_id=current_user_id,
           db_session=db_session
        )
        if not len(results) > 0:
            return []
        res = [{**item._asdict()} for item in results]
        return res
        
async def agg_accuracy_bnmark(current_user,paper_id,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):
    ta_count = await test_attempt_service.get_count(db_session=db_session)

    results = await test_attempt_service.get_agg_accuracy_benchmark_with_time_filters(
        user_id=current_user.id,
        paper_id=paper_id,
        from_date=from_date,
        till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
    )
    if not len(results) > 0:
        return []
    if ta_count > 5:
        
        res = [{**item._asdict()} for item in results]
        return res
    else:
        res = []
        for item in results:
            item_dict = item._asdict()
           
            item_dict["others_subject_score"] = settings.SUBJECT_ACCURACY_BENCHMARK_SCORE

            res.append(item_dict)

        return res        

async def agg_prelims_accuracy_bnmark(current_user,stage_ids,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):
    ta_count = await test_attempt_service.get_count(db_session=db_session)

    results = await test_attempt_service.get_prelims_agg_accuracy_benchmark_with_time_filters(
        user_id=current_user.id,
        stage_ids=stage_ids,
        from_date=from_date,
        till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
    )
    if not len(results) > 0:
        return []
    if ta_count > 5:
        
        res = [{**item._asdict()} for item in results]
        return res
    else:
        res = []
        for item in results:
            item_dict = item._asdict()
           
            item_dict["others_subject_score"] = settings.SUBJECT_ACCURACY_BENCHMARK_SCORE

            res.append(item_dict)

        return res        

async def agg_technique(current_user,paper_id,is_full_length,from_date,till_date,db_session: AsyncSession | None = None):
    def categorize_score(score):
        if score < settings.PERF_TECH_LOW:
            return "Low"
        elif settings.PERF_TECH_MED_MIN <= score <= settings.PERF_TECH_MED_MAX:
            return "Medium"
        elif settings.PERF_TECH_HIGH_MIN < score <= settings.PERF_TECH_HIGH_MAX:
            return "High"
        else:
            return "unknown"

    res = await tq_attempt_service.calc_agg_technique_results_time_filters(
        user_id=current_user.id,
        paper_id=paper_id,
        db_session=db_session,
        from_date=from_date,
        till_date=till_date,
        full_length_result=is_full_length,
    )
    res2 = [{**item._asdict()} for item in res]
    for subject in res2:
        subject["effectiveness"] = categorize_score(
            
                (subject["accuracy_percent"])
               
        )

    return res2

async def agg_prelims_technique(current_user,stage_ids,is_full_length,from_date,till_date,db_session: AsyncSession | None = None):
    def categorize_score(score):
        if score < settings.PERF_TECH_LOW:
            return "Low"
        elif settings.PERF_TECH_MED_MIN <= score <= settings.PERF_TECH_MED_MAX:
            return "Medium"
        elif settings.PERF_TECH_HIGH_MIN < score <= settings.PERF_TECH_HIGH_MAX:
            return "High"
        else:
            return "unknown"

    res = await tq_attempt_service.calc_prelims_agg_technique_results_time_filters(
        user_id=current_user.id,
        stage_ids=stage_ids,
        db_session=db_session,
        from_date=from_date,
        till_date=till_date,
        full_length_result=is_full_length,
    )
    res2 = [{**item._asdict()} for item in res]
    for subject in res2:
        subject["effectiveness"] = categorize_score(
            
                (subject["accuracy_percent"])
               
        )

    return res2

async def agg_subj_analysis(current_user,paper_id,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):

    def categorize_score(score):
            if score < settings.SCORE_LOW:
                return "Low"
            elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
                return "Medium"
            elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
                return "High"
            elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
                return "Very High"
            else:
                return "unknown"


    results = await tq_attempt_service.calc_agg_subject_matrix_time_filters(
        paper_id=paper_id,
        user_id=current_user.id,
        from_date=from_date,till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
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

async def agg_prelims_subj_analysis(current_user,stage_ids,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):

    def categorize_score(score):
            if score < settings.SCORE_LOW:
                return "Low"
            elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
                return "Medium"
            elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
                return "High"
            elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
                return "Very High"
            else:
                return "unknown"


    results = await tq_attempt_service.calc_perlims_agg_subject_matrix_time_filters(
        stage_ids=stage_ids,
        user_id=current_user.id,
        from_date=from_date,till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
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

async def agg_topic_analysis(current_user,paper_id,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):

    def categorize_score(score):

        if score < settings.SCORE_LOW:
            return "Low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "Medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "High"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"


    results = await tq_attempt_service.calc_agg_topic_matrix_with_time_filters(
        paper_id=paper_id,
        user_id=current_user.id,
        from_date=from_date,till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])

    return res

async def agg_prelims_topic_analysis(current_user,stage_ids,from_date,till_date,is_full_length,db_session: AsyncSession | None = None):

    def categorize_score(score):

        if score < settings.SCORE_LOW:
            return "Low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "Medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "High"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"


    results = await tq_attempt_service.calc_prelims_agg_topic_matrix_with_time_filters(
        stage_ids=stage_ids,
        user_id=current_user.id,
        from_date=from_date,till_date=till_date,
        full_length_result=is_full_length,db_session=db_session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])

    return res

async def agg_mains_test_scores(current_user_id,db_session:AsyncSession| None = None):

    ta_result = await test_attempt_service.agg_ta_avg_high_low_score(user_id=current_user_id,db_session=db_session)

    return {"score_summary":ta_result}

async def check_user_mains_testattempt(current_user_id,db_session:AsyncSession| None = None):
    attempt_count = await test_attempt_service.get_count_by_filters(filters={"attempted_by_id":current_user_id}, db=db_session)
    attempt_eval_count = await test_attempt_service.get_mains_test_eval_count(user_id=current_user_id, db_session=db_session)

    return {"attempt_count":attempt_count, "attempt_eval_count": attempt_eval_count}


async def agg_mains_perf_summmary(current_user_id,db_session: AsyncSession | None = None):
    tests_taken = await test_attempt_service.calc_main_test_attempts_by_stages(user_id=current_user_id,db_session=db_session)
    test_type_res = [{**item._asdict()} for item in tests_taken]
    ta_qs = await test_attempt_service.agg_mains_ta_qs_results(
        user_id=current_user_id,db_session=db_session
    )
    ta_rank_perc = await test_attempt_service.agg_mains_calc_rank_percentile(
        user_id=current_user_id,db_session=db_session
    )
    if len(ta_rank_perc)>0:
        rank_perc_list = [{**item._asdict()} for item in ta_rank_perc]
        ta_rank_perc = next(item for item in rank_perc_list if item["user_id"] == current_user_id)
        del ta_rank_perc["user_id"]
    
    return {
            "tests_taken": test_type_res,
            "qs_ans": ta_qs,
            "rank_percentile": ta_rank_perc
        }
    
async def aggr_mains_paper_perf(current_user_id,db_session: AsyncSession | None = None):
    ta_qs = await test_attempt_service.agg_mains_paper_wise_perf(
        user_id=current_user_id, db_session=db_session
    )
    ta_res = [{**item._asdict()} for item in ta_qs]
    return ta_res
    
async def agg_mains_paper_analysis(current_user_id,db_session: AsyncSession | None = None):

    def categorize_score(score):
            if score < settings.SCORE_LOW:
                return "Low"
            elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
                return "Medium"
            elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
                return "High"
            elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
                return "Very High"
            else:
                return "unknown"


    results = await tq_attempt_service.calc_aggr_mains_paper_strength(
        user_id=current_user_id, db_session=db_session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])
        # for key, value in settings.MAX_MIN_Q_DIST.items():
        #     subj = key
        #     if subj == subject["paper_name"]:
        #         subj_min = value["min"]
        #         subj_max = value["max"]
        #         subject["score_category"] = categorize_score(subject["accuracy_percent"])
        #         subject["min_qs"] = subj_min
        #         subject["max_qs"] = subj_max

    return res

async def agg_mains_subj_analysis(current_user_id,db_session: AsyncSession | None = None):

    def categorize_score(score):
            if score < settings.SCORE_LOW:
                return "Low"
            elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
                return "Medium"
            elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
                return "High"
            elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
                return "Very High"
            else:
                return "unknown"


    results = await tq_attempt_service.calc_aggr_mains_subj_strength(
       user_id=current_user_id, db_session=db_session
    )
    res = [{**item._asdict()} for item in results]
    for subject in res:
        subject["score_category"] = categorize_score(subject["accuracy_percent"])
    # for subject in res:
    #     for key, value in settings.MAX_MIN_Q_DIST.items():
    #         subj = key
    #         if subj == subject["subject_name"]:
    #             subj_min = value["min"]
    #             subj_max = value["max"]
    #             subject["score_category"] = categorize_score(subject["accuracy_percent"])
    #             subject["min_qs"] = subj_min
    #             subject["max_qs"] = subj_max

    return res

async def agg_mains_tests_analysis(current_user_id,db_session: AsyncSession | None = None):
    ta_qs = await tq_attempt_service.agg_mains_tests_analysis(
        user_id=current_user_id, db_session=db_session
    )
    # ta_res = [{**item._asdict()} for item in ta_qs]
    return ta_qs

async def get_topics(subject_id:int):
    filters = {"subjects": {"id": {"$eq": subject_id}}}
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    response = await strapi.get_entries(
        "topics",
        filters=filters, populate=populate, get_all=True
    )
    return process_data(entry=response)

async def get_topic_by_id(topic_id:int):
    filters = {"id": {"$eq": topic_id}}
    populate = {"fields": ['id', 'name', "code"]}
    response = await strapi.get_entries(
        "topics",
        filters=filters, populate=populate, get_all=True
    )
    return process_data(entry=response)

async def get_subjects(paper_id:int):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])

    return res_process["subjects"]

async def test_topic_analysis(topic_analysis,paper_id:int):

    subjects = await get_subjects(paper_id=paper_id)
   
    topic_wise_resp = []
    test_topics = {perf['topic_name']: perf for perf in topic_analysis}
    # Step 3 and 4: For each subject, fetch topics and combine with performance data
    for subject in subjects:
        topics = await get_topics(subject_id=subject["id"])
        # print("t>>>>", topics)
        
        subject_with_performance = {
            "subject_name": subject["name"],
            "topics": []
        }
        
        for topic in topics:
            topic_name = topic['name']
            if topic_name in test_topics:
                performance = test_topics[topic_name]
                if performance:
                    subject_with_performance["topics"].append(performance)
        if subject_with_performance["topics"] :
            topic_wise_resp.append(subject_with_performance)
    
    return topic_wise_resp

async def test_prelims_topic_analysis(topic_analysis,stage_ids:list[int]):
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    filters = {"stage": {"id": {"$in": stage_ids}}}
    response = await strapi.get_entries("papers", filters=filters,populate=populate, get_all=True)

    process = process_data(entry=response)
    subjects = []
    for res_process in process:
        if isinstance(res_process["subjects"], dict):
            res_process["subjects"] = process_data(entry=res_process["subjects"])
            subjects.append(res_process["subjects"])
    flattened_subjs = list(chain.from_iterable(subjects))
    topic_wise_resp = []
    test_topics = {perf['topic_name']: perf for perf in topic_analysis}
    print(">>>>>>>>>>",flattened_subjs)
    # Step 3 and 4: For each subject, fetch topics and combine with performance data
    for subject in flattened_subjs:
        topics = await get_topics(subject_id=subject["id"])
        # print("t>>>>", topics)
        
        subject_with_performance = {
            "subject_name": subject["name"],
            "topics": []
        }
        
        for topic in topics:
            topic_name = topic['name']
            if topic_name in test_topics:
                performance = test_topics[topic_name]
                if performance:
                    subject_with_performance["topics"].append(performance)
        if subject_with_performance["topics"] :
            topic_wise_resp.append(subject_with_performance)
    
    return topic_wise_resp

## test specific services

async def test_specific_results(test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    results:TestAttemptResponse = await test_attempt_service.get(id=test_attempt_id, db_session=db_session)
    print("results",{**results.__dict__})

    rank_percentile = await test_attempt_service.calculate_rank_percentile(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
    )
    resp = [{**item._asdict()} for item in rank_percentile]
    del resp[0]["test_id"] , resp[0]["id"]
   
    results_dict = results.__dict__
    
    # Convert the nested 'test' object to a dictionary
    if 'test' in results_dict and hasattr(results_dict['test'], 'model_dump'):
        results_dict['test'] = results_dict['test'].model_dump()
    elif 'test' in results_dict and hasattr(results_dict['test'], '__dict__'):
        results_dict['test'] = results_dict['test'].__dict__

    # Combine dictionaries
    combined_result = {**results_dict, **resp[0]}
    
    return combined_result

    # return {"ts_ta":results.__dict__, "rank_perc":resp[0]}

async def test_specific_overall(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    ta_result = await test_attempt_service.get(id=test_attempt_id, db_session=db_session)
    test_db = await test_service.get(id=test_id, db_session=db_session)
    if not ta_result:
        raise TestAttemptNotFound()
    ta_report = {
        "correct": ta_result.correct,
        "incorrect": ta_result.incorrect,
        "un_attempted": ta_result.unattempted,
    }
    result = await test_attempt_service.calc_score_time_accuracy_reports(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
    )
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db_session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count<5:
        result["others_avg_time_per_question"] = settings.GS_AVG_TIME_PER_Q if test_db.paper["id"] == settings.GS_PAPER_ID else settings.CSAT_AVG_TIME_PER_Q
        result["others_score_percent"] = settings.OTHERS_SCORE_PERCENT
        result["others_avg_accuracy"] = settings.OTHERS_AVG_ACCURACY
    
    return {"questions_report": ta_report, "overall_report": result}

async def test_specific_score_benmark(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    test_db = await test_service.get(id=test_id, db_session=db_session)
    ta_count = test_db.attempts_count
    results = await test_attempt_service.calc_score_benchmark_subjects(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
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
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db_session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count <5:
        resp = []
        for item_dict in res:
            item_dict["others_subject_score"] = settings.SUBJECT_BENCHMARK_SCORE
            resp.append(item_dict)

        return resp       
    else:
        return res    

async def test_specific_accuracy_benmark(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):        
    test_db = await test_service.get(id=test_id, db_session=db_session)
    ta_count = test_db.attempts_count
    results = await test_attempt_service.calc_accuracy_benchmark_subjects(
        user_id=current_user.id, test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
    )
    if not len(results) > 0:
        return []
    ta_count = await test_attempt_service.calc_ta_count_by_test(test_id=test_id, db_session=db_session)
   
    if test_db.test_type == TEST_TYPE.custom or ta_count <5:
        res = []
        for item in results:
           
            item_dict = item._asdict()
            
            item_dict["others_subject_score"] = settings.SUBJECT_ACCURACY_BENCHMARK_SCORE
            
            res.append(item_dict)
        return res          
        
    else:
       
        res = [{**item._asdict()} for item in results]
        return res

async def test_specific_technique(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None): 
    def categorize_score(score):
        if score < settings.PERF_TECH_LOW:
            return "Low"
        elif settings.PERF_TECH_MED_MIN <= score <= settings.PERF_TECH_MED_MAX:
            return "Medium"
        elif settings.PERF_TECH_HIGH_MIN < score <= settings.PERF_TECH_HIGH_MAX:
            return "High"
        else:
            return "unknown"

    ta_db = await test_attempt_service.get(id=test_attempt_id, db_session=db_session)
    attempt_count = ta_db.correct + ta_db.incorrect

    result = await tq_attempt_service.calc_test_technique_results(
        test_id=test_id,
        test_attempt_id=test_attempt_id, db_session=db_session
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

               
async def test_specific_subj_strength(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "Low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "Medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "High"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"

    results = await tq_attempt_service.calc_test_subj_strength(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
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

async def test_specific_topic_strength(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    def categorize_score(score):
        if score < settings.SCORE_LOW:
            return "Low"
        elif settings.SCORE_MED_MIN <= score < settings.SCORE_MED_MAX:
            return "Medium"
        elif settings.SCORE_HIGH_MIN <= score <= settings.SCORE_HIGH_MAX:
            return "High"
        elif settings.SCORE_VERY_HIGH_MIN < score <= settings.SCORE_VERY_HIGH_MAX:
            return "Very High"
        else:
            return "unknown"
    results = await tq_attempt_service.calc_test_topic_strength(
        test_id=test_id, test_attempt_id=test_attempt_id, db_session=db_session
    )

    res = [{**item._asdict()} for item in results]
    
    for topic in res:
        topic["score_category"] = categorize_score(topic["accuracy_percent"])

    return res

async def test_specific_ques_analysis(current_user,test_id: int,test_attempt_id: int,db_session: AsyncSession | None = None):
    results = await test_question_service.get_tq_results(
        test_id=test_id, test_attempt_id=test_attempt_id, user_id=current_user.id, db_session=db_session
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
import base64
from fastapi import APIRouter,Depends
from jinja2 import Environment, FileSystemLoader
from strapi_client import process_data
from weasyprint import HTML, CSS
from src.base.service import BaseCRUD
from src.config import settings
import os,io
from src.external.cms.service import strapi
from src.modules.products.models import *
from src.reports.schemas import AggMainsReportIn, BatchSpecificReport, ReportIn,TestSpecificReportIn
from fastapi_async_sqlalchemy import db
from src.users.models import User
from src.auth.deps import valid_token_user
from src.users.routes import service
from src.modules.teaching.routes import  studyplan_service
from .utils import format_date, today_date,get_tests_taken,get_qb_tests_taken, format_seconds,format_test_duration
from .report_figs import pie_perc_graph,qs_ans, qs_mains_ans, score_paper_bnmark, score_summary, test_sp_score_summary, test_specific_mains_q_ans,trend_agg,score_bnmark,accu_benchmark,eli_perf_tech,q_bank_qs_ans,test_specific_q_ans,test_specific_pie_perc_graph, trend_main_agg,ts_time
from .services import agg_mains_paper_analysis, agg_mains_perf_summmary, agg_mains_score_bnmark, agg_mains_subj_analysis, agg_mains_test_scores, agg_mains_tests_analysis, agg_paper_mains_trend, agg_pef_summary,agg_overall, agg_subj_mains_trend,agg_trend,agg_score_bnmark,agg_accuracy_bnmark,agg_technique,agg_subj_analysis,agg_topic_analysis, aggr_mains_paper_perf, check_user_mains_testattempt,test_topic_analysis
from .services import test_specific_results,test_specific_overall,test_specific_score_benmark,test_specific_accuracy_benmark,test_specific_technique, test_specific_subj_strength,test_specific_topic_strength,test_specific_ques_analysis, test_attempt_service

report_router_v2 = APIRouter(prefix="/v2/reports", tags=["Reports v2"])

offering_crud = BaseCRUD(model= Offering)
batch_crud = BaseCRUD(model= Batch)
product_crud = BaseCRUD(model=Product)


@report_router_v2.post("/aggregate/mains")
async def get_agg_report(report_in:AggMainsReportIn):
    attempt = await check_user_mains_testattempt(current_user_id=report_in.user_id,db_session=db.session)
    if attempt["attempt_count"] == 0 or attempt["attempt_eval_count"] == 0:
        file_loader = FileSystemLoader('src/templates/test_aggr_mains_templates')
        env = Environment(loader=file_loader)
        template = env.get_template('aggr_no_attempt_template.html')
        data = {"attempt":attempt,"laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png"}
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()
        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
        return {"report_name":"test_aggr_mains_report","data": pdf_encoded}
    user = await service.get_by_field(value=report_in.user_id,field="id",db_session=db.session)

    # filters = {"exam": {"id": {"$eq": report_in.exam_id}}, "stage": {"id": {"$eq": report_in.stage_id}}}
    # response = await strapi.get_entries("papers", filters=filters, fields= ["name"])
    # papers =  process_data(entry=response)
    # papers_list = [paper["name"] for paper in papers ]
    aggr_scores = await agg_mains_test_scores(current_user_id=report_in.user_id,db_session=db.session)
    aggr_pef_summary = await agg_mains_perf_summmary(current_user_id=report_in.user_id,db_session=db.session)
    aggr_paper_perf = await aggr_mains_paper_perf(current_user_id=report_in.user_id,db_session=db.session)
    aggr_paper_trend = await agg_paper_mains_trend(current_user_id=report_in.user_id,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
    # agg = trend_main_agg(response=aggr_paper_trend)
    # return agg
    aggr_subj_trend = await agg_subj_mains_trend(current_user_id=report_in.user_id,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
    aggr_score_bnmark = await agg_mains_score_bnmark(current_user_id=report_in.user_id,db_session=db.session)
    aggr_subj_analysis = await agg_mains_subj_analysis(current_user_id=report_in.user_id,db_session=db.session)
    aggr_paper_analysis = await agg_mains_paper_analysis(current_user_id=report_in.user_id,db_session=db.session)
    aggr_test_wise_analysis = await agg_mains_tests_analysis(current_user_id=report_in.user_id,db_session=db.session)
    tests_taken = aggr_pef_summary["tests_taken"]
    aggr_rank_perc = aggr_pef_summary["rank_percentile"]
    aggr_fl_qs_ans = aggr_pef_summary["qs_ans"]
    inapp_count = [d["tests_taken"] for d in tests_taken if d["in_app"] is True]
    offline_count = [d["tests_taken"] for d in tests_taken if d["in_app"] is False]
    file_loader = FileSystemLoader('src/templates/test_aggr_mains_templates')
    env = Environment(loader=file_loader)
    templates = ["aggr_master_template.html"]
    data = {"ta_scores":score_summary(response=aggr_scores), 
            "today_date":today_date,
            "fl_qs_ans":qs_mains_ans(response=aggr_pef_summary),
            "inapp_test_count":inapp_count[0],
            "offline_test_count":offline_count[0],
            "aggr_rank":aggr_rank_perc["rank"] if aggr_rank_perc else 0 ,"aggr_perc":aggr_rank_perc["percentile"] if aggr_rank_perc else 0,
            "piechart":pie_perc_graph(response=[aggr_fl_qs_ans]),
            "perctile":'src/assets/perctile.png', "rank":'src/assets/rank.png',
            "fl_qs_ans":qs_mains_ans(response=aggr_pef_summary),
            "aggr_paper_perf":aggr_paper_perf,
            "agg_paper_trend":trend_main_agg(response=aggr_paper_trend),
            "agg_subj_trend":trend_main_agg(response=aggr_subj_trend),
            "score_bnmark":score_paper_bnmark(response=aggr_score_bnmark),
            "paper_wise_resp":aggr_paper_analysis,
            "subj_wise_resp":aggr_subj_analysis,"subj_ana":'src/assets/subjwise.svg',
            "test_wise_resp":aggr_test_wise_analysis,"scoreicon":'src/assets/score.svg',
            "q_icon":'src/assets/q-icon.svg',"trenddown":'src/assets/trenddown.svg',"trendup":'src/assets/trendup.svg',"trend":'src/assets/trend.svg',
            "laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png",
            "userimage":user.photo,"user_name":user.full_name,"user_id":user.id,"bckgrdimage":"src/assets/bckgrd-image.png",
             "cup":"src/assets/cup.svg", "redbook":"src/assets/red-book.svg", "greenbook":"src/assets/green-book.svg"
            }
    documents = []
    for temp in templates:
        template = env.get_template(temp)
        output = template.render(data)
        
        document = HTML(string=output, base_url='.').render(stylesheets=[CSS(string='''
                    @page {
                        @bottom-right {
                            content: "Page " counter(page) " of " counter(pages);
                            color: #5F6D7E;
                        }
                    }
                ''')])
        documents.append(document)

    all_pages = [p for doc in documents for p in doc.pages]
    final_doc = HTML(string=output, base_url='.').render()
    # pdf_bytes = io.BytesIO()
    pdf_fileobj = final_doc.copy(all_pages).write_pdf()
    pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
        # pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
    
    return {"report_name":"test_aggr_mains_report","data": pdf_encoded}
    

# @report_router_v2.post("/aggregate/mains")
# async def get_agg_report(report_in:ReportIn, current_user: User = Depends(valid_token_user)):
    
#     user = current_user
#     user_tests = await test_attempt_service.calc_ta_count(user_id=current_user.id,paper_id=report_in.paper_id,db_session=db.session)
#     fl_user_tests = await test_attempt_service.calc_ta_count_of_fl(user_id=current_user.id,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
    
#     if user_tests >0:
#         # Aggregate Full length 
#         aggr_pef_summary = await agg_pef_summary(current_user = user , paper_id = report_in.paper_id,db_session=db.session)
#         aggr_overall = await agg_overall(current_user=user,paper_id=report_in.paper_id,db_session=db.session)
#         aggr_trend = await agg_trend(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,full_length_result=True,db_session=db.session)
#         aggr_score_bnmark = await agg_score_bnmark(current_user=user,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
#         aggr_accuracy_bnmark = await agg_accuracy_bnmark(current_user=user,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
#         aggr_technique = await agg_technique(current_user=user,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
#         aggr_subj_analysis = await agg_subj_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
#         aggr_topic_analysis = await agg_topic_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=True,db_session=db.session)
#         tests_taken = aggr_pef_summary["full_length_report"]["tests_taken"]
#         aggr_rank_perc = aggr_pef_summary["full_length_report"]["rank_percentile"]
#         aggr_fl_qs_ans = aggr_pef_summary["full_length_report"]["qs_ans"]

#         # Aggregate Q Bank
#         aggr_q_bank_technique = await agg_technique(current_user=user,paper_id=report_in.paper_id,is_full_length=False,db_session=db.session)
#         aggr_q_bank_subj_analysis = await agg_subj_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=False,db_session=db.session)
#         aggr_q_bank_topic_analysis = await agg_topic_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=False,db_session=db.session)

#         q_bank_test_created = aggr_pef_summary["q_bank_report"]["tests_created"]
#         q_bank_tests_taken = aggr_pef_summary["q_bank_report"]["tests_taken"]

        
#         file_loader = FileSystemLoader('src/templates/test_aggr_templates')
#         env = Environment(loader=file_loader)

#         # templates = [ "aggr_report_1.html","aggr_report_2.html","aggr_report_3.html","aggr_report_4.html","aggr_report_5.html","aggr_report_6.html",
#         #             "aggr_report_7.html","aggr_report_8.html","aggr_report_9.html","aggr_report_10.html","aggr_report_11.html","aggr_report_12.html"   
#         # ]
#         # if fl_user_tests <2:
#         #     templates = [ "aggr_report_1.html","aggr_report_2.html","aggr_report_9.html","aggr_report_10.html","aggr_report_11.html","aggr_report_12.html"   
#         # ]
#         templates = ["aggr_master_template.html"]

#         data = {
#         "fl_user_tests":fl_user_tests,"paper_id": report_in.paper_id, 
#         "laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png",
#         "userimage":user.photo,"user_name":user.full_name,"user_id":user.id,"bckgrdimage":"src/assets/bckgrd-image.png",
#         "today_date":today_date,"todays":"src/assets/today.svg","q_icon":'src/assets/q-icon.svg',
#         "todaytest":get_tests_taken(tests_taken=tests_taken,test_type="TEST_OF_THE_DAY"),"fl_user_tests":fl_user_tests,
#         "books":"src/assets/pyq.svg","pyqtest":get_tests_taken(tests_taken=tests_taken,test_type="PYQ"),
#         "model":"src/assets/model.svg","modeltest":get_tests_taken(tests_taken=tests_taken,test_type="MODEL"),
#         "cup":"src/assets/cup.svg","piechart":pie_perc_graph(response=aggr_overall) if fl_user_tests >2 else "", "rank":'src/assets/rank.png',
#         "perctile":'src/assets/perctile.png',"aggr_rank":aggr_rank_perc["rank"]if fl_user_tests >2 else "","aggr_perc":aggr_rank_perc["percentile"]if fl_user_tests >2 else "",
#         "fl_qs_ans":qs_ans(response=aggr_pef_summary)if fl_user_tests >2 else "","trenddown":'src/assets/trenddown.svg',"trendup":'src/assets/trendup.svg',"trend":'src/assets/trend.svg',
#         "agg_trend":trend_agg(response=aggr_trend)if fl_user_tests >2 else "","score_bnmark":score_bnmark(response=aggr_score_bnmark)if fl_user_tests >2 else ""  , "scoreicon":'src/assets/score.svg',
#         "accuracyicon":'src/assets/accuracy.svg',"acc_bnmark":accu_benchmark(response=aggr_accuracy_bnmark)if fl_user_tests >2 else "","eliicon":'src/assets/elemi.svg',"agg_tech": aggr_technique,
#         "eli_perf_tec":eli_perf_tech(response=aggr_technique)if fl_user_tests >2 else "","subj_ana":'src/assets/subjwise.svg',
#         "subj_wise_resp":aggr_subj_analysis,"topic_wise_resp": await test_topic_analysis(topic_analysis=aggr_topic_analysis,paper_id=report_in.paper_id),
#         "qb_test_created_icon":'src/assets/qb-test-created.svg',"qb_mode_test_icon":'src/assets/qb-mode-test.svg',"qb_mode_tutor_icon":'src/assets/qb-mode-tutor.svg',
#         "q_bank_test_created":q_bank_test_created,"q_bk_tutor_test":get_qb_tests_taken(tests_taken=q_bank_tests_taken,ta_mode="TUTOR"),
#         "q_bk_exam_test":get_qb_tests_taken(tests_taken=q_bank_tests_taken,ta_mode="EXAM"),
#         "qb_exam_qs":q_bank_qs_ans(response=aggr_pef_summary,mode="EXAM"),"qb_tutor_qs":q_bank_qs_ans(response=aggr_pef_summary,mode="TUTOR"),
#         "qb_eli_perf_tec":eli_perf_tech(response=aggr_q_bank_technique),"qb_eli":aggr_q_bank_technique,"qb_subj_wise_resp":aggr_q_bank_subj_analysis,
#         "qb_topic_wise_resp": await test_topic_analysis(topic_analysis=aggr_q_bank_topic_analysis,paper_id=report_in.paper_id)
#         }

#         documents = []
#         for temp in templates:
#             template = env.get_template(temp)
#             output = template.render(data)
            
#             document = HTML(string=output, base_url='.').render(stylesheets=[CSS(string='''
#                         @page {
#                             @bottom-right {
#                                 content: "Page " counter(page) " of " counter(pages);
#                                 color: #5F6D7E;
#                             }
#                         }
#                     ''')])
#             documents.append(document)

#         all_pages = [p for doc in documents for p in doc.pages]
#         final_doc = HTML(string=output, base_url='.').render()
#         # pdf_bytes = io.BytesIO()
#         pdf_fileobj = final_doc.copy(all_pages).write_pdf()
#         pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
#             # pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
       
#         return {"report_name":"test_aggregate_report","data": pdf_encoded}
#     else:
#         return {"No tests taken"}
    
@report_router_v2.post("/tests/specific/mains")
async def get_test_specific(report_in:TestSpecificReportIn, current_user: User = Depends(valid_token_user)):

    test_sp_ta_results = await test_specific_results(test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_ta_overall = await test_specific_overall(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_score_bnmark = await test_specific_score_benmark(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_subj_strength = await test_specific_subj_strength(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_topic_strength = await test_specific_topic_strength(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_ques_analysis = await test_specific_ques_analysis(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)

    feedback = test_sp_ta_results["macro_comment"]
    test_subjects = test_sp_ta_results["test"]["subjects"]
    # ta_time_taken = "{:.2f}".format(test_sp_ta_results["time_elapsed"]/60)
    ta_time_taken = format_seconds(test_sp_ta_results["time_elapsed"])
    test_duration = format_test_duration(test_sp_ta_results["test"]["max_duration"])
    scores = {"topper_score":test_sp_ta_results["test"]["max_score"] if test_sp_ta_results["test"]["max_score"] else 0,"avg_score":test_sp_ta_results["test"]["avg_score"] if test_sp_ta_results["test"]["avg_score"] else 0,"your_score":test_sp_ta_results["score"]}
    paper_id = test_sp_ta_results["test"]["paper"]["id"]
    if test_subjects:
        subjs = [ subj["name"] for subj in test_subjects]
    else:
        async def get_subjects(paper_id:int):
            # populate = {"subjects": "true"}
            populate = {
                "subjects": {"fields": ['name']}}
            response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

            res_process = process_data(entry=response)

            if isinstance(res_process["subjects"], dict):
                res_process["subjects"] = process_data(entry=res_process["subjects"])

            return res_process["subjects"]
        subjs = await get_subjects(paper_id=test_sp_ta_results["test"]["paper"]["id"])

    file_loader = FileSystemLoader('src/templates/test_specific_mains_templates/test_specific_templates')
    env = Environment(loader=file_loader)
    templates = ["test_specific_mains_master_template.html"]
    
    data = {"laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png","paper_id":paper_id,
            "bckgrd_icon":'src/assets/bckgrd-image.png', "q_icon":'src/assets/q-icon.svg',"bckgrdimage":"src/assets/bckgrd-image.png",
            "cup":"src/assets/cup.svg","time_icon":'src/assets/time.svg',"tick_icon":'src/assets/tick.svg', 
            "ts_summary":'src/assets/ts-summary.svg',"clock_icon":'src/assets/clock.svg',"ta_time_taken":ta_time_taken,
            "ta_scores":test_sp_score_summary(response=scores), "feedback":feedback,"comp_icon":'src/assets/comp.png',
            "user_details":current_user,"test_result_resp":test_sp_ta_results,"test_duration":test_duration,"test_attempt_time":(test_sp_ta_results["created_at"]).strftime("%b %d, %Y - %I:%M %p"),
            "test_subjs": subjs,"ts_qs_ans":test_specific_mains_q_ans(response=test_sp_ta_overall), "piechart":test_specific_pie_perc_graph(response=test_sp_ta_overall),
            "correct_icon":'src/assets/correct.svg',"incorrect_icon":'src/assets/incorrect.svg',"rank":'src/assets/rank.png',"perctile":'src/assets/perctile.png',
            "avg_time_taken":ts_time(response=test_sp_ta_overall["overall_report"]),"ts_time_icon":'src/assets/ts-time.svg',
            "score_bnmark":score_bnmark(response=test_sp_score_bnmark)  , "scoreicon":'src/assets/score.svg',"subj_ana":'src/assets/subjwise.svg',
            "subj_wise_resp":test_sp_subj_strength, "topic_wise_resp":test_sp_topic_strength,"q_wise_ana":test_sp_ques_analysis}
    
    documents = []
    for temp in templates:
        template = env.get_template(temp)
        output = template.render(data)
        
        document = HTML(string=output, base_url='.').render(stylesheets=[CSS(string='''
                    @page {
                        @bottom-right {
                            content: "Page " counter(page) " of " counter(pages);
                            color: #5F6D7E;
                        }
                    }
                ''')])
        documents.append(document)

    all_pages = [p for doc in documents for p in doc.pages]
    final_doc = HTML(string=output, base_url='.').render()
    # pdf_bytes = io.BytesIO()
    pdf_fileobj = final_doc.copy(all_pages).write_pdf()
    pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
    
    return {"report_name":"test_specific_mains_report","data": pdf_encoded}
    
@report_router_v2.post("/batch/specific")
async def get_batch_specific(report_in:BatchSpecificReport):
    
    batch = await batch_crud.get(id=report_in.batch_id,db=db.session)
    batch_incharge = await service.get_by_field(value=batch.batch_incharge,field="id",db_session=db.session)
    offering = await offering_crud.get(id=batch.offering_id,db=db.session)
    product = await product_crud.get(id=report_in.product_id, db=db.session)
    summary = await studyplan_service.get_test_batch_summary(batch_id=report_in.batch_id,db_session=db.session)
    performers = await studyplan_service.get_test_batch_top_performers(batch_id=report_in.batch_id,session=db.session)
    paper_performers = await studyplan_service.compute_top_performers_per_paper(batch_id=report_in.batch_id,session=db.session)
    test_stats = await studyplan_service.get_batch_test_stats(batch_id=report_in.batch_id,session=db.session)
    test_ratio = await studyplan_service.get_test_ratio(batch_id=report_in.batch_id,session=db.session)
    paper_wise_resp = await studyplan_service.get_paper_wise_anal_for_batch_tests(batch_id=report_in.batch_id,session=db.session)
    subj_wise_resp = await studyplan_service.get_subject_wise_anal_for_batch_tests(batch_id=report_in.batch_id,db_session=db.session)
    top_perf_data = await studyplan_service.top_performers_data(batch_id=report_in.batch_id,session=db.session)
    exam_names = [exam["name"] for exam in offering.exams]
    stage_names = [stage["name"] for stage in offering.stages]
    paper_names = [paper["name"] for paper in offering.papers]
    subject_names = [subj["name"] for subj in offering.subjects]
    
    file_loader = FileSystemLoader('src/templates/batch_report_templates')
    env = Environment(loader=file_loader)
    templates = ["batch_master_template.html"]
    
    data = {"laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png","cup":"src/assets/cup.svg",
            "bckgrd_icon":'src/assets/bckgrd-image.png', "q_icon":'src/assets/q-icon.svg',"bckgrdimage":"src/assets/bckgrd-image.png",
            "batch":batch,"offering":offering,"product":product,"summary":summary,"top_performers":performers,"batch_incharge_name":batch_incharge.full_name,"batch_incharge_photo":batch_incharge.photo,
            "bluebook":"src/assets/bluebook.svg","greenbooks":"src/assets/greenbooks.svg","metric":"src/assets/metric.svg","perfcup":"src/assets/perfcup.svg","scoreicon":'src/assets/score.svg',"subj_ana":'src/assets/subjwise.svg',
            "place":"src/assets/place.svg","q":"src/assets/q.svg","yellowman":"src/assets/yellowman.svg","blackpaper":"src/assets/blackpaper.svg",
            "test_perf":test_stats,"test_ratio":test_ratio,"paper_wise_resp":paper_wise_resp,"subj_wise_resp":subj_wise_resp,
            "paper_perf":paper_performers,"top_perf_data":top_perf_data,"pos_trend_icon":"src/assets/up_trend.svg","neg_trend_icon":"src/assets/downtrend.svg",
            "paper_names":paper_names,"stage_names":stage_names,"exam_names":exam_names,"subject_names":subject_names}
           
    documents = []
    for temp in templates:
        template = env.get_template(temp)
        output = template.render(data)
        
        document = HTML(string=output, base_url='.').render(stylesheets=[CSS(string='''
                    @page {
                        @bottom-right {
                            content: "Page " counter(page) " of " counter(pages);
                            color: #5F6D7E;
                        }
                    }
                ''')])
        documents.append(document)

    all_pages = [p for doc in documents for p in doc.pages]
    final_doc = HTML(string=output, base_url='.').render()
    # pdf_bytes = io.BytesIO()
    pdf_fileobj = final_doc.copy(all_pages).write_pdf()
    pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
    
    return {"report_name":"batch_report","data": pdf_encoded}


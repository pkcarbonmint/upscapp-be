import base64
from fastapi import APIRouter,Depends
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from src.config import settings
import os,io
from src.reports.schemas import ReportIn,TestSpecificReportIn
from fastapi_async_sqlalchemy import db
from src.users.models import User
from src.auth.deps import valid_token_user
from .utils import format_date, today_date,get_tests_taken,get_qb_tests_taken, format_seconds,format_test_duration
from .report_figs import pie_perc_graph,qs_ans,trend_agg,score_bnmark,accu_benchmark,eli_perf_tech,q_bank_qs_ans,test_specific_q_ans,test_specific_pie_perc_graph,ts_time
from .services import agg_pef_summary,agg_overall,agg_trend,agg_score_bnmark,agg_accuracy_bnmark,agg_technique,agg_subj_analysis,agg_topic_analysis,test_topic_analysis
from .services import test_specific_results,test_specific_overall,test_specific_score_benmark,test_specific_accuracy_benmark,test_specific_technique, test_specific_subj_strength,test_specific_topic_strength,test_specific_ques_analysis, test_attempt_service

report_router = APIRouter(prefix="/reports", tags=["Reports"])

@report_router.post("/aggregate")
async def get_agg_report(report_in:ReportIn, current_user: User = Depends(valid_token_user)):
    
    user = current_user
    user_tests = await test_attempt_service.calc_ta_count(user_id=current_user.id,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
    fl_user_tests = await test_attempt_service.calc_ta_count_of_fl(user_id=current_user.id,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=True,db_session=db.session)
    
    if user_tests >0 or fl_user_tests >2:
        # Aggregate Full length 
        aggr_pef_summary = await agg_pef_summary(current_user = user ,from_date=report_in.from_date,till_date=report_in.till_date, paper_id = report_in.paper_id,db_session=db.session)
        aggr_overall = await agg_overall(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
        aggr_trend = await agg_trend(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,full_length_result=True,db_session=db.session)
        aggr_score_bnmark = await agg_score_bnmark(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=True,db_session=db.session)
        aggr_accuracy_bnmark = await agg_accuracy_bnmark(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=True,db_session=db.session)
        aggr_technique = await agg_technique(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=True,db_session=db.session)
        aggr_subj_analysis = await agg_subj_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=True,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
        aggr_topic_analysis = await agg_topic_analysis(current_user=user,paper_id=report_in.paper_id,is_full_length=True,from_date=report_in.from_date,till_date=report_in.till_date,db_session=db.session)
        tests_taken = aggr_pef_summary["full_length_report"]["tests_taken"]
        aggr_rank_perc = aggr_pef_summary["full_length_report"]["rank_percentile"]
        # aggr_fl_qs_ans = aggr_pef_summary["full_length_report"]["qs_ans"]

        # Aggregate Q Bank
        aggr_q_bank_technique = await agg_technique(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=False,db_session=db.session)
        aggr_q_bank_subj_analysis = await agg_subj_analysis(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=False,db_session=db.session)
        aggr_q_bank_topic_analysis = await agg_topic_analysis(current_user=user,paper_id=report_in.paper_id,from_date=report_in.from_date,till_date=report_in.till_date,is_full_length=False,db_session=db.session)

        q_bank_test_created = aggr_pef_summary["q_bank_report"]["tests_created"]
        q_bank_tests_taken = aggr_pef_summary["q_bank_report"]["tests_taken"]

        
        file_loader = FileSystemLoader('src/templates/test_aggr_templates')
        env = Environment(loader=file_loader)

        # templates = [ "aggr_report_1.html","aggr_report_2.html","aggr_report_3.html","aggr_report_4.html","aggr_report_5.html","aggr_report_6.html",
        #             "aggr_report_7.html","aggr_report_8.html","aggr_report_9.html","aggr_report_10.html","aggr_report_11.html","aggr_report_12.html"   
        # ]
        # if fl_user_tests <2:
        #     templates = [ "aggr_report_1.html","aggr_report_2.html","aggr_report_9.html","aggr_report_10.html","aggr_report_11.html","aggr_report_12.html"   
        # ]
        templates = ["aggr_master_template.html"]

        data = {
        "fl_user_tests":fl_user_tests,"paper_id": report_in.paper_id, 
        "laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png",
        "userimage":user.photo,"user_name":user.full_name,"user_id":user.id,"bckgrdimage":"src/assets/bckgrd-image.png",
        "today_date":today_date,"todays":"src/assets/today.svg","q_icon":'src/assets/q-icon.svg',
        "todaytest":get_tests_taken(tests_taken=tests_taken,test_type="TEST_OF_THE_DAY"),"fl_user_tests":fl_user_tests,
        "books":"src/assets/pyq.svg","pyqtest":get_tests_taken(tests_taken=tests_taken,test_type="PYQ"),
        "model":"src/assets/model.svg","modeltest":get_tests_taken(tests_taken=tests_taken,test_type="MODEL"),
        "cup":"src/assets/cup.svg","piechart":pie_perc_graph(response=aggr_overall) if fl_user_tests >2 else "", "rank":'src/assets/rank.png',
        "perctile":'src/assets/perctile.png',"aggr_rank":aggr_rank_perc["rank"]if fl_user_tests >2 else "","aggr_perc":aggr_rank_perc["percentile"]if fl_user_tests >2 else "",
        "fl_qs_ans":qs_ans(response=aggr_pef_summary)if fl_user_tests >2 else "","trenddown":'src/assets/trenddown.svg',"trendup":'src/assets/trendup.svg',"trend":'src/assets/trend.svg',
        "agg_trend":trend_agg(response=aggr_trend)if fl_user_tests >2 else "","score_bnmark":score_bnmark(response=aggr_score_bnmark)if fl_user_tests >2 else ""  , "scoreicon":'src/assets/score.svg',
        "accuracyicon":'src/assets/accuracy.svg',"acc_bnmark":accu_benchmark(response=aggr_accuracy_bnmark)if fl_user_tests >2 else "","eliicon":'src/assets/elemi.svg',"agg_tech": aggr_technique,
        "eli_perf_tec":eli_perf_tech(response=aggr_technique)if fl_user_tests >2 else "","subj_ana":'src/assets/subjwise.svg',
        "subj_wise_resp":aggr_subj_analysis,"topic_wise_resp": await test_topic_analysis(topic_analysis=aggr_topic_analysis,paper_id=report_in.paper_id),
        "qb_test_created_icon":'src/assets/qb-test-created.svg',"qb_mode_test_icon":'src/assets/qb-mode-test.svg',"qb_mode_tutor_icon":'src/assets/qb-mode-tutor.svg',
        "q_bank_test_created":q_bank_test_created,"q_bk_tutor_test":get_qb_tests_taken(tests_taken=q_bank_tests_taken,ta_mode="TUTOR"),
        "q_bk_exam_test":get_qb_tests_taken(tests_taken=q_bank_tests_taken,ta_mode="EXAM"),
        "qb_exam_qs":q_bank_qs_ans(response=aggr_pef_summary,mode="EXAM"),"qb_tutor_qs":q_bank_qs_ans(response=aggr_pef_summary,mode="TUTOR"),
        "qb_eli_perf_tec":eli_perf_tech(response=aggr_q_bank_technique),"qb_eli":aggr_q_bank_technique,"qb_subj_wise_resp":aggr_q_bank_subj_analysis,
        "qb_topic_wise_resp": await test_topic_analysis(topic_analysis=aggr_q_bank_topic_analysis,paper_id=report_in.paper_id)
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
       
        return {"report_name":"test_aggregate_report","data": pdf_encoded}
    else:
        file_loader = FileSystemLoader('src/templates/test_aggr_templates')

        env = Environment(loader=file_loader)
        template = env.get_template('aggr_no_attempt_template.html')
        data = {"laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png"}
        output = template.render(data)
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()
        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")
        return {"report_name":"test_aggregate_report","data": pdf_encoded}
    
@report_router.post("/tests/specific")
async def get_test_specific(report_in:TestSpecificReportIn, current_user: User = Depends(valid_token_user)):

    test_sp_ta_results = await test_specific_results(test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_ta_overall = await test_specific_overall(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_score_bnmark = await test_specific_score_benmark(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_accuracy_bnmark = await test_specific_accuracy_benmark(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_technique = await test_specific_technique(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_subj_strength = await test_specific_subj_strength(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_topic_strength = await test_specific_topic_strength(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_sp_ques_analysis = await test_specific_ques_analysis(current_user=current_user,test_id=report_in.test_id,test_attempt_id=report_in.test_attempt_id,db_session=db.session)
    test_subjects = test_sp_ta_results["test"]["subjects"]
    # ta_time_taken = "{:.2f}".format(test_sp_ta_results["time_elapsed"]/60)
    ta_time_taken = format_seconds(test_sp_ta_results["time_elapsed"])
    test_duration = format_test_duration(test_sp_ta_results["test"]["max_duration"])
    paper_id = test_sp_ta_results["test"]["paper"]["id"]
    if test_subjects:
        subjs = [ subj["name"] for subj in test_subjects]
    else:
        if paper_id == settings.CSAT_PAPER_ID:
            subjs = ['Number System', 'H.C.F. and L.C.M. of Numbers', 'Decimal Fractions and Simplification', 'Problems on Numbers', 'Percentage', 'Averages', 'Profit and Loss', 'Simple Interest and Compound Interest', 'Ratio and Proportion', 'Problems on Ages', 'Time and Work', 'Pipes and Cisterns', 'Time, Speed and Distance', 'Problems on Trains', 'Mixture and Alligations', 'Permutations and Combinations', 'Probability', 'Geometry', 'Data Interpretation', 'Syllogism', 'Direction', 'Seating Arrangement', 'Blood Relations', 'Cubes and Dices', 'Analogy', 'Insert the Missing Image or Character', 'Calendar and Clocks', 'Odd Man Out and Series', 'Coding and Decoding', 'Decision Making', 'Data Sufficiency', 'Interpersonal Skills', 'English Comprehension']
        else:
            subjs = ["Geography","History-Ancient","History-Art and Culture","History-Medieval","History-Modern","Polity","Economy","Science & Technology","Environment, Ecology and Disaster Management","Miscellaneous"]    


    file_loader = FileSystemLoader('src/templates/test_specific_templates')
    env = Environment(loader=file_loader)

    # templates = [ "test_specific_report_1.html","test_specific_report_2.html","test_specific_report_3.html","test_specific_report_4.html",
    #              "test_specific_report_6.html", "test_specific_report_7.html","test_specific_report_8.html"]
    # if test_sp_technique:
    #     templates.insert(4, "test_specific_report_5.html")
    templates = ["test_specific_master_template.html"]
    
    data = {"laex_icon":"src/assets/laex.svg","link":"src/assets/link.svg","headerline":"src/assets/headerline.png","paper_id":paper_id,
            "bckgrd_icon":'src/assets/bckgrd-image.png', "q_icon":'src/assets/q-icon.svg',"test_sp_technique":test_sp_technique,
            "cup":"src/assets/cup.svg","time_icon":'src/assets/time.svg',"tick_icon":'src/assets/tick.svg', 
            "ts_summary":'src/assets/ts-summary.svg',"clock_icon":'src/assets/clock.svg',"ta_time_taken":ta_time_taken,
            "user_details":current_user,"test_result_resp":test_sp_ta_results,"test_duration":test_duration,"test_attempt_time":(test_sp_ta_results["created_at"]).strftime("%b %d, %Y - %I:%M %p"),
            "test_subjs": subjs,"ts_qs_ans":test_specific_q_ans(response=test_sp_ta_overall), "piechart":test_specific_pie_perc_graph(response=test_sp_ta_overall),
            "correct_icon":'src/assets/correct.svg',"incorrect_icon":'src/assets/incorrect.svg',"rank":'src/assets/rank.png',"perctile":'src/assets/perctile.png',
            "avg_time_taken":ts_time(response=test_sp_ta_overall["overall_report"]),"ts_time_icon":'src/assets/ts-time.svg',
            "score_bnmark":score_bnmark(response=test_sp_score_bnmark)  , "scoreicon":'src/assets/score.svg',
            "accuracyicon":'src/assets/accuracy.svg',"acc_bnmark":accu_benchmark(response=test_sp_accuracy_bnmark),"eliicon":'src/assets/elemi.svg',
            "test_specific_techique":test_sp_technique ,"eli_perf_tec":eli_perf_tech(response=test_sp_technique),"subj_ana":'src/assets/subjwise.svg',
            "subj_wise_resp":test_sp_subj_strength,"topic_wise_resp": await test_topic_analysis(topic_analysis=test_sp_topic_strength,paper_id=paper_id),
            "q_wise_ana":test_sp_ques_analysis}
    
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
    
    return {"report_name":"test_specific_report","data": pdf_encoded}
    

    # return StreamingResponse(pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "inline; filename=test_specific_report.pdf"})


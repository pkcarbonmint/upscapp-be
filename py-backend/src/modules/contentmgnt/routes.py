import base64
from collections import defaultdict
import io
import re
from string import ascii_lowercase, ascii_uppercase
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from src.apigateway.core import route
from src.config import settings
from fastapi import status
from src.constants import APP
from src.reports.services import get_topic_by_id, get_topics
from src.modules.contentmgnt.deps import  markdown_to_docx_parts
from src.external.cms.service import fetch_questions_on_filters, get_subjects
from src.users.deps import CheckV2UserAccess
from src.users.models import User
from src.users.schemas import USER_ROLE, USER_TYPE
from .schemas import *
from src.external.cms.service import fetch_collection_by_id_type, fetch_collection_by_id_type_populate, fetch_current_affairs_qs_with_category, fetch_issue_by_id, fetch_pyq_qs_with_category, fetch_q_by_id, fetch_questions, get_mains_papers
from docxtpl import DocxTemplate
from docx import Document
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
# from .deps import markdown_to_subdoc

cntn_mgnt_router_v2 = APIRouter(prefix="", tags=["Content Mgnt V2"])
token = settings.CMS_API_KEY
cms_base_url = settings.CMS_BASE_URL

# @route(
#     request_method=cntn_mgnt_router_v2.post,
#     service_url=cms_base_url,
#     gateway_path='/cms/{entity}',
#     service_path='/api/{entity}',
#     body_params=['test_body'],
#     status_code=status.HTTP_200_OK
# )
# async def create(
#         entity: str, test_body: MCQSchema | CQSchema| SQSchema, request: Request, response: Response
# ):
#     pass
@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/objective-questions',
    service_path='/api/objective-questions',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create_mcq(
        test_body: MCQCreate, request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author,USER_ROLE.content_author_prelims,USER_ROLE.content_editor_prelims],apps=[ APP.content_mgnt_app])) # content_author
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/context-questions',
    service_path='/api/context-questions',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
        test_body: CQSchemaCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author,USER_ROLE.content_author_prelims,USER_ROLE.content_editor_prelims],apps=[ APP.content_mgnt_app]))):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/subjective-questions',
    service_path='/api/subjective-questions',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: SQCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author,USER_ROLE.content_author_mains,USER_ROLE.content_editor_mains],apps=[ APP.content_mgnt_app]))):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/issues',
    service_path='/api/issues',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueSchema
)
async def create(
         issue_body: IssueCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/issue-events',
    service_path='/api/issue-events',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueSchema
)
async def create(
         issue_body: IssueEventCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/issue-examples',
    service_path='/api/issue-examples',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueExampleSchema
)
async def create(
         issue_body: IssueExampleCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/issue-data',
    service_path='/api/issue-data',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueSchema
)
async def create(
         issue_body: IssueDataCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/case-studies',
    service_path='/api/case-studies',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueSchema
)
async def create(
         issue_body: IssueCaseStudyCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/prelims-fact-sheets',
    service_path='/api/prelims-fact-sheets',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK,
    # response_model=IssueSchema
)
async def create(
         issue_body: PrelimsFactSheetCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/prelims-fact-sheet-questions',
    service_path='/api/prelims-fact-sheet-questions',
    body_params=['pfsqs_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         pfsqs_body: PrelimsFactSheetQuestionCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/issue-questions',
    service_path='/api/issue-questions',
    body_params=['issue_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         issue_body: IssueQuestionCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/review-groups',
    service_path='/api/review-groups',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: ReviewGroupCreate , request: Request, response: Response, user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author],apps=[ APP.content_mgnt_app]))):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/review-items',
    service_path='/api/review-items',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: ReviewItemCreate , request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author],apps=[ APP.content_mgnt_app]))): #content_author

    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/review-activities',
    service_path='/api/review-activities',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: ReviewActivityCreate , request: Request, response: Response, user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor, USER_ROLE.content_reviewer],apps=[ APP.content_mgnt_app]))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/materials',
    service_path='/api/materials',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: MaterialCreate , request: Request, response: Response, user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor],apps=[ APP.content_mgnt_app]))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/file-repos',
    service_path='/api/file-repos',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: FileRepoSchema , request: Request, response: Response, user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor],apps=[ APP.content_mgnt_app]))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.post,
    service_url=cms_base_url,
    gateway_path='/cms/government-schemes',
    service_path='/api/government-schemes',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def create(
         test_body: GovernmentSchemeCreate , request: Request, response: Response, user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor],apps=[ APP.content_mgnt_app]))
):
    pass

# @route(
#     request_method=cntn_mgnt_router_v2.get,
#     service_url=cms_base_url,
#     gateway_path='/cms/{entity}',
#     service_path='/api/{entity}',
#     status_code=status.HTTP_200_OK,
# )
# async def get_all(
#         entity: str,request: Request,response: Response
# ):
#     pass

@route(
    request_method=cntn_mgnt_router_v2.put,
    service_url=cms_base_url,
    gateway_path='/cms/{entity}/{document_id}',
    service_path='/api/{entity}/{document_id}',
    body_params=['test_body'],
    status_code=status.HTTP_200_OK
)
async def update(
        entity: str,
        test_body: dict , document_id:int, request: Request, response: Response,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor, USER_ROLE.content_reviewer,USER_ROLE.content_author_prelims,USER_ROLE.content_editor_prelims,USER_ROLE.content_author_mains,USER_ROLE.content_editor_mains],apps=[ APP.content_mgnt_app]))
): # content_author, content_editor, content_reviewer
    pass

# @route(
#     request_method=cntn_mgnt_router_v2.get,
#     service_url=cms_base_url,
#     gateway_path='/cms/{entity}',
#     service_path='/api/{entity}',
#     status_code=status.HTTP_200_OK
# )
# async def get_all(
#         entity: str,request: Request, response: Response 
# ):
#     pass

@route(
    request_method=cntn_mgnt_router_v2.get,
    service_url=cms_base_url,
    gateway_path='/cms/{entity}', #entity = objective-questions
    service_path='/api/{entity}',
    query_params=['filters'], # filters = {"exam":3} ,{ "materialType":{"$in":[ "Single Issue DTP","Event in News"]},"publishingStatus":"PUBLISHED"}, partial {"creator": {"full_name": { "$containsi": "Migration"}}}, {"tags": { "$containsi": "biology" } }, {"attachments":{"$containsi": "Digital"}}(for rich text search)
    status_code=status.HTTP_200_OK,
)
async def get_by_filters(
        entity: str, request: Request,response: Response,filters : str | None = None,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass

@route(
    request_method=cntn_mgnt_router_v2.get,
    service_url=cms_base_url,
    gateway_path='/cms/{entity}/{document_id}',
    service_path='/api/{entity}/{document_id}',
    status_code=status.HTTP_200_OK
)
async def get_by_id(
        entity: str,document_id:int,request: Request, response: Response ,user_details: dict = Depends(CheckV2UserAccess( 
                                            ))
):
    pass


@route(
    request_method=cntn_mgnt_router_v2.delete,
    service_url=cms_base_url,
    gateway_path='/cms/{entity}/{document_id}',
    service_path='/api/{entity}/{document_id}',
    status_code=status.HTTP_200_OK
)
async def delete_by_id(
        entity: str,document_id:int,request: Request, response: Response ,user_details: dict = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.content_author, USER_ROLE.content_editor],apps=[ APP.content_mgnt_app]))
):
 # content_author, content_editor
    pass

# @cntn_mgnt_router_v2.post("/generate-materials/prelims/daily")
# async def generate_prelims_daily(prelims_data:PrelimsGenerateSchema):
#     qs_db = []
#     for q in prelims_data.qs:
#         qs = await fetch_q_by_id(q_type= q.q_type, id=q.q_id)
#         qs_db.append(qs)
#     template_pathQ = "src/templates/material_templates/daily_prelims_Q.docx"
#     template_pathA = "src/templates/material_templates/daily_prelims_A.docx"
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)
#     context = {
#         "questions": qs_db, "date": prelims_data.date, "subject": prelims_data.subject, "topic": prelims_data.topic, "letters": letters
#     }
#     docQ.render(context)
#     docA.render(context)
#     # output_path1 = "src/templates/material_templates/output_material1.docx"
#     # output_path2 = "src/templates/material_templates/output_material2.docx"
#     # docQ.save(output_path1)
#     # docA.save(output_path2)

#     # Save the rendered DOCX to an in-memory BytesIO buffer
#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

#     return JSONResponse(content={"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })

# @cntn_mgnt_router_v2.post("/generate-materials/prelims/weekly")
# async def generate_prelims_weekly(prelims_data:PrelimsGenerateSchema):
#     qs_db = []
#     for q in prelims_data.qs:
#         qs = await fetch_q_by_id(q_type= q.q_type, id=q.q_id)
#         qs_db.append(qs)
#     template_pathQ = "src/templates/material_templates/Prelims_weekly_ans.docx"
#     template_pathA = "src/templates/material_templates/Prelims_weekly_test.docx"
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)
#     context = {
#         "questions": qs_db, "date": prelims_data.date, "subject": prelims_data.subject, "topic": prelims_data.topic, "letters": letters, "test": prelims_data.test_id if prelims_data.test_id else ""
#     }
#     docQ.render(context)
#     docA.render(context)
#     output_path1 = "src/templates/material_templates/output_material1.docx"
#     output_path2 = "src/templates/material_templates/output_material2.docx"
#     docQ.save(output_path1)
#     docA.save(output_path2)

#     # Save the rendered DOCX to an in-memory BytesIO buffer
#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

#     return JSONResponse(content={"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })

# @cntn_mgnt_router_v2.post("/generate-materials/mains/weekly")
# async def generate_mains_weekly(mains_data:MainsGenerateSchema):
    
#     qs_db = []
#     duration = int(mains_data.q_ids[0].paper.duration)
#     tot_mins = (len(qs_db) * (duration)/20)
#     # tot_mins = int((len(qs_db) * int(q[0]["paper"]["duration"]))/20)
#     tot_marks = 0
#     for q in qs_db:
#         tot_marks = tot_marks + q["maxMarks"]
#     for q in mains_data.q_ids:
#         qs = await fetch_q_by_id(q_type= mains_data.q_type, id=q)
#         qs_db.append(qs)
        
#         tot_marks = tot_marks + qs.maxMarks
#     template_pathQ = "src/templates/material_templates/Mains_weekly_ans.docx"
#     template_pathA = "src/templates/material_templates/Mains_weekly_test.docx"
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)

#     for question in qs_db:
#         match = re.search(r"\(\d+\swords\)", question["question"])
#         question["word_limit"] = match.group(0) if match else "" 
#         question["cleaned_text"] = re.sub(r"\(\d+\swords\)", "", question["question"]).strip()

#     context = {
#         "questions": qs_db, "date": mains_data.date,"min": tot_mins ,"mx": int(tot_marks) , "subject": mains_data.subject, "topic": mains_data.topic, "letters": letters, "test": mains_data.test_id if mains_data.test_id else ""
#     }
#     docQ.render(context)
#     docA.render(context)
#     output_path1 = "src/templates/material_templates/output_material1.docx"
#     output_path2 = "src/templates/material_templates/output_material2.docx"
#     docQ.save(output_path1)
#     docA.save(output_path2)

#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

#     return JSONResponse(content={"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })

# @cntn_mgnt_router_v2.post("/generate-materials/mains/daily")
# async def generate_mains_daily(mains_data:MainsGenerateSchema):
    
#     qs_db = []

#     template_pathQ = "src/templates/material_templates/Daily_mains_Q.docx"
#     template_pathA = "src/templates/material_templates/Daily_mains_A.docx"
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)

#     for question in qs_db:
#         match = re.search(r"\(\d+\swords\)", question["question"])
#         question["word_limit"] = match.group(0) if match else "" 
#         question["cleaned_text"] = re.sub(r"\(\d+\swords\)", "", question["question"]).strip()

#     context = {
#         "questions": qs_db, "date": mains_data.date, "subject": mains_data.subject, "topic": mains_data.topic, "letters": letters, "test": mains_data.test_id if mains_data.test_id else ""
#     }
#     docQ.render(context)
#     docA.render(context)
#     output_path1 = "src/templates/material_templates/output_material1.docx"
#     output_path2 = "src/templates/material_templates/output_material2.docx"
#     docQ.save(output_path1)
#     docA.save(output_path2)

#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

#     return JSONResponse(content={"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })

# @cntn_mgnt_router_v2.post("/generate-materials/mains/booklet")
# async def generate(mains_data:MainsBookletGenerateSchema):
    
#     qs_db = []
   
#     for q in mains_data.q_ids:
#         qs = await fetch_q_by_id(q_type= mains_data.q_type, id=q)
#         qs_db.append(qs)
        
#     template_pathB = "src/templates/material_templates/mains_booklet.docx"
#     template_pathQ = "src/templates/material_templates/main_test_qs.docx"
#     template_pathA = "src/templates/material_templates/mains_test_ans.docx"
#     docB = DocxTemplate(template_file=template_pathB)
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)

#     context = {
#         "questions": qs_db, "date": mains_data.date,"YEAR": mains_data.year,"paper":mains_data.paper, "subjects": mains_data.subjects, "topic": mains_data.topics, "letters": letters, "test": mains_data.test_id if mains_data.test_id else ""
#     }
#     docQ.render(context)
#     docA.render(context)
#     docB.render(context)
#     for paragraph in docB.docx.paragraphs:
#         if "----PAGEBREAK----" in paragraph.text:
#             paragraph.clear()
#             run = paragraph.add_run()
#             run._element.addnext(parse_xml(f'<w:br {nsdecls("w")} w:type="page"/>'))
#     output_path1 = "src/templates/material_templates/output_material1.docx"
#     output_path2 = "src/templates/material_templates/output_material2.docx"
#     output_path3 = "src/templates/material_templates/output_material3.docx"
#     docQ.save(output_path1)
#     docA.save(output_path2)
#     docB.save(output_path3)

#     # Save the rendered DOCX to an in-memory BytesIO buffer
#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     bufferB = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     docB.save(bufferB)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     bufferB.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
#     doc_encodedB = base64.b64encode(bufferB.read()).decode("utf-8")

#     return JSONResponse(content={"Bs_base64": doc_encodedB,"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })
    
# @cntn_mgnt_router_v2.post("/generate-materials/issue/daily")
# async def generate(issue:DailyIssueGenerateSchema):
#     tna_issues= []
#     editorial_issues = []
#     prelims_factsheet_issues =[]
#     dcamp_qs= []
#     dcapp_mcqs = []
#     dcapp_cqs = []
#     letters = list(ascii_lowercase)
#     for id in issue.tna_issue_ids:
#         tna_issues.append(await fetch_issue_by_id(id=id))
#         # print("tna>>>>>>>>", tna_issues)
#     for id in issue.editorial_issue_ids:
#         editorial_issues.append(await fetch_issue_by_id(id=id))
#     for id in issue.prelims_factsheet_issue_ids:
#         prelims_factsheet_issues.append(await fetch_issue_by_id(id=id))
#         # print("factd>>>>", prelims_factsheet_issues)
#     for id in issue.dcapp_mcq_ids:
#         dcapp_mcqs.append(await fetch_q_by_id(id=id,q_type=QUESTION_TYPE.mcq))
#     for id in issue.dcapp_cq_ids:
#         dcapp_cqs.append(await fetch_q_by_id(id=id,q_type=QUESTION_TYPE.cq))
#         # print("dcappcqS>>>>>>>", dcapp_cqs)
#     for id in issue.dcamp_q_ids:
#         dcamp_qs.append( await fetch_q_by_id(id=id,q_type=QUESTION_TYPE.sq))
    
#     template_path = "src/templates/material_templates/daily_issue.docx"

#     doc = DocxTemplate(template_file=template_path)

#     context = {"letters":letters,"tnas":tna_issues,"editorials": editorial_issues, "facts": prelims_factsheet_issues, "dcamp":dcamp_qs, 
#                "dcappcq":dcapp_cqs ,"dcappmcq":dcapp_mcqs, "hno": issue.handout_no, "date": issue.date
#                 }
#     doc.render(context)
    
#     output_path = "src/templates/material_templates/output_material2.docx"
#     doc.save(output_path)
#     print(f"Document successfully generated at: {output_path}")
#     return output_path
    
# @cntn_mgnt_router_v2.post("/generate-materials/issue/monthly")
# async def generate(issue:MonthlyIssueGenerateSchema):
#     letters = list(ascii_uppercase)
#     prelims_grouped_data = {}
#     for item in issue.prelims_monthly_schema:
#         if item.subject not in prelims_grouped_data:
#             prelims_grouped_data[item.subject] = []
#             prelims_grouped_data[item.subject].append({
#                 "topic": item.topic,
#                 "issue": await fetch_issue_by_id(id=item.issue_id)
#             })
#         # return prelims_grouped_data
#     mains_grouped_data = {}
#     for item in issue.mains_monthly_schema:
#         if item.subject not in mains_grouped_data:
#             mains_grouped_data[item.subject] = []
#         mains_grouped_data[item.subject].append({
#             "topic": item.topic,
#             "issue": await fetch_issue_by_id(id=item.issue_id)
#         })
#         # return mains_grouped_data
#     template_path = "src/templates/material_templates/monthly_issue.docx"

#     doc = DocxTemplate(template_file=template_path)

#     print("template>>>>>>", prelims_grouped_data, mains_grouped_data)

#     context = {"prelims_data":prelims_grouped_data, "mains_data":mains_grouped_data, "Month": issue.month, "Year": issue.year,"letters":letters }
#     # try:
#     #     doc = DocxTemplate("src/templates/material_templates/monthly_issue.docx")
#     #     print("Template loaded successfully!")
#     # except Exception as e:
#     #     print("Error loading template:", e)
#     doc.render(context)
    
#     output_path = "src/templates/material_templates/output_material2.docx"
#     doc.save(output_path)
#     print(f"Document successfully generated at: {output_path}")
#     return output_path

# @cntn_mgnt_router_v2.post("/generate-materials/ca")
# async def generate(current_affairs:PrelimsGenerateSchema):
#     qs_db = []
#     for q in current_affairs.qs:
#         qs = await fetch_q_by_id(q_type= q.q_type, id=q.q_id)
#         qs_db.append({"qs":qs,"subject":qs["subject"]["name"],"code":qs["subject"]["code"],"ca_code":qs["current_affairs_topic"]["code"] if qs["current_affairs_topic"] else ""})
#     template_pathQ = "src/templates/material_templates/daily_CA_Q.docx"
#     template_pathA = "src/templates/material_templates/daily_CA_As.docx"
#     docQ = DocxTemplate(template_file=template_pathQ)
#     docA = DocxTemplate(template_file=template_pathA)
#     letters = list(ascii_lowercase)
#     context = {
#         "questions": qs_db, "date": current_affairs.date, "subject": current_affairs.subject, "topic": current_affairs.topic, "letters": letters, "handout": current_affairs.handout_no
#     }
#     docQ.render(context)
#     docA.render(context)
#     output_path1 = "src/templates/material_templates/output_material1.docx"
#     output_path2 = "src/templates/material_templates/output_material2.docx"
#     docQ.save(output_path1)
#     docA.save(output_path2)

#     # Save the rendered DOCX to an in-memory BytesIO buffer
#     bufferQ = io.BytesIO()
#     bufferA = io.BytesIO()
#     docQ.save(bufferQ)
#     docA.save(bufferA)
#     bufferQ.seek(0)
#     bufferA.seek(0)
#     doc_encodedQ = base64.b64encode(bufferQ.read()).decode("utf-8")
#     doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

#     return JSONResponse(content={"Qs_base64": doc_encodedQ, "As_base64": doc_encodedA })

@cntn_mgnt_router_v2.post("/generate-materials/pfs/single")
async def generate_single_pfs(pfs_data:PFSSchema,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    pfs_db = []
    subjects = []
    topics = []
    # nature = []
    for id in pfs_data.pfs_ids:
        pfs = await fetch_collection_by_id_type(type="prelims-fact-sheets",id=id)
        subjects = [subj["name"] for subj in pfs["subjects"]]
        topics = [topic["name"] for topic in pfs["topics"]]
        questions = pfs["questions"]
        # nature = pfs["natureOfPFS"]["name"]
        pfs["subject_list"] = subjects
        pfs["topic_list"] = topics
        # pfs["nature"] = nature
        pfs_db.append(pfs)
    template_path = "src/templates/issue_templates/pfs.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    context = {
        "factsheet": pfs_db, "letters" : list(ascii_lowercase), "subjects": subjects, "topics": topics,"questions":questions, "letters": letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"PFS_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/issue/single")
async def generate_single_issue(issue_data:SingleIssueSchema,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    pfs_db = []
    subjects = []
    topics = []   
    exams = []
    papers = []
    for id in issue_data.issue_ids:
        pfs = await fetch_collection_by_id_type(type= "issues" , id=id)
        exams = [subj["name"] for subj in pfs["exams"]]
        subjects = [subj["name"] for subj in pfs["subjects"]]
        topics = [topic["name"] for topic in pfs["topics"]]
        papers = [subj["name"] for subj in pfs["papers"]]
        pfs["exam_list"] = exams
        pfs["subject_list"] = subjects
        pfs["topic_list"] = topics
        pfs["paper_list"] = papers
        pfs_db.append(pfs)
    template_path = "src/templates/issue_templates/singleissue.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    context = {
        "issues": pfs_db, "exams":exams, "papers":papers, "subjects": subjects, "topics": topics, "letters": letters,
        "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/gist/pfs")
async def generate_gist_pfs(issue_ids:list[int],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    issues = []
    for id in issue_ids:
        pfs = await fetch_collection_by_id_type(type="issues",id=id)
        topics = [topic["name"] for topic in pfs["topics"]]
        ca_topics = [topic["name"] for topic in pfs["currentAffairsTopics"]]       
        pfs["topic_list"] = topics
        pfs["ca_list"] = ca_topics
        issues.append(pfs)
    grouped_data = {}
    for issue in issues:
        if issue["prelimsFactSheet"]:
            pfs = await fetch_collection_by_id_type(type="prelims-fact-sheets",id=issue["prelimsFactSheet"]["id"])
            for ca in issue.get("ca_list", []):
                if ca not in grouped_data.keys():
                    grouped_data[ca] = []
                grouped_data[ca].append({
                    "name": issue["name"],
                    "ca_name":ca,
                    "nature": issue["prelimsFactSheet"]["natureOfPFS"],
                    "why_in_news": issue["prelimsFactSheet"]["whyInNews"],
                    "highlights": issue["prelimsFactSheet"]["highlights"],
                    "questions": pfs["questions"]
            })
    # --- Step 2: Index Generation ---
    index_data = []
    letter_counter = 0
    # current_page = 2  # Index page is assumed to be page 1

    for ca_topic, issues_list in grouped_data.items():
        subject_entry = {
            "subject": ca_topic,
            "subject_letter": f"{ascii_uppercase[letter_counter]}.",
            # "page": current_page,
            "topics": [issue["name"] for issue in issues_list],
        }
        index_data.append(subject_entry)
        letter_counter += 1
        # current_page += len(issues_list)
    
    template_path = "src/templates/material_templates/gist_pfs.docx"
    doc = DocxTemplate(template_file=template_path)
    # letters = list(ascii_lowercase)
    # def split_in_columns(data):
    #     mid = (len(data) + 1) // 2
    #     return data[:mid], data[mid:]

    # left_column, right_column = split_in_columns(index_data)
    context = {
        # "left_column": left_column,
        # "right_column": right_column,
        "index_data": index_data, "letters" : list(ascii_lowercase),
        "grouped_data": grouped_data,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/gist/issues")
async def generate_gist_issue(issue_in: GistIssueSchema,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    # Step 1: Fetch and format issues
    issues = []
    for id in issue_in.issue_ids:
        issue = await fetch_collection_by_id_type(type="issues", id=id)
        issue["subject_list"] = [s["name"] for s in issue.get("subjects", [])]
        issue["exam_list"] = [s["name"] for s in issue.get("exams", [])]
        issue["topic_list"] = [s["name"] for s in issue.get("topics", [])]
        issue["paper_list"] = [s["name"] for s in issue.get("papers", [])]
        issues.append(issue)

    # Step 2: Group issues by subject
    grouped_issues = {}
    for issue in issues:
        for subject in issue["subject_list"]:
            if subject not in grouped_issues.keys():
                grouped_issues[subject] = []
            grouped_issues[subject].append({
                "name": issue["name"],
                "subject_name":subject,
                "issue": issue
        })
    # return grouped_issues


    # Step 3: Generate index with pages
    current_page = 2  # Assume index ends at page 1
    index = []
    letter_counter = 0

    for subject, issues_list in grouped_issues.items():
        subject_entry = {
            "subject_letter": f"{ascii_uppercase[letter_counter]}.",
            "subject_name": subject,
            "issues": []
        }
        for issue in issues_list:
            issue_entry = {
                "issue_name": issue["name"],
                "page": current_page
            }
            subject_entry["issues"].append(issue_entry)
            current_page += 1  # or more if an issue spans multiple pages
        index.append(subject_entry)
        letter_counter += 1

    # Step 4: Render DOCX
    template_path = "src/templates/material_templates/gist_issue.docx"
    doc = DocxTemplate(template_path)
    
    context = {
        "subjects": index,
        "issues": grouped_issues, 
        "letters" : list(ascii_lowercase), "Month": issue_in.month,"Year":issue_in.year,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    base64_encoded_doc = base64.b64encode(buffer.read()).decode("utf-8")
    return JSONResponse(content={"doc_base64": base64_encoded_doc})

@cntn_mgnt_router_v2.post("/generate-materials/issues/objects")
async def generate_gist_pfs(issue_obj: IssueObjects,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    issues = []
    for id in issue_obj.issue_ids:
        populate = {"subjects": "true",f"{issue_obj.object_type}":"true", "name":"true"}
        issue = await fetch_collection_by_id_type_populate(type="issues",id=id,populate=populate)      
        subjects = [subj["name"] for subj in issue["subjects"]]
        issue["subject_list"] = subjects       
        issues.append(issue)
    grouped_data = {}
    for issue in issues:
        if issue[f"{issue_obj.object_type}"]:
            for subject in issue.get("subject_list", []):
                if subject not in grouped_data.keys():
                    grouped_data[subject] = []
                grouped_data[subject].append({
                    "name": issue["name"],
                    "subject":subject,
                    f"{issue_obj.object_type}":issue[f"{issue_obj.object_type}"]
            })

    # --- Step 2: Index Generation ---
    index_data = []
    current_page = 2  # Index page is assumed to be page 1
    letter_counter = 0

    for subject, issues_list in grouped_data.items():
        subject_entry = {
            "subject_letter": f"{ascii_uppercase[letter_counter]}.",
            "subject_name": subject,
            "page": current_page,
            "issue_data" : [{"obj":issue[f"{issue_obj.object_type}"],"name":issue["name"]} for issue in issues_list]
        }
        index_data.append(subject_entry)
        current_page += len(issues_list)
        letter_counter += 1
    
    template_path = f"src/templates/issue_templates/{issue_obj.object_type}.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    for subject in index_data:
        for issue in subject["issue_data"]:
            details = issue.get("obj", {}).get("details")
            issue["docx_parts"] = (
                markdown_to_docx_parts(details, doc) if details else ["N/A"]
            )
    context = {
       "index": index_data,
        "grouped_data": grouped_data, "letters":letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/eventinnews")
async def generate_eventinnews(events: list[EventSchema],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    issues = []
    for issue_in in events:
        populate = {"subjects": "true", "name":"true"}
        issue = await fetch_collection_by_id_type_populate(type="issues",id=issue_in.issue_id,populate=populate) 
        subjects = [subj["name"] for subj in issue["subjects"]]
        issue["subjects"] = subjects 
        events = []   
        for id in issue_in.event_ids:            
            populate = {"populate":"*"}
            event = await fetch_collection_by_id_type_populate(type="issue-events",id=id,populate=populate)
            events.append(event)
        issues.append({"issue":issue, "events": events})
    grouped_data = {}
    subject_letter_map = {}
    letter_counter = 0
    for issue in issues:
        for subject in issue["issue"]["subjects"]:
            if subject not in grouped_data:
                grouped_data[subject] = []
                # Assign a unique letter only once
                subject_letter_map[subject] = f"{ascii_uppercase[letter_counter]}."
                letter_counter += 1

            grouped_data[subject].append({
                "name": issue["issue"]["name"],
                "subject_letter": subject_letter_map[subject],
                "subject": subject,
                "events": issue["events"]
            })
    template_path = f"src/templates/issue_templates/eventInNews.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    context = {
                "data": grouped_data, "letters":letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
                }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/questions")
async def generate_questions(questions: list[IssueQSchema],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    issues = []
    mcq = [] 
    cq = []
    mains = []  
    for issue_in in questions:
        populate = {"subjects": "true", "name":"true"}
        issue = await fetch_collection_by_id_type_populate(type="issues",id=issue_in.issue_id,populate=populate) 
        subjects = [subj["name"] for subj in issue["subjects"]]
        issue["subjects"] = subjects 
        mcq = [] 
        if issue_in.mcq_ids:
            for id in issue_in.mcq_ids:            
                populate = {"options":"true"}
                q = await fetch_collection_by_id_type_populate(type="objective-questions",id=id,populate=populate)
                mcq.append(q)
        cq = []
        if issue_in.cq_ids:
            for id in issue_in.cq_ids:            
                populate = {
                            "questions": {
                                "populate": "options"  # Ensure options inside questions get populated
                            }}
                q = await fetch_collection_by_id_type_populate(type="context-questions",id=id,populate=populate)
                cq.append(q)
        mains = []  
        if issue_in.sq_ids:
            for id in issue_in.sq_ids:            
                populate = {"populate":"*"}
                q = await fetch_collection_by_id_type_populate(type="subjective-questions",id=id,populate=populate)
                mains.append(q)
        issues.append({
        "issue": issue,
        "mcq": mcq,
        "cq": cq,
        "mains": mains,
        })
        
    grouped_data = {}
    subject_letter_map = {}
    letter_counter = 0
    for issue in issues:
        for subject in issue["issue"]["subjects"]:
            if subject not in grouped_data:
                grouped_data[subject] = []
                # Assign a unique letter only once
                subject_letter_map[subject] = f"{ascii_uppercase[letter_counter]}."
                letter_counter += 1
            grouped_data[subject].append({
                "name": issue["issue"]["name"],
                "context":issue["issue"]["context"],
                "subject_letter": f"{ascii_uppercase[letter_counter]}.",
                "subject":subject,
                "mcq": issue["mcq"],
                "cq": issue["cq"] ,
                "sq": issue["mains"]
        })
    # return issues,grouped_data
    if not questions[0].sq_ids:
        template_path = f"src/templates/issue_templates/prelims.docx"
    else:
        template_path = f"src/templates/issue_templates/mains.docx"

    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    # return grouped_data
    context = {
                "data": grouped_data, "letters":letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
                }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/vam")
async def generate_vam(issue_obj: list[int],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    issues = []
    for id in issue_obj:
        populate = {"subjects": "true","context":  "true","example": "true","data": "true","caseStudy": "true", "name":"true"}
        issue = await fetch_collection_by_id_type_populate(type="issues",id=id,populate=populate)     
        subjects = [subj["name"] for subj in issue["subjects"]]
        issue["subject_list"] = subjects       
        issues.append(issue)
    grouped_data = {}
    for issue in issues:
        for subject in issue.get("subject_list", []):
            if subject not in grouped_data.keys():
                grouped_data[subject] = []
            grouped_data[subject].append({
                "name": issue["name"],
                "subject":subject,
                "context": issue["context"],
                "example":issue["example"],
                "data":issue["data"],
                "caseStudy":issue["caseStudy"]
        })

    # --- Step 2: Index Generation ---
    index_data = []
    current_page = 2  # Index page is assumed to be page 1
    letter_counter = 0
    template_path = f"src/templates/issue_templates/vam.docx"
    doc = DocxTemplate(template_file=template_path)

    for subject, issues_list in grouped_data.items():
        subject_entry = {
            "subject_letter": f"{ascii_uppercase[letter_counter]}.",
            "subject_name": subject,
            "page": current_page,
            "issue_data" : [{"context": issue["context"],
                             "example": issue["example"],
                             "data":issue["data"],
                             "caseStudy":issue["caseStudy"],
                             "name": issue["name"]} for issue in issues_list]
        }
        index_data.append(subject_entry)
        current_page += len(issues_list)
        letter_counter += 1
    
    
    letters = list(ascii_lowercase)
    context = {
       "index": index_data,
        "grouped_data": grouped_data, "letters":letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)

    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")

    return JSONResponse(content={"issue_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/govtscheme")
async def generate_govtschemes(govt_scheme_ids:list[int],current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    schemes = []
    for id in govt_scheme_ids:
        populate = {"*"}
        scheme = await fetch_collection_by_id_type(type="government-schemes",id=id)
        schemes.append(scheme)
    grouped_data = {}
    for scheme in schemes:
        if scheme["nameOfMinistry"] not in grouped_data.keys():
                grouped_data[scheme["nameOfMinistry"]] = []
        grouped_data[scheme["nameOfMinistry"]].append({
            "name": scheme["schemeName"],
            "objective":scheme["objective"],
            "type": scheme["schemeType"],
            "bene":scheme["beneficiaries"],
            "features":scheme["keyFeatures"],
            "context": scheme["context"]
        })
    index_data = []
    letter_counter = 0
    for ministry, values in grouped_data.items():
        data = {"ministy": ministry, "names": [name["name"] for name in values], "subject_letter": f"{ascii_uppercase[letter_counter]}."}
        index_data.append(data)
        letter_counter += 1
    # def split_in_columns(data):
    #     mid = (len(data) + 1)//2
    #     return data[:mid], data[mid:]
    # left_column, right_column = split_in_columns(index_data)
    context = {
        "grouped_data": grouped_data,  "index_data":index_data,
         "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    template_path = f"src/templates/material_templates/govt_scheme.docx"
    doc = DocxTemplate(template_file=template_path)
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)
    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
    
    return JSONResponse(content={"scheme_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/pyqmains")
async def generate_pyq_mains(pyq_mains_schema:PYQMainsSchema):
# current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    def get_years_between(start: int, end: int) -> list[int]:
        if start > end:
            raise ValueError("Start year must be less than or equal to end year")
        return list(range(start, end + 1))
    years = get_years_between(pyq_mains_schema.pyq_start_date, pyq_mains_schema.pyq_end_date)
    mains_qs = []
    if not pyq_mains_schema.subject_topics:
        if not pyq_mains_schema.subject_topics:
            res = await fetch_pyq_qs_with_category(q_type=QUESTION_TYPE.sq,tenant_id=pyq_mains_schema.tenant_id,paper_ids=pyq_mains_schema.paper_ids,test_size=100000,source=pyq_mains_schema.source,select_years=years,is_published=True, category=pyq_mains_schema.category,is_external=pyq_mains_schema.is_external,source_names=pyq_mains_schema.source_names)

            # Step 2: Group by subject â†’ topic
            grouped = defaultdict(lambda: defaultdict(list))

            for q in res:
                subj = q.get("subject", {}).get("name")
                topic_name = q.get("topic", {}).get("name")
                topic_code = q.get("topic", {}).get("code")
                grouped[subj][(topic_name, topic_code)].append({"question":q.get("question"),"marks":q.get("maxMarks"),"year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None],"model_solution":q.get("modelSolution"),"approach":q.get("approach")})

            # Step 3: Convert grouped dict into your required prelims_qs format
            for subj, topics in grouped.items():
                mains_topic = []
                for (topic_name, topic_code), qs in sorted(
                        topics.items(),
                        key=lambda x: str(x[0][1] or x[0][0])
                    ):
                    if topic_name:
                        mains_topic.append({topic_name: qs})
                if mains_topic:
                    mains_qs.append({subj: mains_topic})
    else:
        for subj in pyq_mains_schema.subject_topics:
            mains_topic = []
            if len(subj.topics) > 0:
                for topic in sorted(
                    subj.topics,
                    key=lambda t: str(getattr(t, "code", t.name or ""))
                ):
                    res = await fetch_pyq_qs_with_category(q_type=QUESTION_TYPE.sq,tenant_id=pyq_mains_schema.tenant_id,paper_ids=pyq_mains_schema.paper_ids,topic_ids=[topic.id],test_size=1000,source=pyq_mains_schema.source,select_years=years,is_published=True, category=pyq_mains_schema.category,is_external=pyq_mains_schema.is_external,source_names=pyq_mains_schema.source_names)
                    if res:
                        mains_topic.append({topic.name:[{"question":q.get("question"),"marks":q.get("maxMarks"),"year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None],"model_solution":q.get("modelSolution"),"approach":q.get("approach")} for q in res]})
                    if mains_topic:  # Only append if there are questions
                        mains_qs.append({subj.subject.name: mains_topic})
            else:
                res = await fetch_pyq_qs_with_category(q_type=QUESTION_TYPE.sq,tenant_id=pyq_mains_schema.tenant_id,paper_ids=pyq_mains_schema.paper_ids,subject_ids=[subj.subject.id],test_size=1000,source=pyq_mains_schema.source,select_years=years,is_published=True, category=pyq_mains_schema.category,is_external=pyq_mains_schema.is_external,source_names=pyq_mains_schema.source_names)
                if res:
                    grouped = defaultdict(list)
                    for q in res:
                        topic_code = q.get("topic", {}).get("code")
                        topic_name = q.get("topic", {}).get("name")
                        if topic_name:
                            grouped[(topic_name, topic_code)].append({
                                "question": q.get("question"),
                                "marks": q.get("maxMarks"),
                                "year": [sou["year"] for sou in q.get("source", []) if sou.get("year")],
                                "model_solution": q.get("modelSolution"),
                                "approach": q.get("approach")
                            })
                    mains_topic = [{topic_name: qs}  for (topic_name, topic_code), qs in sorted(
                            grouped.items(),
                            key=lambda x: str(x[0][1] or x[0][0])
                        )]
                    if mains_topic:  # Only append if there are questions
                        mains_qs.append({subj.subject.name: mains_topic})
    context = {
        "date":f"{pyq_mains_schema.pyq_start_date} - {pyq_mains_schema.pyq_end_date}" if pyq_mains_schema.pyq_end_date != pyq_mains_schema.pyq_start_date else f"{pyq_mains_schema.pyq_start_date}","start_date":pyq_mains_schema.pyq_start_date,"end_date":pyq_mains_schema.pyq_end_date,"data": mains_qs, "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    if pyq_mains_schema.is_exam_mode:
        template_path = f"src/templates/material_templates/upscmainsexam.docx"
    else:
        template_path = f"src/templates/material_templates/upscmains.docx"
    doc = DocxTemplate(template_file=template_path)
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)
    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
    
    return JSONResponse(content={"scheme_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/pyqprelims")
async def generate_pyq_prelims(pyq_prelims_schema:PYQPrelimsSchema):
                            #    current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    def get_years_between(start: int, end: int) -> list[int]:
        if start > end:
            raise ValueError("Start year must be less than or equal to end year")
        return list(range(start, end + 1))
    years = get_years_between(pyq_prelims_schema.pyq_start_date, pyq_prelims_schema.pyq_end_date)
    prelims_qs = []
    prelims_topic = []
    only_subs_topics = False
    if pyq_prelims_schema.current_affairs_topics and not pyq_prelims_schema.subject_topics:# only cas
        prelims_topic = []
        for topic in pyq_prelims_schema.current_affairs_topics:
            res_ca = await fetch_current_affairs_qs_with_category(q_type=QUESTION_TYPE.mcq,tenant_id=pyq_prelims_schema.tenant_id,topic_ids=[topic.id],test_size=1000,source=pyq_prelims_schema.source,select_years=years,is_published=True, category=pyq_prelims_schema.category,is_external=pyq_prelims_schema.is_external, sorting_enabled=True,
                sort_by= "source.year")
            res_ca_cq = await fetch_current_affairs_qs_with_category(q_type=QUESTION_TYPE.cq,tenant_id=pyq_prelims_schema.tenant_id,topic_ids=[topic.id],test_size=1000,source=pyq_prelims_schema.source,select_years=years,is_published=True, category=pyq_prelims_schema.category,is_external=pyq_prelims_schema.is_external, sorting_enabled=True,
                sort_by= "source.year")
            if res_ca:
                prelims_topic.append({topic.name:[{"cms_id":q.get("id"),"question":q.get("question"),"options":q.get("options"),"explanation": q.get("explanation"),"marks":q.get("maxMarks"),"year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None], "source_name": [sou["name"] for sou in q.get("source", []) if sou.get("year") is not None]} for q in res_ca]})
            if res_ca_cq:
                prelims_topic.append({topic.name:[{"cms_id":q.get("id"),"context": q.get("context"),"questions":q.get("questions"),"explanation": q.get("explanation"),"options":q.get("options"),"year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None], "source_name": [sou["name"] for sou in q.get("source", []) if sou.get("year") is not None]} for q in res_ca_cq]})
    else:
        if not pyq_prelims_schema.subject_topics:
            only_subs_topics = True
            res_mcq = await fetch_pyq_qs_with_category(
                q_type=QUESTION_TYPE.mcq,
                tenant_id=pyq_prelims_schema.tenant_id,
                paper_ids=pyq_prelims_schema.paper_ids,  # optional
                subject_ids=None,  # fetch all, we'll group later
                topic_ids=None,
                test_size=100000,  # big enough
                source=pyq_prelims_schema.source,
                select_years=years,
                source_names=pyq_prelims_schema.source_names,
                category=pyq_prelims_schema.category,
                is_external=pyq_prelims_schema.is_external,
                is_published=True,
            )

            res_cq = await fetch_pyq_qs_with_category(
                q_type=QUESTION_TYPE.cq,
                tenant_id=pyq_prelims_schema.tenant_id,
                paper_ids=pyq_prelims_schema.paper_ids,
                subject_ids=None,
                topic_ids=None,
                test_size=100000,
                source=pyq_prelims_schema.source,
                select_years=years,
                source_names=pyq_prelims_schema.source_names,
                category=pyq_prelims_schema.category,
                is_external=pyq_prelims_schema.is_external,
                is_published=True,
            )

            grouped = defaultdict(lambda: defaultdict(list))
            for q in res_mcq + res_cq:
                subj = q.get("subject", {}).get("name")
                topic_obj = q.get("topic", {})
                topic_name = topic_obj.get("name")
                topic_code = topic_obj.get("code", "")
                grouped[subj][(topic_name, topic_code)].append({
                    "question": q.get("question"),
                    "cms_id": q.get("id"),
                    "options": q.get("options"),
                    "marks": q.get("maxMarks"),
                    "explanation": q.get("explanation"),
                    "context": q.get("context"),
                    "questions": q.get("questions"),
                    "year": [sou["year"] for sou in q.get("source", []) if sou.get("year")],
                    "source_name": [sou["name"] for sou in q.get("source", []) if sou.get("year")]
                })

            # Sort topics under each subject by topic code
            for subj, topics in grouped.items():
                prelims_topic = []
                for (topic_name, topic_code), qs in sorted(
                        topics.items(),
                        key=lambda x: str(x[0][1] or x[0][0])
                    ):
                    prelims_topic.append({topic_name: qs})
                if prelims_topic:
                    prelims_qs.append({subj: prelims_topic})
            
        else:
        # Step 1: Bulk fetch all MCQ and CQ by ids
            subject_ids = [
                subj.subject.id
                for subj in (pyq_prelims_schema.subject_topics or [])
            ]

            topic_ids = [
                topic.id
                for subj in (pyq_prelims_schema.subject_topics or [])
                for topic in (subj.topics or [])
            ]

            ca_topic_ids = [
                topic.id
                for topic in (pyq_prelims_schema.current_affairs_topics or [])
            ]

            res_mcq = await fetch_questions_on_filters(
                q_type=QUESTION_TYPE.mcq,
                tenant_id=pyq_prelims_schema.tenant_id,
                paper_ids=pyq_prelims_schema.paper_ids,
                subject_ids=subject_ids,  # fetch all; we'll filter/group later
                topic_ids=topic_ids,
                ca_topics= ca_topic_ids,
                test_size=100000,
                source_names=pyq_prelims_schema.source_names,
                source=pyq_prelims_schema.source,
                sorting_enabled=True,
                sort_by= "source.year",
                select_years=years,
                category=pyq_prelims_schema.category,
                is_external=pyq_prelims_schema.is_external,
                is_published=True,
            )

            res_cq = await fetch_questions_on_filters(
                q_type=QUESTION_TYPE.cq,
                tenant_id=pyq_prelims_schema.tenant_id,
                paper_ids=pyq_prelims_schema.paper_ids,
                subject_ids=subject_ids,
                topic_ids=topic_ids,
                ca_topics= ca_topic_ids,
                test_size=100000,
                source=pyq_prelims_schema.source,
                source_names=pyq_prelims_schema.source_names,
                select_years=years,
                sorting_enabled=True,
                sort_by= "source.year",
                category=pyq_prelims_schema.category,
                is_external=pyq_prelims_schema.is_external,
                is_published=True,
            )

            grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
            topic_code_map = defaultdict(dict)
            for q in res_mcq + res_cq:
                subj = q.get("subject", {}).get("name")
                topic_obj = q.get("topic", {})
                topic_name = topic_obj.get("name")
                topic_code = topic_obj.get("code", "")
                ca_topic = q.get("current_affairs_topic", {}).get("name")

                topic_code_map[subj][topic_name] = topic_code or ""

                grouped[subj][(topic_name, topic_code)][ca_topic].append({
                    "question": q.get("question"),
                    "cms_id": q.get("id"),
                    "options": q.get("options"),
                    "marks": q.get("maxMarks"),
                    "explanation": q.get("explanation"),
                    "ca_topic": q.get("current_affairs_topic"),
                    "context": q.get("context"),
                    "questions": q.get("questions"),
                    "options": q.get("options"),
                    "year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None],
                    "source_name": [sou["name"] for sou in q.get("source", []) if sou.get("year") is not None]
                })

            # Step 4: Build prelims_qs flexibly based on input filters
            prelims_qs = []

            for subj in (pyq_prelims_schema.subject_topics):
                subject_name = subj.subject.name
                prelims_topics = []
                subject_group = grouped.get(subject_name, {})

            # If specific topics provided under this subject
            if subj.topics:
                for topic in sorted(
                    subj.topics,
                    key=lambda t: (topic_code_map[subject_name].get(t.name, "") or t.name)
                ):
                    topic_key = (topic.name, topic_code_map[subject_name].get(topic.name, ""))
                    ca_topics_map = subject_group.get(topic_key, {})

                    # If current_affairs_topics input exists, filter by them
                    if pyq_prelims_schema.current_affairs_topics:
                        for ca_topic in pyq_prelims_schema.current_affairs_topics:
                            ca_name = ca_topic.name
                            qs = ca_topics_map.get(ca_name, [])
                            if qs:
                                prelims_topics.append({
                                    topic.name: {ca_name: qs}
                                })
                    else:
                        # Include all ca_topics if none specified
                        for ca_name, qs in sorted(ca_topics_map.items(), key=lambda x: x[0].lower() if x[0] else ""):
                            prelims_topics.append({
                                topic.name: {ca_name: qs}
                            })

            else:
                # If no specific topics provided → include all topics under the subject
                for (topic_name, topic_code), ca_topics_map in sorted(
                    subject_group.items(),
                    key=lambda x: (x[0][1] or x[0][0])
                ):
                    if pyq_prelims_schema.current_affairs_topics:
                        for ca_topic in pyq_prelims_schema.current_affairs_topics:
                            ca_name = ca_topic.name
                            qs = ca_topics_map.get(ca_name, [])
                            if qs:
                                prelims_topics.append({
                                    topic_name: {ca_name: qs}
                                })
                    else:
                        for ca_name, qs in sorted(ca_topics_map.items(), key=lambda x: x[0].lower() if x[0] else ""):
                            prelims_topics.append({
                                topic_name: {ca_name: qs}
                            })

            if prelims_topics:
                prelims_qs.append({subject_name: prelims_topics})
    
    letters = list(ascii_lowercase)
    
    context = {
        "date":f"{pyq_prelims_schema.pyq_start_date} - {pyq_prelims_schema.pyq_end_date}" if pyq_prelims_schema.pyq_end_date != pyq_prelims_schema.pyq_start_date else f"{pyq_prelims_schema.pyq_start_date}" ,
        "start_date":pyq_prelims_schema.pyq_start_date,"end_date":pyq_prelims_schema.pyq_end_date,"letters":letters,"data": prelims_qs,"ca_data":prelims_topic,"is_ca": True if pyq_prelims_schema.current_affairs_topics and not pyq_prelims_schema.subject_topics else False,
        "sub_top": only_subs_topics, "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    if pyq_prelims_schema.is_exam_mode:
        template_path = f"src/templates/material_templates/upscprelimsexam.docx"
    else:
        template_path = f"src/templates/material_templates/upscprelims.docx"
    doc = DocxTemplate(template_file=template_path)
    doc.render(context)
    output_path1 = "src/templates/issue_templates/output_material.docx"
    doc.save(output_path1)
    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
    
    return JSONResponse(content={"scheme_obj_base64": doc_encodedA})
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
from src.reports.services import get_topics
from src.modules.contentmgnt.deps import  markdown_to_docx_parts
from src.reports.services import get_subjects
from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE
from .schemas import *
from src.external.cms.service import fetch_collection_by_id_type, fetch_collection_by_id_type_populate, fetch_issue_by_id, fetch_pyq_qs_with_category, fetch_q_by_id, fetch_questions, get_mains_papers, get_mains_subjects
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
async def generate_single_pfs(pfs_data:PFSSchema):
    pfs_db = []
    subjects = []
    topics = []
    # nature = []
    for id in pfs_data.pfs_ids:
        pfs = await fetch_collection_by_id_type(type="prelims-fact-sheets",id=id)
       
        subjects = [subj["name"] for subj in pfs["subjects"]]
        topics = [topic["name"] for topic in pfs["topics"]]
        # nature = pfs["natureOfPFS"]["name"]
        pfs["subject_list"] = subjects
        pfs["topic_list"] = topics
        # pfs["nature"] = nature
        pfs_db.append(pfs)
    template_path = "src/templates/issue_templates/pfs.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    context = {
        "factsheet": pfs_db, "subjects": subjects, "topics": topics, "letters": letters,"markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
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
async def generate_single_issue(issue_data:SingleIssueSchema):
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
async def generate_gist_pfs(issue_ids:list[int]):
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
        for ca in issue.get("ca_list", []):
            if ca not in grouped_data.keys():
                grouped_data[ca] = []
            grouped_data[ca].append({
                "name": issue["name"],
                "ca_name":ca,
                "nature": issue["prelimsFactSheet"]["natureOfPFS"],
                "why_in_news": issue["prelimsFactSheet"]["whyInNews"],
                "highlights": issue["prelimsFactSheet"]["highlights"],
        })

    # --- Step 2: Index Generation ---
    index_data = []
    current_page = 2  # Index page is assumed to be page 1

    for ca_topic, issues_list in grouped_data.items():
        subject_entry = {
            "subject": ca_topic,
            "page": current_page,
            "topics": [issue["name"] for issue in issues_list],
        }
        index_data.append(subject_entry)
        current_page += len(issues_list)
    
    template_path = "src/templates/material_templates/gist_pfs.docx"
    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    def split_in_columns(data):
        mid = (len(data) + 1) // 2
        return data[:mid], data[mid:]

    left_column, right_column = split_in_columns(index_data)
    context = {
        "left_column": left_column,
        "right_column": right_column,
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
async def generate_gist_issue(issue_in: GistIssueSchema):
    # Step 1: Fetch and format issues
    issues = []
    for id in issue_in.issue_ids:
        issue = await fetch_collection_by_id_type(type="issues", id=id)
        issue["subject_list"] = [s["name"] for s in issue.get("subjects", [])]
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
async def generate_gist_pfs(issue_obj: IssueObjects):
    issues = []
    for id in issue_obj.issue_ids:
        populate = {"subjects": "true",f"{issue_obj.object_type}":"true", "name":"true"}
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
async def generate_eventinnews(events: list[EventSchema]):
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
async def generate_questions(questions: list[IssueQSchema]):
    issues = []
    mcq = [] 
    cq = []
    mains = []  
    for issue_in in questions:
        populate = {"subjects": "true", "name":"true"}
        issue = await fetch_collection_by_id_type_populate(type="issues",id=issue_in.issue_id,populate=populate) 
        subjects = [subj["name"] for subj in issue["subjects"]]
        issue["subjects"] = subjects 
       
        if issue_in.mcq_ids:
            for id in issue_in.mcq_ids:            
                populate = {"options":"true"}
                q = await fetch_collection_by_id_type_populate(type="objective-questions",id=id,populate=populate)
                mcq.append(q)
        if issue_in.cq_ids:
            for id in issue_in.cq_ids:            
                populate = {
                            "questions": {
                                "populate": "options"  # Ensure options inside questions get populated
                            }}
                q = await fetch_collection_by_id_type_populate(type="context-questions",id=id,populate=populate)
                cq.append(q)
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
    if not questions[0].sq_ids:
        template_path = f"src/templates/issue_templates/prelims.docx"
    else:
        template_path = f"src/templates/issue_templates/mains.docx"

    doc = DocxTemplate(template_file=template_path)
    letters = list(ascii_lowercase)
    # from docx.oxml import OxmlElement
    # from docx.oxml.ns import qn

    # def create_page_break():
    #     br = OxmlElement("w:br")
    #     br.set(qn("w:type"), "page")
    #     return br
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
async def generate_vam(issue_obj: list[int]):
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
async def generate_govtschemes(govt_scheme_ids:list[int]):
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
            "features":scheme["keyFeatures"]
        })
    index_data = []
    for ministry, values in grouped_data.items():
        data = {"ministy": ministry, "names": [name["name"] for name in values]}
        index_data.append(data)
    def split_in_columns(data):
        mid = (len(data) + 1)//2
        return data[:mid], data[mid:]
    left_column, right_column = split_in_columns(index_data)
    context = {
        "grouped_data": grouped_data, "left_column": left_column, "index_data":index_data,
        "right_column": right_column, "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    template_path = f"src/templates/material_templates/govt_scheme.docx"
    doc = DocxTemplate(template_file=template_path)
    doc.render(context)
    output_path1 = "src/templates/material_templates/output_material.docx"
    doc.save(output_path1)
    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
    
    return JSONResponse(content={"scheme_obj_base64": doc_encodedA})

@cntn_mgnt_router_v2.post("/generate-materials/pyqmains")
async def generate_pyq_mains(pyq_mains_schema:PYQMainsSchema):
    def get_years_between(start: int, end: int) -> list[int]:
        if start > end:
            raise ValueError("Start year must be less than or equal to end year")
        return list(range(start, end + 1))
    years = get_years_between(pyq_mains_schema.pyq_start_date, pyq_mains_schema.pyq_end_date)
    # papers = await  get_mains_papers()
    # paper_ids = [id["id"] for id in papers["ids"]]
    subjs = await get_mains_subjects(paper_ids=pyq_mains_schema.paper_ids)
    mains_qs = []
    for subj in subjs:
        topics = await get_topics(subject_id=subj["id"])
        mains_topic = []
        for topic in topics:
            res = await fetch_pyq_qs_with_category(q_type=QUESTION_TYPE.sq,tenant_id=pyq_mains_schema.tenant_id,topic_ids=[topic["id"]],test_size=1000,source=["UPSC"],select_years=years,is_published=True, category=pyq_mains_schema.category,is_external=pyq_mains_schema.is_external)
            if res:
                mains_topic.append({topic["name"]:[{"question":q.get("question"),"marks":q.get("maxMarks"),"year": [sou["year"] for sou in q.get("source", []) if sou.get("year") is not None]} for q in res]})
        if mains_topic:  # Only append if there are questions
            mains_qs.append({subj["name"]: mains_topic})

    context = {
        "start_date":pyq_mains_schema.pyq_start_date,"end_date":pyq_mains_schema.pyq_end_date,"data": mains_qs, "markdown_to_docx_parts": lambda md: markdown_to_docx_parts(md, doc)
    }
    template_path = f"src/templates/material_templates/upscmains.docx"
    doc = DocxTemplate(template_file=template_path)
    doc.render(context)
    output_path1 = "src/templates/material_templates/output_material.docx"
    doc.save(output_path1)
    # Save the rendered DOCX to an in-memory BytesIO buffer
    bufferA = io.BytesIO()
    doc.save(bufferA) 
    bufferA.seek(0)
    doc_encodedA = base64.b64encode(bufferA.read()).decode("utf-8")
    
    return JSONResponse(content={"scheme_obj_base64": doc_encodedA})



# cms endpoints

import asyncio
import json
from typing import List, Optional, Union
import aiohttp
from fastapi import APIRouter, Depends, File, UploadFile
from strapi_client import process_data
from functools import reduce
from src.external.cms.utils import stringify_parameters

from src.users.schemas import USER_TYPE
from .service import (
    fetch_current_affairs_qs_with_category,
    fetch_mains_current_affairs_qs,
    fetch_mains_current_affairs_qs_with_category,
    fetch_questions_with_category,
    get_review_item_count,
    get_type_by_status_filter,
    strapi,
    fetch_questions,fetch_qs_by_codes,
    fetch_mcqs,
    fetch_q_by_id,
    fetch_paper,
    get_subj_q_count,
    fetch_current_affairs_qs
)
from src.users.models import User
from src.auth.deps import valid_token_user, valid_token_user_admin
from .schemas import *
from src.modules.questions.routes import question_service
from src.modules.questions.schemas import QUESTION_TYPE
from src.auth.deps import valid_token_user
from src.auth.security import validate_admin_access
from src.modules.questions.exceptions import QuestionNotFound
from src.config import settings
from src.users.deps import CheckV2UserAccess


"""
CMS routes (master data)
"""
cms_router = APIRouter(prefix="/cms", tags=["CMS"])
cms_router_v2 = APIRouter(prefix="/cms", tags=["CMS V2"])

@cms_router_v2.get("/exams", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/exams", dependencies=[Depends(valid_token_user)])
async def get_exams():
    response = await strapi.get_entries("exams")
    return process_data(entry=response)

@cms_router_v2.get("/stages", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/stages", dependencies=[Depends(valid_token_user)])
async def get_stages(exam_id: int):
    filters = {"exam": {"id": {"$eq": exam_id}}}
    response = await strapi.get_entries("stages", filters=filters)
    return process_data(entry=response)

@cms_router_v2.get("/stages/all", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/stages/all", dependencies=[Depends(valid_token_user)])
async def get_stages():
    # filters = {"exam": {"id": {"$eq": exam_id}}}
    response = await strapi.get_entries("stages")
    return process_data(entry=response)

@cms_router_v2.get("/papers", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/papers", dependencies=[Depends(valid_token_user)])
async def get_papers(exam_id: int, stage_id: int):
    filters = {"exam": {"id": {"$eq": exam_id}}, "stage": {"id": {"$eq": stage_id}}}
    response = await strapi.get_entries("papers", filters=filters)
    return process_data(entry=response)

@cms_router_v2.get("/optionals/languages", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/optionals/languages", dependencies=[Depends(valid_token_user)])
async def get_optional_languages():
    response = await strapi.get_entries(
        "subjects",
        populate={"benchmark": "true"},
        filters={"isLanguage": {"$eq": "true"}, "isOptionalSubject": {"$eq": "true"}},
    )
    return process_data(entry=response)

@cms_router_v2.get("/optionals/subjects", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/optionals/subjects", dependencies=[Depends(valid_token_user)])
async def get_optional_subjects():
    response = await strapi.get_entries(
        "subjects",
        populate=["benchmark", "benchmark.stage"],
        filters={"isLanguage": {"$eq": "false"}, "isOptionalSubject": {"$eq": "true"}},
    )
    
    return process_data(entry=response)

@cms_router_v2.get("/subjects/all", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/subjects/all", dependencies=[Depends(valid_token_user)])
async def get_all_subjects():
    response = await strapi.get_entries(
        "subjects"
    )
    
    return process_data(entry=response)

from src.modules.contentmgnt.schemas import CATEGORY

@cms_router_v2.get("/subjects", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/subjects", dependencies=[Depends(valid_token_user)])
async def get_subjects(paper_id: int, tenant_id: int | None = None, category: CATEGORY | None = None, is_external: bool | None = None):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])
    subject_res = res_process["subjects"]

    if paper_id == settings.GS_PAPER_ID:
        for subj in subject_res:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category= category,
                is_external=is_external
            )
            subj["q_count"] = q_count
    elif paper_id == settings.CSAT_PAPER_ID:
        for subj in subject_res:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                 category= category,
                 is_external=is_external
            )
            q_count2 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="CQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                 category= category,
                 is_external=is_external
            )
            q_length = q_count + q_count2
            subj["q_count"] = q_length

    else:
        for subj in subject_res:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                 category= category,
                 is_external=is_external
            )
            q_count2 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="CQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                 category= category,
                 is_external=is_external
            )
            q_count3 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="SQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                 category= category,
                 is_external=is_external
            )
            q_length = q_count + q_count2 + q_count3
            subj["q_count"] = q_length

    return subject_res

@cms_router_v2.get("/topics", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/topics", dependencies=[Depends(valid_token_user)])
async def get_topics(
    subject_id: int, paper_id: int | None = None, tenant_id: int | None = None,category: CATEGORY | None = None, is_external: bool | None = None
):
    params = {}
    filters = {"subjects": {"id": {"$eq": subject_id}}}
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    resp = await strapi.get_entries(
        "topics",
        filters=filters,get_all=True,
        populate=populate
    )
    # topic_resp = process_data(entry=resp)
    res_data: Optional[Union[dict, List[dict]]] = resp['data']
    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])
    
    if paper_id == settings.GS_PAPER_ID:
        for topic in res_process:
            filters = {
                "tenant": {
                    "$or": [
                        {"tenantId": {"$eq": tenant_id}},
                        {"tenantId": {"$null": "true"}},
                    ]
                },
                "paper": {"id": paper_id},
                "subject": {"id": {"$in": [subject_id]}},
                "topic": {"id": {"$in": [topic["id"]]}},
                "publishingStatus": "PUBLISHED"
            }
            if category == CATEGORY.external and is_external:
                params = {
                    'filters[$or][0][category][$eq]': 'EXTERNAL',
                    'filters[$or][1][category][$null]': 'true'
                }
            elif category:
                filters["category"] = category
            elif is_external:
                filters["category"] = {"$null": "true"}


            q_resp = await strapi.get_entries_v2(
                "objective-questions", filters=filters,params=params, get_all=False
            )
            q_count = q_resp["meta"]["pagination"]["total"]
            
            topic["q_count"] = q_count
    elif paper_id == settings.CSAT_PAPER_ID:
        for topic in res_process:
            filters = {
                "tenant": {
                    "$or": [
                        {"tenantId": {"$eq": tenant_id}},
                        {"tenantId": {"$null": "true"}},
                    ]
                },
                "paper": {"id": paper_id},
                "subject": {"id": {"$in": [subject_id]}},
                "topic": {"id": {"$in": [topic["id"]]}},
                "publishingStatus": "PUBLISHED"
            }
            if category == CATEGORY.external and is_external:
                params = {
                    'filters[$or][0][category][$eq]': 'EXTERNAL',
                    'filters[$or][1][category][$null]': 'true'
                }
            elif category:
                filters["category"] = category
            elif is_external:
                filters["category"] = {"$null": "true"}

            q_resp = await strapi.get_entries_v2(
                "objective-questions", filters=filters,params=params, get_all=False
            )
            q_count = q_resp["meta"]["pagination"]["total"]
            q_resp2 = await strapi.get_entries_v2(
                "context-questions", filters=filters,params=params,populate={"questions":{"populate": "*"}}, get_all=False
            )
            q_count2 = sum(len(item["attributes"]["questions"]) for item in q_resp2["data"])

            q_length = q_count + q_count2
            topic["q_count"] = q_length
    else:
        for topic in res_process:
            filters = {
                "tenant": {
                    "$or": [
                        {"tenantId": {"$eq": tenant_id}},
                        {"tenantId": {"$null": "true"}},
                    ]
                },
                "paper": {"id": paper_id},
                "subject": {"id": {"$in": [subject_id]}},
                "topic": {"id": {"$in": [topic["id"]]}},
                "publishingStatus": "PUBLISHED"
            }
            if category == CATEGORY.external and is_external:
                params = {
                    'filters[$or][0][category][$eq]': 'EXTERNAL',
                    'filters[$or][1][category][$null]': 'true'
                }
            elif category:
                filters["category"] = category
            elif is_external:
                filters["category"] = {"$null": "true"}

            q_resp = await strapi.get_entries_v2(
                "subjective-questions", filters=filters,params=params, get_all=False
            )
            q_count = q_resp["meta"]["pagination"]["total"]
            
            
            topic["q_count"] = q_count
    return res_process

@cms_router_v2.get("/subjects/list", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/subjects/list", dependencies=[Depends(valid_token_user)])
async def get_subjects(paper_id: int):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])

    return res_process["subjects"]

@cms_router_v2.get("/subjects/published", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/subjects/published", dependencies=[Depends(valid_token_user)])
async def get_subjects(paper_id: int,tenant_id: int | None = None,category: CATEGORY | None = None, is_external: bool | None = None):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])
    published_subj = list(filter(lambda x: x.get("publishedAt") is not None,  res_process["subjects"]))
   
    if paper_id == settings.GS_PAPER_ID:
        for subj in published_subj:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            subj["q_count"] = q_count
    elif paper_id == settings.CSAT_PAPER_ID:
        for subj in published_subj:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            q_count2 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="CQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            q_length = q_count + q_count2
            subj["q_count"] = q_length
    
    else:
       for subj in published_subj:
            q_count = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="MCQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            q_count2 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="CQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            q_count3 = await get_subj_q_count(
                tenant_id=tenant_id,
                q_type="SQ",
                paper_id=paper_id,
                subject_ids=[subj["id"]],
                category=category,
                is_external=is_external
            )
            q_length = q_count + q_count2 + q_count3
            subj["q_count"] = q_length

    return published_subj

@cms_router_v2.get("/topics/list", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/topics/list", dependencies=[Depends(valid_token_user)])
async def get_topics(subject_id: int):
    filters = {"subjects": {"id": {"$eq": subject_id}}}
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    response = await strapi.get_entries(
        "topics",
        filters=filters, get_all=True,
        populate=populate
    )
    
    res_data: Optional[Union[dict, List[dict]]] = response['data']
    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

@cms_router_v2.get("/topics/all", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/topics/all", dependencies=[Depends(valid_token_user)])
async def get_topics(subject_id: int):
    filters = {"subjects": {"id": {"$eq": subject_id}}}
    # populate = {"subjects": "true"}
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    response = await strapi.get_entries(
        "topics",
        filters=filters,get_all=True,
        publication_state="preview", #returns both draft entries & published entries
        populate=populate
    )
    res_data: Optional[Union[dict, List[dict]]] = response['data']
    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

    
    # return process_data(entry=response)


@cms_router_v2.get("/currentaffairs/topics", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/currentaffairs/topics", dependencies=[Depends(valid_token_user)])
async def get_ca_topics(tenant_id: int, exam_id: int, paper_id: int,category: CATEGORY | None = None, is_external: bool | None = None):
    resp = await strapi.get_entries(
        "current-affairs-topics",
    )
    topic_resp = process_data(entry=resp)
    for topic in topic_resp:
        # q_count = topic["meta"]["pagination"]["total"]
        qs = await fetch_current_affairs_qs_with_category(
            q_type=QUESTION_TYPE.mcq,
            tenant_id=tenant_id,
            exam_id=exam_id,
            paper_id=paper_id,
            topic_ids=[topic["id"]],
            category=category,
            is_external=is_external
        )
        topic["q_count"] = len(qs)
    return topic_resp

@cms_router_v2.post("/mcqs", dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))])
@cms_router.post("/mcqs", dependencies=[Depends(validate_admin_access)])
async def get_mcqs(
    *,
    tenant_id: int,
    paper_id: int,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    # difficulty_level: str | None = None,
    test_size: int | None = 10,
    source: str | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True
):
    res = await fetch_mcqs(
        tenant_id=tenant_id,
        paper_id=paper_id,
        subject_ids=subject_ids,
        topic_ids=topic_ids,
        # difficulty_level=difficulty_level,
        test_size=test_size,
        source=source,
        exclude_ids=exclude_ids,
        randomize=randomize,
    )

    return res

@cms_router_v2.post("/currentaffairs/questions")
@cms_router.post("/currentaffairs/questions")
async def get_ca_qs(*, test_filter: CurrentAffairsQSchema):
    qs = await fetch_current_affairs_qs_with_category(**test_filter.model_dump())
    return qs

@cms_router_v2.post("/currentaffairs/mains/questions")
@cms_router.post("/currentaffairs/mains/questions")
async def get_ca_qs(*, test_filter: CurrentAffairsQSchema):
    qs = await fetch_mains_current_affairs_qs_with_category(**test_filter.model_dump(exclude={"q_type"}))
    return qs

@cms_router_v2.post(
    "/questions",
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))],
)
@cms_router.post(
    "/questions",
    dependencies=[Depends(validate_admin_access)],
)
async def get_questions(*, test_filter: FetchQuestionsSchema):
    # res = await fetch_questions(**test_filter.model_dump())
    res = await fetch_questions_with_category(**test_filter.model_dump())

    return res

@cms_router_v2.post(
    "/questions/fulllength",
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))],
)
@cms_router.post(
    "/questions/fulllength",
    dependencies=[Depends(validate_admin_access)],
)
async def get_questions(*, test_filter: FullLengthQFetchSchema, user: User = Depends(valid_token_user_admin)):
        filters = {"exam": {"id": {"$eq": test_filter.exam_id}}, "stage": {"id": {"$eq": settings.STAGE_ID}}}
        response = await strapi.get_entries("papers", filters=filters)
        papers = process_data(entry=response)
        context_questions = []
        
   
        if test_filter.paper_id == settings.GS_PAPER_ID:
            qs_list = []
            for key, value in settings.GS_Q_DIST.items():
                subj_code = key
                subj_dist = value["dist"]
                qs = await fetch_qs_by_codes(
                    q_type=QUESTION_TYPE.mcq,
                    tenant_id=user.tenant_id,
                    exam_id=test_filter.exam_id,
                    paper_id=test_filter.paper_id,
                    subject_codes=[subj_code],
                    test_size=subj_dist,
                )
                # print("qs>>>>>>>>>>>", len(qs))
                qs_list.append(qs)
            total_subj_qs = [
                element for sublist in qs_list for element in sublist
            ]  # flatten list
            paper_qs_count = [paper["numberOfQuestions"] for paper in papers if paper["id"] == settings.GS_PAPER_ID]
            print("paper_qs_count", paper_qs_count)
            if len(total_subj_qs) != paper_qs_count[0] :
                test_size = paper_qs_count[0] - len(total_subj_qs)
                qs = await fetch_questions(
                    q_type="MCQ",
                    tenant_id=user.tenant_id,
                    paper_id=test_filter.paper_id,
                    test_size=test_size,
                )
                # print("qs>>>>>>>>>>>", len(qs), "testsizze", test_size)
                qs_list.append(qs)

            questions = [
                element for sublist in qs_list for element in sublist
            ]  # flatten list

        elif test_filter.paper_id == settings.CSAT_PAPER_ID:
            qs_list = []
            paper_qs_count = [paper["numberOfQuestions"] for paper in papers if paper["id"] == settings.CSAT_PAPER_ID]
            # print("paper_qs_count", paper_qs_count)
            cq_size = max(1, paper_qs_count[0] * 0.10)
            # print("cq_size", cq_size, type(cq_size))
            context_questions = await fetch_qs_by_codes(
                q_type=QUESTION_TYPE.cq,
                tenant_id=user.tenant_id,
                exam_id=test_filter.exam_id,
                paper_id=test_filter.paper_id,
                test_size=int(cq_size),
            )
            

            if context_questions and len(context_questions) > 0:
                cq_count = reduce(
                    lambda x, y: x + len(y["questions"]), context_questions, 0
                )
                

            for key, value in settings.CSAT_Q_DIST.items():
                subj_code = key
                subj_dist = value["dist"]

                q_size = subj_dist
               
                questions = await fetch_qs_by_codes(
                    q_type=QUESTION_TYPE.mcq,
                    tenant_id=user.tenant_id,
                    exam_id=test_filter.exam_id,
                    paper_id=test_filter.paper_id,
                    subject_codes=[subj_code],
                    test_size=q_size,
                    
                )
                qs_list.append(questions)

            total_subj_qs = [
                element for sublist in qs_list for element in sublist
            ]  # flatten list
            total_qs_count = len(total_subj_qs) + cq_count
            
            if total_qs_count != paper_qs_count[0]:
                test_size = paper_qs_count[0] - total_qs_count
                # print("test_size>>>>", test_size)
                qs = await fetch_questions(
                    q_type=QUESTION_TYPE.mcq,
                    tenant_id=user.tenant_id,
                    paper_id=test_filter.paper_id,
                    test_size=test_size,
                )
                qs_list.append(qs)
                # print("extra_QS>>>>>>>>", len(qs))
           
            questions = [
                element for sublist in qs_list for element in sublist
            ]  # flatten list
            

        return { "CQ":context_questions ,"MCQ":questions}
    
@cms_router_v2.get("/questions/{id}", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.get("/questions/{id}", dependencies=[Depends(valid_token_user)])
async def get_question_by_id(*, id: int, q_type: QUESTION_TYPE):
    res = await fetch_q_by_id(id=id, q_type=q_type)
    if not res:
        QuestionNotFound()
    return res

@cms_router_v2.post("/questions/create", dependencies=[Depends(CheckV2UserAccess())])
@cms_router.post("/questions/create", dependencies=[Depends(valid_token_user)])
async def create_question(*,  data: dict):
    # data_dict = data.dict()
    res = await strapi.create_entry(plural_api_id="objective-questions", data=data)
    if not res:
        QuestionNotFound()
    return res

@cms_router_v2.get(
    "/collections/{type}",
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student]))],
)
async def get_collections_count_by_status(*,type:str,category: CATEGORY | None = None, is_external: bool | None = None):
    res = await get_type_by_status_filter(type=type,category=category,is_external=is_external)
    return res

@cms_router_v2.post("/upload",dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))])
async def upload_images_files(*, files: list[UploadFile] = File(...)):
    res = await strapi.upload_file(files=files)
    return res

@cms_router_v2.get("/reviewgroups")
async def get_review_groups_count(*,filters:str| None = None):
    pagination = {}
    if filters:
        filters = json.loads(filters)
        pagination = {key: filters[key] for key in ["page", "pageSize"] if key in filters}
    filters_param = stringify_parameters("filters", filters if filters else {})
    # populate_param = stringify_parameters("populate", populate)
    pagination_param = stringify_parameters('pagination', pagination if pagination else {})
    token = settings.CMS_API_KEY
    cms_base_url = settings.CMS_BASE_URL
    header = {'Authorization': 'Bearer ' + token}
    params = {
            **filters_param,
            **pagination_param
        }
    async with aiohttp.ClientSession() as session:
            async with session.get(f"{cms_base_url}/api/review-groups", headers=header, params=params) as res:
                if res.status != 200:
                    raise Exception(f'Unable to get entry, error {res.status}: {res.reason}')
                response =  await res.json()

    review_groups = response.get("data",[])
    meta = response.get("meta",{})
    tasks = [get_review_item_count(group["id"]) for group in review_groups]
    
    # Run all count requests concurrently
    review_counts = await asyncio.gather(*tasks)
    
    results = [
        {**group,"review_item_count": count, **meta}
        for group, count in zip(review_groups, review_counts)
    ]
    return results

@cms_router_v2.get("/reviewgroups/{user_id}")
async def get_reviewer_review_groups(*,user_id:int,type:str, offset:int | None = None, limit: int | None = None):
    populate = {"reviewItems":"true"} 
    # filters = {"reviewItems":{"reviewerL1Id":{"$eq": user_id}}} 
    filters = {
        "type": type,
        "reviewItems": {
            "$or": [
                {"reviewerL1Id": {"$eq": user_id}},
                {"reviewerL2Id": {"$eq": user_id}}
            ]
        }
    }
    populate_param = stringify_parameters("populate", populate)
    sort_param = stringify_parameters("sort", "id:desc")
    #limit_params = stringify_parameters("limit", 1000)
    filter_param = stringify_parameters("filters", filters)
    if offset and limit:
        pagination = {"page": offset, "pageSize": limit}
        pagination_param = stringify_parameters("pagination", pagination)
        params = {
                **populate_param,
                **sort_param,
            #    **limit_params
                **filter_param,
                **pagination_param
            }
    else:
        params = {
                **populate_param,
                **sort_param,
                **filter_param
            }

    token = settings.CMS_API_KEY
    cms_base_url = settings.CMS_BASE_URL
    header = {'Authorization': 'Bearer ' + token}
    async with aiohttp.ClientSession() as session:
            async with session.get(f"{cms_base_url}/api/review-groups", headers=header, params= params) as res:
                if res.status != 200:
                    print("errror>>>>>>>>", res)
                    raise Exception(f'Unable to get entry, error {res.status}: {res.reason}')
                response =  await res.json()
               
    filtered_groups = []
    for group in response["data"]:
        filtered_items = [
            item for item in group["attributes"]["reviewItems"]["data"]
            if item["attributes"].get("reviewerL1Id") == user_id
            or item["attributes"].get("reviewerL2Id") == user_id
        ]
        
        if filtered_items:  # Only include the group if it has matching review items
            filtered_group = group.copy()  # Copy the group to avoid modifying the original data
            filtered_group["attributes"]["reviewItems"]["data"] = filtered_items
            filtered_groups.append(filtered_group)
    return filtered_groups, response["meta"]

    
# @cms_router.put("/reports/{id}")
# async def report_question(id: int, type: str, report_in: ReportCMS):
#     question_db = await question_service.get(id=id)
#     question_model_plural = "objective-questions"
#     if type == "MCQ":
#         question_model_plural = "objective-questions"
#     if type == "SQ":
#         question_model_plural = "subjective-questions"
#     report_update_db = await strapi.update_entry(
#         plural_api_id=question_model_plural,
#         document_id=question_db.cms_id,
#         data=report_in.model_dump(),
#     )

#     return report_update_db

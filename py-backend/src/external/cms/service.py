import httpx
from src.config import settings
from strapi_client import StrapiClient, process_data
import aiohttp
from typing import Any, Dict, Union, List, Optional
from .utils import stringify_parameters
import random
from src.external.cms.schemas import *
from src.modules.questions.schemas import QUESTION_TYPE
from fastapi import HTTPException, UploadFile
from datetime import datetime, timedelta
from functools import reduce
from src.modules.contentmgnt.schemas import CATEGORY

token = settings.CMS_API_KEY
cms_base_url = settings.CMS_BASE_URL


class Strapi(StrapiClient):
    def __init__(self, baseurl: str, token: str) -> None:
        """Initialize client."""
        super().__init__(baseurl)
        self._token = token

    async def get_entries_v2(
        self,
        plural_api_id: str,
        sort: Optional[List[str]] = None,
        filters: Optional[dict] = None,
        populate: Optional[List[str]] = None,
        fields: Optional[List[str]] = None,
        pagination: Optional[dict] = None,
        params: Optional[dict] = None,
        publication_state: Optional[str] = None,
        get_all: bool = False,
        batch_size: int = settings.CMS_FETCH_QS_BATCH_SIZE,
    ) -> dict:
        """Get list of entries. Optionally can operate in batch mode to get all entries automatically."""
        sort_param = stringify_parameters("sort", sort)
        filters_param = stringify_parameters("filters", filters)
        populate_param = stringify_parameters("populate", populate)
        fields_param = stringify_parameters("fields", fields)
        pagination_param = stringify_parameters("pagination", pagination)
        publication_state_param = stringify_parameters(
            "publicationState", publication_state
        )
        url = f"{self.baseurl}api/{plural_api_id}"
        params = {
            **sort_param,
            **filters_param,
            **pagination_param,
            **populate_param,
            **fields_param,
            **publication_state_param,
            **params
        }
        async with aiohttp.ClientSession() as session:
            if not get_all:
                res_obj = await self._get_entries(session, url, params)
                return res_obj
            else:
                page = 1
                get_more = True
                while get_more:
                    pagination = {"page": page, "pageSize": batch_size}
                    pagination_param = stringify_parameters("pagination", pagination)
                    for key in pagination_param:
                        params[key] = pagination_param[key]
                    res_obj1 = await self._get_entries(session, url, params)
                    if page == 1:
                        res_obj = res_obj1
                    else:
                        res_obj["data"] += res_obj1["data"]
                        res_obj["meta"] = res_obj1["meta"]
                    page += 1
                    pages = res_obj["meta"]["pagination"]["pageCount"]
                    get_more = page <= pages
                    
                    
                return res_obj
        
    async def get_entries_v3(
        self,
        plural_api_id: str,
        sort: Optional[List[str]] = None,
        filters: Optional[dict] = None,
        populate: Optional[List[str]] = None,
        fields: Optional[List[str]] = None,
        pagination: Optional[dict] = None,
        params: Optional[dict] = None,
        publication_state: Optional[str] = None,
        get_all: bool = False,
        test_size: Optional[int] = 5,
        batch_size: int = settings.CMS_FETCH_QS_BATCH_SIZE,
    ) -> dict:
        """Get list of entries. Optionally can operate in batch mode to get all entries automatically."""
        sort_param = stringify_parameters("sort", sort)
        filters_param = stringify_parameters("filters", filters)
        populate_param = stringify_parameters("populate", populate)
        fields_param = stringify_parameters("fields", fields)
        pagination_param = stringify_parameters("pagination", pagination)
        publication_state_param = stringify_parameters(
            "publicationState", publication_state
        )
        print("filters>>>>>", filters_param)
        url = f"{self.baseurl}api/{plural_api_id}"
        params = {
            **sort_param,
            **filters_param,
            **pagination_param,
            **populate_param,
            **fields_param,
            **publication_state_param,
            **params
            
        }
        
        async with aiohttp.ClientSession() as session:           
            pagination = {"page": 1, "pageSize": test_size}
            pagination_param = stringify_parameters("pagination", pagination)
            for key in pagination_param:
                params[key] = pagination_param[key]
            res_obj = await self._get_entries(session, url, params)
            
            if(res_obj["meta"]["pagination"]["total"] <= test_size):
                return res_obj
            
            if(res_obj["meta"]["pagination"]["total"] <= test_size*5):
                pagination = {"page": 1, "pageSize": res_obj["meta"]["pagination"]["total"]}
                pagination_param = stringify_parameters("pagination", pagination)
                for key in pagination_param:
                    params[key] = pagination_param[key]
                res_obj1 = await self._get_entries(session, url, params)
                return res_obj1   
            
            pages_fetched: list[int] = [1]
            pages = set(random.sample(range(2, res_obj["meta"]["pagination"]["pageCount"]), 4))
            for page_num in pages:
                pages_fetched.append(page_num)
                pagination = {"page": page_num, "pageSize": test_size}
                pagination_param = stringify_parameters("pagination", pagination)
                for key in pagination_param:
                    params[key] = pagination_param[key]
                res_obj1 = await self._get_entries(session, url, params)

                res_obj["data"] += res_obj1["data"]
                res_obj["meta"] = res_obj1["meta"]
            
            #print("<<<PAGES FETCHED>>>",pages_fetched, res_obj["meta"]["pagination"]["pageCount"])

            return res_obj

    async def upload_file(self,files: list[UploadFile]):
        url: str = f'{settings.CMS_BASE_URL}/api/upload'
        resp = []
        for file in files:
            async with aiohttp.ClientSession() as session:
                form_data = aiohttp.FormData()
                file_content = await file.read() 
                form_data.add_field("files", file_content, filename=file.filename,
                    content_type=file.content_type)
                new_headers = {}
                new_headers['Authorization'] = f"Bearer {settings.CMS_API_KEY}"
                async with session.post(url, data=form_data, headers=new_headers) as res:
                    response_data = await res.text()  # This will parse the response as JSON
                    resp.append(response_data)

        return resp
                # if res.status != 200:
                #     raise Exception(f'Unable to create entry, error {res.status}: {res.reason}')
                # return await res.json()
    
strapi = Strapi(baseurl=cms_base_url, token=token)


async def fetch_paper(*, paper_id: int):
    populate = {"exam": "true", "stage": "true", "subjects": "true"}

    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process[k] and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def fetch_questions(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    paper_id: int,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    test_size: int | None = 10,
    source: list[SOURCE_TYPE] | None = None,
    select_year: int | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        # "publishingStatus": "PUBLISHED"
    }

    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    # if source and len(source) > 0:
    #     filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if select_year:
    #     filters["source"] = {"year": {"$eq": select_year}}
    if source or select_year:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_year:
            filters["source"]["year"] = {"$eq": select_year}
    # if stage_id:
    #     filters["stages"] = {"id": {"$eq": stage_id}}
    # if difficulty_level:
    #     filters["difficultyLevel"] = {"$eq": difficulty_level}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate, test_size=test_size
    )
   
    res_data: Optional[Union[dict, List[dict]]] = response['data']

    if len(res_data) >= test_size:
        res_data = random.sample(res_data, test_size)
    else:
        res_data

    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_questions_with_category(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    paper_id: int,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    test_size: int | None = 1000,
    source: list[SOURCE_TYPE] | None = None,
    select_year: int | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
    category: CATEGORY | None = None,
    is_external:bool | None = None,
    is_published: bool | None = None
):  
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id}
    }
    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    # if source and len(source) > 0:
    #     filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if select_year:
    #     filters["source"] = {"year": {"$eq": select_year}}
    if source or select_year:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_year:
            filters["source"]["year"] = {"$eq": select_year}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"   
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate, test_size=test_size, params=params
    )
   
    res_data: Optional[Union[dict, List[dict]]] = response['data']

    if len(res_data) >= test_size:
        res_data = random.sample(res_data, test_size)
    else:
        res_data

    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_pyq_qs_with_category(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    paper_ids: list[int] | None = None,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    select_years: list[int] | None = None,
    source_names: list[str] | None = None,
    category: CATEGORY | None = None,
    is_external:bool | None = None,
    is_published: bool | None = None
):  
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        # "paper": {"id": paper_id},
        
    }
    if paper_ids:
        filters["paper"] = {"id": {"$in": paper_ids}}
    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    if source or select_years:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_years:
            filters["source"]["year"] = {"$in": select_years}
        if source_names:
            filters["source"]["name"] = {"$in": source_names}
    # if source:
    #     filters["source"] = {"sourceType": {"$in": source}}
    # if select_years:
    #     filters["source"] = {"year": {"$in": select_years}}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"   
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }
    sort = ["source.year:desc", "topic.code:asc"]

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate, test_size=test_size, params=params, sort = sort
    )
   
    res_data: Optional[Union[dict, List[dict]]] = response['data']

    if len(res_data) >= test_size:
        res_data = random.sample(res_data, test_size)
    else:
        res_data

    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_published_questions(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    # difficulty_level: DIFFICULTY_LEVEL | None = None,
    test_size: int | None = 10,
    source: list[SOURCE_TYPE] | None = None,
    select_year: int | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "publishingStatus": "PUBLISHED"
    }

    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    # if source and len(source) > 0:
    #     filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if select_year:
    #     filters["source"] = {"year": {"$eq": select_year}}
    if source or select_year:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_year:
            filters["source"]["year"] = {"$eq": select_year}
    # if stage_id:
    #     filters["stages"] = {"id": {"$eq": stage_id}}
    # if difficulty_level:
    #     filters["difficultyLevel"] = {"$eq": difficulty_level}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate, test_size=test_size
    )
   
    res_data: Optional[Union[dict, List[dict]]] = response['data']

    if len(res_data) >= test_size:
        res_data = random.sample(res_data, test_size)
    else:
        res_data

    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_questions_with_mul_papers(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_ids: list[int] | None = None,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    # difficulty_level: DIFFICULTY_LEVEL | None = None,
    test_size: int | None = 10,
    source: list[SOURCE_TYPE] | None = None,
    select_year: int | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        # "paper": {"id": {"$in": paper_ids}},
        # "publishingStatus": "PUBLISHED"
    }
    if paper_ids and len(paper_ids) > 0:
        filters["paper"] = {"id": {"$in": paper_ids}}
    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    # if source and len(source) > 0:
    #     filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if select_year:
    #     filters["source"] = {"year": {"$eq": select_year}}
    if source or select_year:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_year:
            filters["source"]["year"] = {"$eq": select_year}
    # if stage_id:
    #     filters["stages"] = {"id": {"$eq": stage_id}}
    # if difficulty_level:
    #     filters["difficultyLevel"] = {"$eq": difficulty_level}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate, test_size=test_size
    )
   
    res_data: Optional[Union[dict, List[dict]]] = response['data']

    if len(res_data) >= test_size:
        res_data = random.sample(res_data, test_size)
    else:
        res_data

    res_process = process_data(entry={'data': res_data})

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_current_affairs_qs(
    *,
    q_type: QUESTION_TYPE.mcq,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int,
    topic_ids: list[int] | None = [],
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    exclude_ids: list[int] | None = None,
    # randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "isCurrentAffairs": "true",
        # "publishingStatus": "PUBLISHED"
    }

    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    if topic_ids and len(topic_ids) > 0:
        filters["current_affairs_topic"] = {"id": {"$in": topic_ids}}
    if source and len(source) > 0:
        filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
        "current_affairs_topic": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    print(filters)
    response = await strapi.get_entries_v2(
        question_model_plural, filters=filters, populate=populate, get_all=True
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_current_affairs_qs_with_category(
    *,
    q_type: QUESTION_TYPE.mcq,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int | None = None,
    topic_ids: list[int] | None = [],
    test_size: int | None = 10000,
    category: CATEGORY| None = None,
    is_external: bool| None = None,
    source: list[SOURCE_TYPE] | None = None,
    source_names: list[str] | None = None,
    select_years: list[int] | None = None,
    exclude_ids: list[int] | None = None,
    sorting_enabled: bool | None = None,
    sort_by: str | None = None,
    is_published: bool| None = None
    
    # randomize: bool | None = True,
):
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        # "paper": {"id": paper_id},
        "isCurrentAffairs": "true"
        # "publishingStatus": "PUBLISHED"
    }
    if paper_id:
        filters["paper"] = {"id": paper_id}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if source and len(source) > 0:
    #     filters["source"] = {"sourceType": {"$in": source}}
    # if select_years:
    #     filters["source"] = {"year": {"$in": select_years}}
    if source or select_years:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_years:
            filters["source"]["year"] = {"$in": select_years}
        if source_names:
            filters["source"]["year"] = {"$in": source_names}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"   

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
        # "current_affairs_topic": "true",
        # "currentAffairsTopic": "true"
    }
    sort = None
    if sorting_enabled:
        sort = [f"{sort_by}:desc"]

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
        populate[ "current_affairs_topic"] = "true"
        if topic_ids and len(topic_ids) > 0:
            filters["current_affairs_topic"] = {"id": {"$in": topic_ids}}
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}
        populate[ "currentAffairsTopic"] = "true"
        if topic_ids and len(topic_ids) > 0:
            filters["currentAffairsTopic"] = {"id": {"$in": topic_ids}}

    print(filters)
    response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, populate=populate, get_all=True, sort=sort if sort else None
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_questions_on_filters(
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    paper_ids: list[int] | None = None,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    ca_topics: list[int] | None = None,
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    source_names: list[str] | None = None,
    select_years: list[int] | None = None,
    category: CATEGORY | None = None,
    is_external:bool | None = None,
    is_published: bool | None = None,
    sorting_enabled: bool | None = None,
    sort_by: str | None = None
):  
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        }
    }
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    if paper_ids:
        filters["paper"] = {"id": {"$in": paper_ids}}
    if subject_ids and len(subject_ids) > 0:
        filters["subject"] = {"id": {"$in": subject_ids}}
    if topic_ids and len(topic_ids) > 0:
        filters["topic"] = {"id": {"$in": topic_ids}}
    if ca_topics and len(ca_topics) > 0:
            filters["isCurrentAffairs"] =  {"$eq": "true"}
            filters["current_affairs_topic"] = {"id": {"$in": ca_topics}}
    if source or select_years:
        filters["source"] = {}
        if source:
            filters["source"]["sourceType"] = {"$in": source}
        if select_years:
            filters["source"]["year"] = {"$in": select_years}
        if source_names:
            filters["source"]["name"] = {"$in": source_names}
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"   

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true"
        # "current_affairs_topic": "true",
        # "currentAffairsTopic": "true"
    }
    sort = None
    if sorting_enabled:
        sort = [f"{sort_by}:desc"]

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
        populate[ "current_affairs_topic"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}
        populate[ "currentAffairsTopic"] = "true"

    print(filters)
    response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, populate=populate, get_all=True, sort = sort if sort else None
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process


async def fetch_mains_current_affairs_qs(
    *,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int,
    topic_ids: list[int] | None = [],
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    exclude_ids: list[int] | None = None,
    # randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "isCurrentAffairs": "true",
        # "publishingStatus": "PUBLISHED"
    }

    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    if topic_ids and len(topic_ids) > 0:
        filters["currentAffairsTopic"] = {"id": {"$in": topic_ids}}
    if source and len(source) > 0:
        filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
        "currentAffairsTopic": "true",
    }

    
    question_model_plural = "subjective-questions"
    
    print(filters)
    response = await strapi.get_entries_v2(
        question_model_plural, filters=filters, populate=populate, get_all=True
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_mains_current_affairs_qs_with_category(
    *,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int,
    topic_ids: list[int] | None = [],
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    exclude_ids: list[int] | None = None,
    category: CATEGORY,
    is_external: bool,
    is_published: bool | None = None
    # randomize: bool | None = True,
):
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "isCurrentAffairs": "true",
        # "publishingStatus": "PUBLISHED"
    }

    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    if topic_ids and len(topic_ids) > 0:
        filters["currentAffairsTopic"] = {"id": {"$in": topic_ids}}
    if source and len(source) > 0:
        filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"  

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
        "currentAffairsTopic": "true",
    }

    
    question_model_plural = "subjective-questions"
    
    print(filters)
    response = await strapi.get_entries_v2(
        question_model_plural, filters=filters, populate=populate,params = params, get_all=True
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_qs_by_codes(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    # stage_id: int | None = None,
    paper_id: int,
    subject_codes: list[str] | None = None,
    topic_codes: list[str] | None = None,
    # difficulty_level: DIFFICULTY_LEVEL | None = None,
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        # "publishingStatus": "PUBLISHED"
    }

    if subject_codes and len(subject_codes) > 0:
        filters["subject"] = {"code": {"$in": subject_codes}}
    if topic_codes and len(topic_codes) > 0:
        filters["topic"] = {"code": {"$in": topic_codes}}
    if source and len(source) > 0:
        filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    # if stage_id:
    #     filters["stages"] = {"id": {"$eq": stage_id}}
    # if difficulty_level:
    #     filters["difficultyLevel"] = {"$eq": difficulty_level}

    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters, populate=populate,test_size= test_size
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def fetch_qs_by_codes_n_category(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    exam_id: int | None = None,
    paper_id: int,
    subject_codes: list[str] | None = None,
    topic_codes: list[str] | None = None,
    category: CATEGORY,
    is_external: bool,
    test_size: int | None = 10000,
    source: list[SOURCE_TYPE] | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
    is_published: bool | None = None
):
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id}
        # "publishingStatus": "PUBLISHED"
    }
    if subject_codes and len(subject_codes) > 0:
        filters["subject"] = {"code": {"$in": subject_codes}}
    if topic_codes and len(topic_codes) > 0:
        filters["topic"] = {"code": {"$in": topic_codes}}
    if source and len(source) > 0:
        filters["source"] = {"sourceType": {"$in": source}}
    if exclude_ids and len(exclude_ids) > 0:
        filters["id"] = {"$notIn": exclude_ids}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}
    if is_published:
        filters["publishingStatus"]= "PUBLISHED"  


    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
    }

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    response = await strapi.get_entries_v3(
        question_model_plural, filters=filters,params=params, populate=populate,test_size=test_size
    )

    res_process = process_data(entry=response)

    if len(res_process) > test_size:
        res_process = random.sample(res_process, test_size)

    for i in range(len(res_process)):
        for k, v in populate.items():
            if res_process[i][k] and isinstance(res_process[i][k], dict):
                res_process[i][k] = process_data(entry=res_process[i][k])

    return res_process

async def get_paper_ids(stage_ids: list[int]):
    populate = {"papers": "true"}
    filters = {"stage": {"id": {"$in": stage_ids}}}
    response = await strapi.get_entries("papers", filters=filters,populate=populate, get_all=True)

    paper_res = process_data(entry=response)

    # if isinstance(res_process["papers"], dict):
    #     res_process["papers"] = process_data(entry=res_process["papers"])
    # paper_res = res_process["papers"]
    papers = []
    for paper in paper_res:
        papers.append(paper["id"])
    return papers

async def get_subjects_ids(paper_id: int):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])
    subject_res = res_process["subjects"]
    subjects = []
    for subj in subject_res:
        subjects.append(subj["id"])
    return subjects

async def get_topics_ids(subject_id: int):
    filters = {"subjects": {"id": {"$eq": subject_id}}}

    resp = await strapi.get_entries(
        "topics",
        filters=filters, get_all=True
    )
    topic_resp = process_data(entry=resp)
    topics = []
    for topic in topic_resp:
        topics.append(topic["id"])
    return topics

async def get_stage_q_count(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    stage_ids: list[int],
    category: CATEGORY | None = None, is_external: bool | None = None,
    randomize: bool | None = True,
):
    paper_ids = await get_paper_ids(stage_ids=stage_ids)
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id":{"$in": paper_ids}},
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

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, get_all=False
    )

        q_count = response["meta"]["pagination"]["total"]

    if q_type == "SQ":
        question_model_plural = "subjective-questions"
        response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, get_all=False
    )

        q_count = response["meta"]["pagination"]["total"]
        print("Q_COUNT>>>>>>", q_count, paper_ids)
    if q_type == "CQ":
        question_model_plural = "context-questions"
        q_count = 0
        populate = {"questions": "*"}
       
        response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, populate=populate, get_all=True
    )
        res_process = process_data(entry=response)
       
        if res_process and len(res_process) > 0:
                q_count = reduce(
                    lambda x, y: x + len(y["questions"]), res_process, 0
                )
                

    return q_count

async def get_paper_q_count(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    paper_id: int,
    category: CATEGORY | None = None,
    is_external: bool | None = None,
    randomize: bool | None = True,
):
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
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
    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, get_all=False
    )

        q_count = response["meta"]["pagination"]["total"]

    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        q_count = 0
        populate = {"questions": "*"}
       
        response = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, populate=populate, get_all=True
    )
        res_process = process_data(entry=response)
       
        if res_process and len(res_process) > 0:
                q_count = reduce(
                    lambda x, y: x + len(y["questions"]), res_process, 0
                )
                

    return q_count

async def get_subj_q_count(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    paper_id: int,
    subject_ids: list[int] | None = None,
    category: CATEGORY | None = None,
    is_external: bool | None = None
):
    params = {}
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "subject": {"id": {"$in": subject_ids}},
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

    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        q_resp = await strapi.get_entries_v2(
        question_model_plural, filters=filters,params=params, get_all=False
        )
        q_count = q_resp["meta"]["pagination"]["total"]
        

    if q_type == "SQ":
        question_model_plural = "subjective-questions"
        q_resp = await strapi.get_entries_v2(
        question_model_plural,params=params, filters=filters, get_all=False
        )
        q_count = q_resp["meta"]["pagination"]["total"]
   
    if q_type == "CQ":
        question_model_plural = "context-questions"
        q_resp = await strapi.get_entries_v2(
            question_model_plural,params=params, filters=filters, populate={"questions":{"populate": "*"}} ,get_all=False
        )
       
        q_count = sum(len(item["attributes"]["questions"]) for item in q_resp["data"])
       
    return q_count

async def get_topic_q_count(
    *,
    q_type: QUESTION_TYPE,
    tenant_id: int,
    paper_id: int,
    subject_id: int,
    topic_ids: list[int] | None = None,
):
    filters = {
        "tenant": {
            "$or": [{"tenantId": {"$eq": tenant_id}}, {"tenantId": {"$null": "true"}}]
        },
        "paper": {"id": paper_id},
        "subject": {"id": {"$in": subject_id}},
        "topic": {"id": {"$in": topic_ids}},
    }
    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"

    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"

    q_resp = await strapi.get_entries_v2(
        question_model_plural, filters=filters, get_all=False
    )
    q_count = q_resp["meta"]["pagination"]["total"]

    return q_count

async def group_topics_by_subj(
    subject_ids: list[int] | None = None, topic_ids: list[int] | None = None
):
    topic_subjects = []
    topic_subj_list = []

    for topic_id in topic_ids:
        for subj_id in subject_ids:
            topic_ids = await get_topics_ids(subject_id=subj_id)
            if len(topic_ids) > 0:
                if topic_id in topic_ids:
                    topic_subjects.append(subj_id)
                    topic_subj_list.append({subj_id: topic_id})

    set_all_subjs = set(subject_ids)
    set_topic_subjs = set(topic_subjects)

    only_subjs = list(set_all_subjs.symmetric_difference(set_topic_subjs))
    result_subj_topic_dict = {}

    for d in topic_subj_list:
        for key, value in d.items():
            result_subj_topic_dict.setdefault(key, []).append(value)

    return {"subjs_w/o_topics": only_subjs, "subjects_topics": result_subj_topic_dict}

async def get_q_count_by_filter(
    tenant_id: int,
    paper_id: int,
    subject_ids: list[int] | None = [],
    topic_ids: list[int] | None = [],
    randomize: bool | None = True,
    category: CATEGORY | None = None, is_external: bool | None = None
):
    params = {}
    if paper_id == settings.GS_PAPER_ID:
        filters = {
            "tenant": {
                "$or": [
                    {"tenantId": {"$eq": tenant_id}},
                    {"tenantId": {"$null": "true"}},
                ]
            },
            "paper": {"id": paper_id},
            "subject": {"id": {"$in": subject_ids}},
            "topic": {"id": {"$in": topic_ids}},
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
            "objective-questions",params=params, filters=filters, get_all=False
        )
        q_count = q_resp["meta"]["pagination"]["total"]
       
        return q_count
    elif paper_id == settings.CSAT_PAPER_ID:
        filters = {
            "tenant": {
                "$or": [
                    {"tenantId": {"$eq": tenant_id}},
                    {"tenantId": {"$null": "true"}},
                ]
            },
            "paper": {"id": paper_id},
            "subject": {"id": {"$in": subject_ids}},
            "topic": {"id": {"$in": topic_ids}},
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


        # populate["questions"] = {"populate": "*"}

        q_resp = await strapi.get_entries_v2(
            "objective-questions", filters=filters,params=params, get_all=False
        )
        q_resp2 = await strapi.get_entries_v2(
            "context-questions", filters=filters,params=params, populate={"questions":{"populate": "*"}} ,get_all=False
        )
        count1 = q_resp["meta"]["pagination"]["total"]
        # count2 = q_resp2["meta"]["pagination"]["total"]
        count2 = sum(len(item["attributes"]["questions"]) for item in q_resp2["data"])
        print("count>>>>>2", count2)
        q_count = count1 + count2

        
        return q_count
    else:
        filters = {
            "tenant": {
                "$or": [
                    {"tenantId": {"$eq": tenant_id}},
                    {"tenantId": {"$null": "true"}},
                ]
            },
            "paper": {"id": paper_id},
            "subject": {"id": {"$in": subject_ids}},
            "topic": {"id": {"$in": topic_ids}},
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
            "subjective-questions",params=params, filters=filters, get_all=False
        )
        q_count = q_resp["meta"]["pagination"]["total"]
       
        return q_count

async def get_content_count_by_category(category: CATEGORY | None = None, is_external: bool | None = None):
    params = {}
    filters_ca = {
        "isCurrentAffairs": "true",
        "publishingStatus": "PUBLISHED"
    }
    filters = {
        "publishingStatus": "PUBLISHED"
    }
    if category == CATEGORY.external and is_external:
                params = {
                    'filters[$or][0][category][$eq]': 'EXTERNAL',
                    'filters[$or][1][category][$null]': 'true'
                }
    elif category:
        filters["category"] = category
        filters_ca["category"] = category
    elif is_external:
        filters["category"] = {"$null": "true"}
        filters_ca["category"] = {"$null": "true"}
    mcq_resp_ca = await strapi.get_entries_v2(
            "objective-questions", filters=filters_ca,params=params, get_all=False
        )
    mcq_resp = await strapi.get_entries_v2(
            "objective-questions",filters=filters,params=params, get_all=False
        )
    cq_resp = await strapi.get_entries_v2(
            "context-questions", filters=filters,params=params, populate={"questions":{"populate": "*"}} ,get_all=False
        )
    sq_resp = await strapi.get_entries_v2(
            "subjective-questions",filters=filters,params=params, get_all=False
        )
    issue_resp = await strapi.get_entries_v2(
            "issues",filters=filters,params=params, get_all=False
        )
    count1 = mcq_resp_ca["meta"]["pagination"]["total"]
    count2 = mcq_resp["meta"]["pagination"]["total"]
    count3 = sum(len(item["attributes"]["questions"]) for item in cq_resp["data"])
    count4 = sq_resp["meta"]["pagination"]["total"]
    count5 = issue_resp["meta"]["pagination"]["total"]

    return {"prelims_ca_count":count1,"prelims_count":count2+count3+count1,"mains_count":count4,"issue_count":count5}
    
async def get_type_by_status_filter(*,type: str,category: CATEGORY | None = None, is_external: bool | None = None):
    params = {}
    filters_created= {
        "reviewStatus": "NOT_REVIEWED"
    }
    filters_sent= {
        "reviewStatus": "SENT_FOR_REVIEW"
    }
    filters_rev_passed= {
        "reviewStatus": "REVIEW_PASSED"
    }
    filters_rev_fail= {
        "reviewStatus": "REVIEW_FAILED"
    }
    filters_pub= {
        "publishingStatus": "PUBLISHED"
    }
    filters_unpub= {
        "publishingStatus": "UNPUBLISHED"
    }
    if category == CATEGORY.external and is_external:
        params = {
            'filters[$or][0][category][$eq]': 'EXTERNAL',
            'filters[$or][1][category][$null]': 'true'
        }
    elif category:
        filters_created["category"] = category
        filters_sent["category"] = category
        filters_rev_passed["category"] = category
        filters_rev_fail["category"] = category
        filters_pub["category"] = category
        filters_unpub["category"] = category
    elif is_external:
        filters_created["category"] = {"$null": "true"}
        filters_sent["category"] = {"$null": "true"}
        filters_rev_passed["category"] = {"$null": "true"}
        filters_rev_fail["category"] = {"$null": "true"}
        filters_pub["category"] = {"$null": "true"}
        filters_unpub["category"] = {"$null": "true"}
    created_resp = await strapi.get_entries_v2(
        type, filters=filters_created,params=params, get_all=False
    )
    filters_sent_resp = await strapi.get_entries_v2(
        type, filters=filters_sent,params=params, get_all=False
    )
    filters_rev_passed_resp = await strapi.get_entries_v2(
        type, filters=filters_rev_passed,params=params, get_all=False
    )
    filters_rev_fail_resp = await strapi.get_entries_v2(
        type, filters=filters_rev_fail,params=params, get_all=False
    )
    filters_pub_resp = await strapi.get_entries_v2(
        type, filters=filters_pub,params=params, get_all=False
    )
    filters_unpub_resp = await strapi.get_entries_v2(
        type, filters=filters_unpub,params=params, get_all=False
    )
    created_count = created_resp["meta"]["pagination"]["total"]
    filters_sent_count = filters_sent_resp["meta"]["pagination"]["total"]
    filters_rev_passed_count = filters_rev_passed_resp["meta"]["pagination"]["total"]
    filters_rev_fail_count = filters_rev_fail_resp["meta"]["pagination"]["total"]
    filters_pub_count = filters_pub_resp["meta"]["pagination"]["total"]
    filters_unpub_count = filters_unpub_resp["meta"]["pagination"]["total"]

    return {"created":created_count,"sent_review":filters_sent_count,"review_pass":filters_rev_passed_count,"review_fail":filters_rev_fail_count,"published":filters_pub_count,"unpublished":filters_unpub_count}

async def fetch_subjects(paper_id: int):
    populate = {"subjects": "true"}
    response = await strapi.get_entry("papers", document_id=paper_id, populate=populate)

    res_process = process_data(entry=response)

    if isinstance(res_process["subjects"], dict):
        res_process["subjects"] = process_data(entry=res_process["subjects"])
    subject_res = res_process["subjects"]
    subjects = []
    for subj in subject_res:
        subjects.append(subj["name"])
    return subjects

async def fetch_subject_benchmarks(*, exam_id: int | None = None, stage_id: int):
    filters = {"benchmark": {"stage": {"id": {"$eq": stage_id}}}}
    if exam_id:
        filters["exam"] = {"id": {"$eq": exam_id}}

    fields = ["name"]

    populate = {
        "benchmark": {
            "fields": ["averageMarksPercentage"],
            "populate": {
                "stage": {
                    "fields": ["id"],
                }
            },
        },
    }

    response = await strapi.get_entries(
        "subjects",
        populate=populate,  # ["benchmark", "benchmark.stage"],
        filters=filters,
        fields=fields, get_all=True
    )
    cms_subjects = process_data(entry=response)

    benchmark_dict = {}
    for subj in cms_subjects:
        for benchmark in subj["benchmark"]:
            if benchmark["stage"]["data"]["id"] == stage_id:
                benchmark_dict[subj["name"]] = benchmark["averageMarksPercentage"]
                break

    return benchmark_dict

async def fetch_mcqs(
    *,
    tenant_id: int,
    paper_id: int,
    subject_ids: list[int] | None = None,
    topic_ids: list[int] | None = None,
    # difficulty_level: DIFFICULTY_LEVEL | None = None,
    test_size: int | None = 10,
    source: SOURCE_TYPE | None = None,
    exclude_ids: list[int] | None = None,
    randomize: bool | None = True,
):
    url = f"{strapi.baseurl}api/mcqs"
    params = {
        "tenant": tenant_id,
        "paper": paper_id,
        **stringify_parameters("excludeIds", exclude_ids),
        **stringify_parameters("subjects", subject_ids),
        **stringify_parameters("topics", topic_ids),
        "limit": test_size,
        # **{"difficultyLevel": difficulty_level if difficulty_level else ""},
        **{"source": source if source else ""},
        # **{"excludePrevYear": "true" if exclude_prev_year else "false"},
        **{"randomize": "true" if randomize else "false"},
    }
    print(params)
    async with aiohttp.ClientSession() as session:
        res_obj = await strapi._get_entries(session, url, params)
        return res_obj["data"]

async def fetch_q_by_id(*, q_type: QUESTION_TYPE, id: int):
    populate = {
        "tenant": "true",
        "exam": "true",
        "paper": "true",
        "subject": "true",
        "topic": "true",
        "source": "true",
        # "current_affairs_topic": "true",
    }
    question_model_plural = "objectivequestions"
    if q_type == "MCQ":
        question_model_plural = "objective-questions"
        populate["options"] = "true"
        populate["current_affairs_topic"] = "true"
    if q_type == "SQ":
        question_model_plural = "subjective-questions"
    if q_type == "CQ":
        question_model_plural = "context-questions"
        populate["questions"] = {"populate": "*"}

    try:
        response = await strapi.get_entry(
            question_model_plural, document_id=id, populate=populate
        )
    except Exception as err:
        raise HTTPException(status_code=400, detail=err.__str__())

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process[k] and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def fetch_issue_by_id(*,id: int):
    populate = {
        "tenant": "true",
        "exams": "true",
        "papers": "true",
        "subjects": "true",
        "topics": "true",
        "questions":"true"
        # "current_affairs_topic": "true",
    }
    question_model_plural = "issues"
    
    try:
        response = await strapi.get_entry(
            question_model_plural, document_id=id, populate=populate
        )
    except Exception as err:
        raise HTTPException(status_code=400, detail=err.__str__())

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process[k] and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def fetch_collection_by_id_type(*,type: str, id: int):
    populate = {
        "exams": "true",
        "papers": "true",
        "subjects": "true",
        "topics": "true",
        # "natureOfPFS": "true"
        # "current_affairs_topic": "true",
    }
    if type == "prelims-fact-sheets":
        populate["natureOfPFS"] = "true"
    if type == "issues":
        populate = {
             "exams": "true",
            "papers": "true",
            "subjects": "true",
            "topics": "true",
            "currentAffairsTopics": "true",
            "eventInNews": "true",
            "links": "true",
            "example": "true",
            "data": "true",
            "caseStudy": "true",
            "prelimsFactSheet": "true",
            "questions": {
                "populate" : {
                    "multipleChoiceQuestion": {
                    "populate": "*"
                },
                "contextQuestion":  {
                        "populate": {
                            "questions": {
                                "populate": "options"  # Ensure options inside questions get populated
                            },
                            "exam": {"fields": ['id', 'name']},
                            "paper": {"fields": ['id', 'name']},
                            "subject": {"fields": ['id', 'name', "code"]},
                            "topic": {"fields": ['id', 'name', "code"]},
                            "source": "true",
                            "currentAffairsTopic": {"fields": ['id', 'name', "code"]},
                        }
                    },
                "subjectiveQuestion":  {
                        "populate": "*"
                    },
                    }
            }
        }
    question_model_plural = type
    
    try:
        response = await strapi.get_entry(
            question_model_plural, document_id=id, populate=populate
        )
    
    except Exception as err:
        raise HTTPException(status_code=400, detail=err.__str__())

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process[k] and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def fetch_collection_by_id_type(*,type: str, id: int):
    populate = {
        "exams": "true",
        "papers": "true",
        "subjects": "true",
        "topics": "true",
        # "natureOfPFS": "true"
        # "current_affairs_topic": "true",
    }
    if type == "prelims-fact-sheets":
        populate = {
                "exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "natureOfPFS": "true",
                "linkedIssue": "true",
                "questions": {
                    "populate" : {
                        "multipleChoiceQuestion": {
                        "populate": "*"
                    },
                    "contextQuestion":  {
                            "populate": {
                                "questions": {
                                    "populate": "options"  # Ensure options inside questions get populated
                                },
                                "exam": {"fields": ['id', 'name']},
                                "paper": {"fields": ['id', 'name']},
                                "subject": {"fields": ['id', 'name', "code"]},
                                "topic": {"fields": ['id', 'name', "code"]},
                                "source": "true",
                                "currentAffairsTopic": {"fields": ['id', 'name', "code"]},
                            }
                        }
                        }
                }

            }
    if type == "issues":
        populate = {
            "exams": "true",
            "papers": "true",
            "subjects": "true",
            "topics": "true",
            "currentAffairsTopics": "true",
            "eventInNews": "true",
            "links": "true",
            "example": "true",
            "data": "true",
            "caseStudy": "true",
            "prelimsFactSheet": "true",
            "questions": {
                "populate" : {
                    "multipleChoiceQuestion": {
                    "populate": "*"
                },
                "contextQuestion":  {
                        "populate": {
                            "questions": {
                                "populate": "options"  # Ensure options inside questions get populated
                            },
                            "exam": {"fields": ['id', 'name']},
                            "paper": {"fields": ['id', 'name']},
                            "subject": {"fields": ['id', 'name', "code"]},
                            "topic": {"fields": ['id', 'name', "code"]},
                            "source": "true",
                            "currentAffairsTopic": {"fields": ['id', 'name', "code"]},
                        }
                    },
                "subjectiveQuestion":  {
                        "populate": "*"
                    },
                    }
            }
        }
    question_model_plural = type
    
    try:
        response = await strapi.get_entry(
            question_model_plural, document_id=id, populate=populate
        )
    
    except Exception as err:
        raise HTTPException(status_code=400, detail=err.__str__())

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process[k] and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def fetch_collection_by_id_type_populate(*, type: str, id: int, populate: dict | None = None):
    try:
        response = await strapi.get_entry(
            type, document_id=id, populate=populate
        )
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))

    res_process = process_data(entry=response)

    for k, v in populate.items():
        if res_process.get(k) and isinstance(res_process[k], dict):
            res_process[k] = process_data(entry=res_process[k])

    return res_process

async def report_q_cms(
    *,
    q_type: QUESTION_TYPE,
    cms_id: int,
    q_num: int | None = 1,
    report_in: ReportCMSCreate,
):
    url = (
        f"{strapi.baseurl}api/questions/{q_type}/{cms_id}/report?index={q_num}"
        if q_type == QUESTION_TYPE.cq
        else f"{strapi.baseurl}api/questions/{q_type}/{cms_id}/report"
    )
    # params = {
    #     "type": q_type,
    #     "id": cms_id,
    #     "index": q_num,
    # }
    data = {
        "reason": report_in.reason,
        "remarks": report_in.remarks,
        "reportedById": report_in.reportedById,
        "reportedBy": report_in.reportedBy.model_dump_json(),
    }
    body = {"data": data}
    print(body)
    # print(params)
    async with aiohttp.ClientSession() as session:
        # async with session.patch(
        #     url.lower(), json=body, headers=strapi._get_auth_header()
        # ) as res:
        #     if res.status != 200:
        #         raise Exception(f"Unable to create entry, error {res.status}: {res}")
        #     return await res.json()

        res_obj = await session.patch(
            url=url.lower(), data=data, headers=strapi._get_auth_header()
        )
        print("res_obj", res_obj)
        return res_obj

async def create_tenant_cms(*, tenant_in: TenantCMS):
    url = f"{strapi.baseurl}api/tenants"
    # filters = {"domain": {"$eq": f"{tenant_in.domain}"}}
    data = {
        "name": tenant_in.name,
        "domain": tenant_in.domain,
        "tenantId": tenant_in.tenant_id,
    }

    # tenant_cms = await strapi.get_entries("tenants", filters=filters)
    # print(tenant_cms, "tenant_cms")
    # if tenant_cms:
    #     res_obj = await strapi.update_entry(
    #         "tenants",
    #         document_id=tenant_cms["data"][0]["id"],
    #         data={"tenantId": tenant_in.tenant_id},
    #     )
    # print("DATA TENANT", data)

    res_obj = await strapi.create_entry("tenants", data=data)
   
    return res_obj

async def get_review_item_count(
   group_id :int
):
    url = f"{cms_base_url}/api/review-items?filters[reviewGroup][id][$eq]={group_id}&pagination[withCount]=true"
    header = {'Authorization': 'Bearer ' + token}
    async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=header) as res:
                data = await res.json()
                response =  data.get("meta", {}).get("pagination", {}).get("total", 0)
    return response
    
async def fetch_paginated_review_items(user_ids: List[int]) -> List[Dict[str, Any]]:
    """Fetch review items from Strapi in pages, ensuring we get all relevant data."""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    all_review_items = []
    page = 1
    page_size = 20
    while True:
        query_params = {
            "filters[$or][0][reviewerL1Id][$in]": user_ids,
            "filters[$or][1][reviewerL2Id][$in]": user_ids,
            "pagination[page]": page,
            "pagination[pageSize]": page_size,
            }

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{cms_base_url}/api/review-items", headers=headers, params=query_params) as response:
                res_data = await response.json()
        data = res_data["data"]
        if not data:
            break  # Stop when there are no more pages

        all_review_items.extend(data)
        pagination = res_data.get("meta", {}).get("pagination", {})
        total_pages = pagination.get("pageCount", 0)
        
        if page >= total_pages:
            break  # Stop if we have reached the last page
        
        page += 1  # Move to next page
    return all_review_items

async def get_reviewers_total_assigned_count(user_ids: list[int]) -> List[Dict[str, Any]]:
    pass

async def get_mains_papers():
    params = {}
    filters = {
        "stage": {"name":{"$contains": "UPSC Mains"}}
    }
    # populate = {"papers":{"fields":['id','name']}}

    params_ids = {
        'fields[0]': 'id'
    }
    params_name = {
        'fields[1]': 'name'
    }

    response_ids = await strapi.get_entries_v3("papers", filters=filters, params = params_ids)

    response_names = await strapi.get_entries_v3("papers", filters=filters, params = params_name)

    res_process_ids = process_data(entry=response_ids)
    res_process_names = process_data(entry=response_names)

    return {"ids":res_process_ids,"names":res_process_names}

async def get_subjects(paper_ids: list[int]):
    params = {}
    populate = {"subjects":{"fields":['id','name']}}
    filters = {"id": {"$in": paper_ids}}
    response = await strapi.get_entries_v3("papers", filters=filters,populate=populate, params = params)

    res = process_data(entry=response)

    subjs =  [item["subjects"]["data"] for item in res]
    flat_list = [{"id":subj["id"],"name":subj["attributes"]["name"]} for sublist in subjs for subj in sublist]
    # Remove duplicates by 'id'
    unique_flat_list = []
    seen_ids = set()

    for item in flat_list:
        if item["id"] not in seen_ids:
            unique_flat_list.append(item)
            seen_ids.add(item["id"])

    return unique_flat_list


async def get_mains_topics(subject_ids: list[int]):
    filters = {"subjects": {"id": {"$in": subject_ids}}}
    populate = {"subjects": {"fields": ['id', 'name', "code"]}}
    response = await strapi.get_entries(
        "topics",
        filters=filters, get_all=True,
        populate=populate
    )
    return response
    

    
    # res_data: Optional[Union[dict, List[dict]]] = response['data']
    # res_process = process_data(entry={'data': res_data})

    # for i in range(len(res_process)):
    #     for k, v in populate.items():
    #         if res_process[i][k] and isinstance(res_process[i][k], dict):
    #             res_process[i][k] = process_data(entry=res_process[i][k])

    # return res_process


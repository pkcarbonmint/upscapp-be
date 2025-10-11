import json
from typing import List, Any, Dict, Optional
from fastapi import Request

from fastapi.routing import serialize_response

from src.external.cms.utils import stringify_parameters


async def serialize_query_content(key, value) -> dict:
    serialized_data = await serialize_response(response_content=value)
    if isinstance(serialized_data, dict):
        serialized = serialized_data
    else:
        serialized = {key: serialized_data}
    return serialized


async def unzip_query_params(
    all_params: Dict[str, Any], request: Request ,
    necessary_params: Optional[List[str]] = None
) -> Optional[Dict[str, Any]]:
    
    path_parts = request.url.path.split('/')
    index_of_v2 = path_parts.index("v2")
    service = path_parts[index_of_v2 + 1]
    entity = path_parts[index_of_v2 + 2]
    if service == "cms":
        pagination = {}
        applied_filters = ""
        if necessary_params:
            for key in necessary_params:
                applied_filters = all_params.get(key)
                if applied_filters:
                    applied_filters = json.loads(applied_filters)
                    for key in applied_filters:
                        if key in ["page", "pageSize"]:
                            pagination[key] = applied_filters[key]
        if entity == "objective-questions":
            populate = {
                "tenant": "true",
                "exam": "true",
                "paper": "true",
                "subject": "true",
                "topic": "true",
                "source": "true",
                "current_affairs_topic": "true",
            }
            populate["options"] = "true"
        elif entity in ["context-questions","subjective-questions"]:
            populate = {
                "tenant": "true",
                "exam": "true",
                "paper": "true",
                "subject": "true",
                "topic": "true",
                "source": "true",
                "currentAffairsTopic": "true",

            }
            populate["questions"] = {"populate": "*"}
        elif entity == "issues":
            populate = {
                "exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]},
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
        elif entity in ["prelims-fact-sheets","case-studies","issue-data","issue-examples","issue-events"]:
            populate = {
                "exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "natureOfPFS": "true",
                "linkedIssue": "true"

            }
        elif entity in ["review-items", "issue-questions"]:
            populate = {
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
                            "currentAffairsTopic": "true",
                        }
                    },
                "subjectiveQuestion":  {
                        "populate": "*"
                    },
                "issue": {
                    "populate" : {
                        "exams": {"fields": ['id', 'name']},
                        "stages": {"fields": ['id', 'name']},
                        "papers":{"fields": ['id', 'name']},
                        "subjects": {"fields": ['id', 'name', "code"]},
                        "topics": {"fields": ['id', 'name', "code"]},
                        "currentAffairsTopics": {"fields": ['id', 'name', "code"]},
                        "eventInNews": "true",
                        "links": "true",
                        "example": "true",
                        "data": "true",
                        "caseStudy": "true",
                        "prelimsFactSheet": "true"
                    }
                },
                "reviewItem": "true",
                "reviewGroup": "true",
                "reviewStatus": "true",
                "material": {
                    "populate": {"exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]},
                "issues":"true",
                "eventInNews": "true",
                "links": "true",
                "issueExamples": "true",
                "issueData": "true",
                "caseStudies": "true",
                "prelimsFactSheets": "true",
                "contextQuestions":  {
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
                "subjectiveQuestions":  {
                            "populate": "*"
                        },
                "multipleChoiceQuestions": {
                        "populate": "*"
                    }
            
                }
                },
                "governmentScheme":{
                    "populate" : {"exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]}},
            
                }
            }
        elif entity == "review-groups":
            populate = {"reviewItems":"true"}
        elif entity == "materials":
            populate = {
                "exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]},
                "issues":{
                            "populate": {
                                "exams": {"fields": ['id', 'name']},
                                "papers": {"fields": ['id', 'name']},
                                "subjects": {"fields": ['id', 'name', "code"]},
                                "topics": {"fields": ['id', 'name', "code"]},
                                "currentAffairsTopics": {"fields": ['id', 'name', "code"]},
                            }
                            # "populate": "*"
                        },
                "eventInNews": "true",
                "links": "true",
                "issueExamples": "true",
                "issueData": "true",
                "caseStudies": "true",
                "prelimsFactSheets": { "populate": {
                                "exams": {"fields": ['id', 'name']},
                                "papers": {"fields": ['id', 'name']},
                                "subjects": {"fields": ['id', 'name', "code"]},
                                "topics": {"fields": ['id', 'name', "code"]},
                                "linkedIssue": {"fields": ['id', 'name']}
                            }},
                "contextQuestions":  {
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
                "subjectiveQuestions":  {
                            "populate": {
                                "exam": {"fields": ['id', 'name']},
                                "paper": {"fields": ['id', 'name']},
                                "subject": {"fields": ['id', 'name', "code"]},
                                "topic": {"fields": ['id', 'name', "code"]},
                                "source": "true",
                                "currentAffairsTopic": {"fields": ['id', 'name', "code"]},
                            }
                            # "populate": "*"
                        },
                "multipleChoiceQuestions": {
                       "populate": {
                                "exam": {"fields": ['id', 'name']},
                                "paper": {"fields": ['id', 'name']},
                                "subject": {"fields": ['id', 'name', "code"]},
                                "topic": {"fields": ['id', 'name', "code"]},
                                "source": "true",
                                "currentAffairsTopic": {"fields": ['id', 'name', "code"]},
                            }
                    },
                "governmentSchemes": {
                    "populate": {"exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]}}
                }
            
            }
        elif entity == "government-schemes":
            populate = {"exams": {"fields": ['id', 'name']},
                "stages": {"fields": ['id', 'name']},
                "papers":{"fields": ['id', 'name']},
                "subjects": {"fields": ['id', 'name', "code"]},
                "topics": {"fields": ['id', 'name', "code"]},
                "currentAffairsTopics": {"fields": ['id', 'name', "code"]}}
        else:
            populate = {"populate":"*"}
        filters_param = stringify_parameters("filters", applied_filters if applied_filters else {})
        sort_param = stringify_parameters("sort", "id:desc")
        populate_param = stringify_parameters("populate", populate)
        pagination_param = stringify_parameters('pagination', pagination if pagination else {})

            # publication_state_param = stringify_parameters(
            #     "publicationState", publication_state
            # )
        params = {
            **filters_param,
            **populate_param,
            **pagination_param,
            **sort_param
            # **publication_state_param,
        }
        # print("params>>>>>", params)
        return params
    if necessary_params:
        response_query_params = {}
        for key in necessary_params:
            value = all_params.get(key)
            if value is None:
                return None
            serialized_dict = await serialize_query_content(key=key, value=value)
            response_query_params.update(serialized_dict)
        return response_query_params
    return None
import json
from fastapi import Request
from fastapi.routing import serialize_response
from typing import Dict, List, Optional, Any
from aiohttp import JsonPayload


async def unzip_body_object(request: Request,
    all_params: Dict[str, Any],
    necessary_params: Optional[List[str]] = None,
    user_details: Optional[Dict[str, Any]] = None,
) -> Optional[JsonPayload]:
    path_parts = request.url.path.split('/')
    index_of_v2 = path_parts.index("v2")
    service = path_parts[index_of_v2 + 1]
    entity = path_parts[index_of_v2 + 2]
    if necessary_params:
        response_body_dict = {}
        for key in necessary_params:
            value = all_params.get(key)
            _body_dict = await serialize_response(response_content=value)
            response_body_dict.update(_body_dict)
        if user_details:
            if entity in ["review-groups","prelims-fact-sheets","issues","materials","government-schemes","file-repos"]:
                response_body_dict["creator"] = {
                    "id": user_details.id,
                    "full_name": user_details.full_name,
                    "photo": user_details.photo, 
                }
                response_body_dict["creatorId"] = user_details.id
            if entity == "review-activities":
                response_body_dict["reviewer"] = {
                    "id": user_details.id,
                    "full_name": user_details.full_name,
                    "photo": user_details.photo,
                }
                response_body_dict["reviewerId"] = user_details.id
        if service == "cms":    
            return response_body_dict
        return JsonPayload(value=response_body_dict, dumps=json.dumps)
    return None

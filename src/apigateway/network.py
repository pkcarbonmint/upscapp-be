import json
import aiohttp
import async_timeout
from typing import Any, Dict, Optional, Union
from aiohttp import JsonPayload
from fastapi import Request
from starlette.datastructures import Headers

from src.modules.eventlogs.deps import log_event
from src.modules.eventlogs.schemas import EVENT_TYPE
from .utils.form import CustomFormData
# from .utils.response import decode_json
from .utils.request import create_dict_if_not
from fastapi_async_sqlalchemy import db


async def make_request(
    request: Request,
    url: str,
    method: str,
    headers: Union[Headers, dict],
    user_details: Optional[Dict[str, Any]] = None,
    query: Optional[dict] = None,
    data: Union[CustomFormData, JsonPayload] = None,
    timeout: int = 60,
):
    data = create_dict_if_not(data=data)
    query = create_dict_if_not(data=query)
    path_parts = request.url.path.split('/')
    index_of_v2 = path_parts.index("v2")
    service = path_parts[index_of_v2 + 1]
    if service == "cms":
        body: dict = {
                'data': data
            }
        async with async_timeout.timeout(delay=timeout):
            # headers = {'Authorization': 'Bearer eb4e7224709d37164fb65643e9d1a11d90d6174009b1d6c3913a99d29c58eea4cef7f7c2dfb1f99c6e5a5ace118d2e59dea59821eabd9e0e22232e11d6ed221c25f608860aa4b306d2cb658525903e071e4428d52febb19f991d9cd4599745db407450f18f5eedbc5d57808383a9b58c5d22d95f20c08778a758741dbf37f386'}
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.request(
                    method=method, url=url, json=body, params=query
                ) as response:
                    response_json = await response.json()
                    if response.status == 200:
                        user = user_details.__dict__
                        if method == "post":
                            #log event
                            await log_event(db=db.session,request=request,event_type=EVENT_TYPE.CONTENT_CREATE,event_by_user_id=user["id"],user_name=user["full_name"],user_phone=user["phone_number"],event_details={"content_id":response_json["data"]["id"],"collection_type":url.rstrip("/").split("/")[-1]})
                        elif method == 'put':
                            #log event
                            await log_event(db=db.session,request=request,event_type=EVENT_TYPE.CONTENT_UPDATE,event_by_user_id=user["id"],user_name=user["full_name"],user_phone=user["phone_number"],event_details={"content_id":response_json["data"]["id"],"content_name":url.rstrip("/").split("/")[-2],"updated_data":body["data"]})

                    # decoded_json = decode_json(data=response_json)
                    return response_json, response.status, response.headers
    async with async_timeout.timeout(delay=timeout):
        async with aiohttp.ClientSession(headers=headers) as session:
            
            async with session.request(
                method=method, url=url, data=data, params=query
            ) as response:
                response_json = await response.json()
                # decoded_json = decode_json(data=response_json)
                return response_json, response.status, response.headers
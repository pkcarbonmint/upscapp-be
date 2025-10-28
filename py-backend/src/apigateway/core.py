import functools
from aiohttp import ContentTypeError, ClientConnectorError
from fastapi import Request, Response, HTTPException, status, params
from typing import List, Optional, Sequence, Dict, Union, Any, Type,Set
from fastapi.datastructures import Default
# from fastapi.encoders import SetIntStr, DictIntStrAny
from starlette.responses import JSONResponse
from starlette.routing import BaseRoute
from src.config import settings
from .network import make_request
from .utils.body import unzip_body_object
from .utils.form import unzip_form_params
from .utils.query import unzip_query_params
from .utils.request import create_request_data
from .utils.headers import (
    inheritance_service_headers,
    generate_headers_for_microservice,
)
import re

SetIntStr = Set[Union[int, str]]
DictIntStrAny = Dict[Union[int, str], Any]

def route(
    request_method,
    gateway_path: str,
    service_url: str,
    service_path: Optional[str] = None,
    query_params: Optional[List[str]] = None,
    form_params: Optional[List[str]] = None,
    body_params: Optional[List[str]] = None,
    override_headers: bool = True,
    response_model: Optional[Type[Any]] = None,
    status_code: Optional[int] = None,
    tags: Optional[List[str]] = None,
    dependencies: Optional[Sequence[params.Depends]] = None,
    summary: Optional[str] = None,
    description: Optional[str] = None,
    response_description: str = "Successful Response",
    responses: Optional[Dict[Union[int, str], Dict[str, Any]]] = None,
    deprecated: Optional[bool] = None,
    operation_id: Optional[str] = None,
    response_model_include: Optional[Union[SetIntStr, DictIntStrAny]] = None,
    response_model_exclude: Optional[Union[SetIntStr, DictIntStrAny]] = None,
    response_model_by_alias: bool = True,
    response_model_exclude_unset: bool = False,
    response_model_exclude_defaults: bool = False,
    response_model_exclude_none: bool = False,
    include_in_schema: bool = True,
    response_class: Type[Response] = Default(JSONResponse),
    name: Optional[str] = None,
    callbacks: Optional[List[BaseRoute]] = None,
    openapi_extra: Optional[Dict[str, Any]] = None,
    timeout: int = 180,
    # token: str = None
):
   
    register_endpoint = request_method(
        path=gateway_path,
        response_model=response_model,
        status_code=status_code,
        tags=tags,
        dependencies=dependencies,
        summary=summary,
        description=description,
        response_description=response_description,
        responses=responses,
        deprecated=deprecated,
        operation_id=operation_id,
        response_model_include=response_model_include,
        response_model_exclude=response_model_exclude,
        response_model_by_alias=response_model_by_alias,
        response_model_exclude_unset=response_model_exclude_unset,
        response_model_exclude_defaults=response_model_exclude_defaults,
        response_model_exclude_none=response_model_exclude_none,
        include_in_schema=include_in_schema,
        response_class=response_class,
        name=name,
        callbacks=callbacks,
        openapi_extra=openapi_extra
    )

    def wrapper(f):
        @register_endpoint
        @functools.wraps(f)
        async def inner(request: Request, response: Response, user_details: Optional[Dict[str, Any]] = None , **kwargs):
            path_parts = request.url.path.split('/')
            index_of_v2 = path_parts.index("v2")
            service = path_parts[index_of_v2 + 1]
            # if service == "zoho":
                # if settings.ENVIRONMENT == "STAGING":
                #     return None
            scope = request.scope
            scope_method = scope["method"].lower()
            content_type = str(request.headers.get('Content-Type'))
            request_form = (
                await request.form() if 'x-www-form-urlencoded' in content_type else None
            )
            prepare_microservice_path = f"{service_url}{gateway_path}"
            if service_path:
                prepare_microservice_path = f"{service_url}{service_path}"

            microservice_url = prepare_microservice_path.format(**scope["path_params"])
            request_body = await unzip_body_object( request=request, user_details=user_details,
                necessary_params=body_params,
                all_params=kwargs
            )
            request_query = await unzip_query_params( request=request,
                necessary_params=query_params, all_params=kwargs
            )
            request_form = await unzip_form_params(
                necessary_params=form_params,
                request_form=request_form,
                all_params=kwargs,
            )
            
            request_headers = generate_headers_for_microservice(request=request,
                headers=request.headers,
            )

            request_data = create_request_data(
                form=request_form,
                body=request_body,
            )
            try:
                (
                    resp_data,
                    status_code_from_service,
                    microservice_headers,
                ) = await make_request(
                    request=request,
                    user_details=user_details,
                    url=microservice_url,
                    method=scope_method,
                    data=request_data,
                    query=request_query,
                    headers=request_headers,
                    timeout=timeout,
                )

            except ClientConnectorError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Service is unavailable.",
                )
            except ContentTypeError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Service error.",
                )

            if override_headers:
                service_headers = inheritance_service_headers(
                    gateway_headers=response.headers,
                    service_headers=microservice_headers,
                )

                response.headers.update(service_headers)
            response.status_code = status_code_from_service
            return resp_data

    return wrapper
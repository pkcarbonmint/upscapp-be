
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Body, Response, Path
import httpx
import requests
from src.config import settings
from src.constants import APP
from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE
from .schemas import *
from src.proxyrequest import gateway_request
from src.apigateway.core import route
from src.exceptions import status

zoho_router_v2 = APIRouter(tags=["Zoho V2"])
nopaperforms_v2 = APIRouter(tags = ["NopaperForms V2"])

zoho_base_url = "https://www.zohoapis.in/crm/v7"



@nopaperforms_v2.post("/nopaperforms/lead")
async def forward_lead(payload: dict):
    headers = {
        "secret-key": settings.SECRET_KEY,
        "access-key": settings.ACCESS_KEY,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(settings.NOPAPERFORMS_URL, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.json())

# @zoho_router_v2.post("/zoho/accesstoken")
# async def create_access_token():
#         # To check the status of the auth init request
#         url =  "https://accounts.zoho.in/oauth/v2/token"

#         params = {
#             "refresh_token": settings.ZOHO_REFRESH_TOKEN,
#             "client_id": settings.ZOHO_CLIENT_ID,
#             "client_secret": settings.ZOHO_CLIENT_SECRET,
#             "grant_type": "refresh_token"
#             }
#         response = requests.post(url=url, params=params)      
#         return response.json()

# @zoho_router_v2.post("/zoho/leads")
# async def create_leads(lead: ZohoData):
#         # To check the status of the auth init request
#         url =  "https://www.zohoapis.in/crm/v7/Leads"

#         payload = json.dumps({
#         "data": [
#             {
#             "Last_Name": "test user",
#             "Phone": "+91 06677788877",
#             "Email": "testuser8876@gmail.com",
#             "Lead_Source": "Walkin",
#             "Record_Image": None
#             }
#         ]
#         })
#         headers = {
#             "Authorization": f"Zoho-oauthtoken {token}"
#         }
        
#         response = requests.post(url=url,headers=headers,data=payload)
#         print("respo>>>>>>>>>>>>>", response.json())
      
#         return response.json()

# @zoho_router_v2.api_route("/{path:path}", methods=["POST","GET","PUT"])
# async def zoho(request: Request, path:str = None, data: ZohoData = Body(default=None)):
#         params = dict(request.query_params) if request.query_params else None
#         method = request.method
#         url = f"{zoho_base_url}/{path}"
#         token = access_token
#         headers = {
#             "Authorization": f"Zoho-oauthtoken {token}"
#         }
#         print("request_par>>>>>>>>>?????????????????", params, "VVV", method,"url",url, token,headers)
#         zoho_resp = await gateway_request(method=method,url=url,headers=headers,params=params,json_data=data.model_dump_json() if data else None)

#         return zoho_resp
        


@route(
    request_method=zoho_router_v2.post,
    service_url=zoho_base_url,
    gateway_path='/zoho/{entity}',
    service_path='/{entity}',
    # headers = {
    #         "Authorization": "Zoho-oauthtoken {token}"
    #     },
    # query_params=['query_int', 'query_str'],
    body_params=['test_body'],
    status_code=status.HTTP_200_OK,
    # token= 'token',
    # tags=['Query', 'Body', 'Path'],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], 
                                            roles=[USER_ROLE.front_desk_executive, USER_ROLE.admission_counsellor, USER_ROLE.admission_manager,USER_ROLE.student_administrator],apps=[APP.admin_app,APP.front_desk_app]))]
)
async def create(
        entity: str, test_body: dict, request: Request, response: Response
):
    pass

@route(
    request_method=zoho_router_v2.get,
    service_url=zoho_base_url,
    gateway_path='/zoho/{entity}/search',
    service_path='/{entity}/search',
    # headers = {
    #         "Authorization": "Zoho-oauthtoken {token}"
    #     },
    query_params=['criteria'],
    # body_params=['test_body'],
    status_code=status.HTTP_200_OK,
    # token= 'token',
    # tags=['Query', 'Body', 'Path'],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.front_desk_executive, USER_ROLE.admission_counsellor, USER_ROLE.admission_manager],apps=[APP.admin_app,APP.front_desk_app]))]
)
async def get(
        entity: str,request: Request,response: Response,criteria: str | None = None 
):
    pass

@route(
    request_method=zoho_router_v2.put,
    service_url=zoho_base_url,
    gateway_path='/zoho/{entity}/{id}',
    service_path='/{entity}/{id}',
    # headers = {
    #         "Authorization": "Zoho-oauthtoken {token}"
    #     },
    # query_params=['query_int', 'query_str'],
    body_params=['test_body'],
    status_code=status.HTTP_200_OK,
   
    # tags=['Query', 'Body', 'Path'],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.front_desk_executive,  USER_ROLE.admission_counsellor, USER_ROLE.admission_manager],apps=[APP.admin_app,APP.front_desk_app]))]
)
async def update(
        entity: str,
        test_body: dict,id:int, request: Request, response: Response
):
    pass

@route(
    request_method=zoho_router_v2.get,
    service_url=zoho_base_url,
    gateway_path='/zoho/{entity}/{id}',
    service_path='/{entity}/{id}',
    # headers = {
    #         "Authorization": "Zoho-oauthtoken {token}"
    #     },
    # query_params=['query_str'],
    # body_params=['test_body'],
    status_code=status.HTTP_200_OK,
   
    # tags=['Query', 'Body', 'Path'],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], 
                                            roles=[USER_ROLE.front_desk_executive, USER_ROLE.admission_counsellor, USER_ROLE.admission_manager],apps=[APP.admin_app,APP.front_desk_app]))]
)
async def get_by_id(
        entity: str,id:int,request: Request, response: Response 
):
    pass

@route(
    request_method=zoho_router_v2.post,
    service_url=zoho_base_url,
    gateway_path='/zoho/{entity}/{id}/actions/convert',
    service_path='/{entity}/{id}/actions/convert',
    # headers = {
    #         "Authorization": "Zoho-oauthtoken {token}"
    #     },
    # query_params=['query_int', 'query_str'],
    body_params=['test_body'],
    status_code=status.HTTP_200_OK,
   
    # tags=['Query', 'Body', 'Path'],
    dependencies=[Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], 
                                            roles=[USER_ROLE.front_desk_executive, USER_ROLE.admission_counsellor, USER_ROLE.admission_manager],apps=[APP.admin_app,APP.front_desk_app]))]
)
async def convert_lead(
        entity: str, id:int, test_body: dict, request: Request, response: Response
):
    pass
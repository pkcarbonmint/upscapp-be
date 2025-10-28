
from fastapi import APIRouter, Depends, HTTPException, Request, Body, Response, Path
import httpx
from fastapi_async_sqlalchemy import db
from src.config import settings
from src.constants import APP
from src.modules.frontdesk.models import Walkin
from src.modules.frontdesk.service import WalkinService
from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE
from .schemas import *
from src.proxyrequest import gateway_request
from src.apigateway.core import route
from src.exceptions import status
from datetime import datetime

whatsapp_router_v2 = APIRouter(tags=["Whatsapp V2"])

whatsapp_base_url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"

walkin_service = WalkinService(model=Walkin)

@whatsapp_router_v2.post("/whatsapp/msgs")
async def whatsapp_send_msgs(admission_id:int):
    headers = {
        "Content-Type": "application/json",
        "authkey": "434372AqhWsINVxo68dd1fb4P1",
    }
    info = await walkin_service.get_admission_student_details(admission_id=admission_id,db=db.session)
    def format_date_indian(date_str: str) -> str:
        if not date_str or date_str == "N/A":
            return "N/A"
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return dt.strftime("%d-%m-%Y")
        except Exception:
            return "N/A"
    payload = { "integrated_number": "917207774502", 
               "content_type": "template",
                 "payload": { "messaging_product": "whatsapp", "type": "template",
                              "template": { "name": "welcome_msg_with_start", "language": { "code": "en_GB", "policy": "deterministic", }, 
                                           "namespace": "5db6e227_cdef_4048_afe1_1401c4e73a2d", 
                                           "to_and_components": [ { "to": [info["phone_number"]], "components": { "header_1": { "type": "text", "value": info.get("student_name", "N/A"), },
                                                                                                                  "body_1": { "type": "text", "value": info.get("course_name", "N/A"), },
                                                                                                                    "body_2": { "type": "text", "value": info.get("branch_name", "N/A"), },
                                                                                                                      "body_3": { "type": "text", "value": format_date_indian(info.get("start_date", "N/A")), },
                                                                                                 "body_4": { "type": "text", "value": info.get("student_id", "N/A"), }, }, } ], }, }, }     
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(whatsapp_base_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
        

@whatsapp_router_v2.post("/whatsapp/reminder")
async def whatsapp_send_msgs(reminder_data:ReminderData):
    headers = {
        "Content-Type": "application/json",
        "authkey": "434372AqhWsINVxo68dd1fb4P1",
    }
    info = reminder_data.__dict__
    due_amt = await walkin_service.get_due_amount(purchase_id=reminder_data.purchase_id,db_session=db.session)
   
    payload = {
            "integrated_number": "917207774502",
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": "payment_reminder_v2",
                    "language": {"code": "en", "policy": "deterministic"},
                    "namespace": "5db6e227_cdef_4048_afe1_1401c4e73a2d",
                    "to_and_components": [
                        {
                            "to": [info["phone_number"]],
                            "components": {
                                "body_1": {"type": "text", "value": info["student_name"]},
                                "body_2": {"type": "text", "value": info["installment_date"]},
                                "body_3": {"type": "text", "value": info["course_name"]},
                                "body_4": {"type": "text", "value": info["branch_name"]},
                                "body_5": {"type": "text", "value": str(info["installment_count"])},
                                "body_6": {"type": "text", "value": str(info["total_installments"])},
                                "body_7": {"type": "text", "value": str(info["installment_amount"])},
                                "body_8": {"type": "text", "value": due_amt},
                                "body_9": {"type": "text", "value": info["installment_date"]},
                            },
                        }
                    ],
                },
            },
        }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(whatsapp_base_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
        


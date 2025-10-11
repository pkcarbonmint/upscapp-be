from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Body, Response, BackgroundTasks, Header, Depends
import base64

from src.base.service import BaseCRUD
from src.modules.frontdesk.schemas import AdmissionCreate
from src.modules.products.schemas import INSTALLMENT_STATUS, TX_STATUS, LinkTxData, PayPgData, PurchaseInstallmentCreate, PurchaseTransactionUpdate, RazorpayPayment
from .service import pg, razorpg
from .schemas import *
from src.config import settings
import json
from src.users.models import User
from src.auth.deps import valid_token_user
import base64
import datetime
import calendar
from fastapi_async_sqlalchemy import db
from src.users.models import User, Transaction, Subscription
from src.users.deps import check_recur_left
from src.users.schemas import (
    SubscriptionUpdate,
    TransactionUpdate,
    TransactionCreate,
    PaymentStatus,
    TxType,
)
from src.users.service import SubscriptionService, TransactionService
from src.auth.deps import valid_token_user
from fastapi import Depends
from src.config import settings
from .schemas import *
from src.utils import generate_random_alphanum
from .exceptions import *
import json
from datetime import datetime, timedelta
from src.external.emailer import email
from src.tasks import celery_tasks
from src.modules.products.routes import admission_crud,purchase_crud,purchase_installment_crud

subscription_service = SubscriptionService(Subscription, db)
transaction_service = TransactionService(Transaction, db)


pg_router = APIRouter(prefix="/pg")


@pg_router.post("/phonepe/callback", include_in_schema=False)
async def s2s_call_back_phonepe(
    *, payload: dict = Body(...), bg_tasks: BackgroundTasks
):
    # if X_API_Key != settings.PG_PHONEPE_CALLBACK_API_KEY:
    #     return {"success": True, "status": 200}
    print("s2s payload", payload)
    res = payload.get("response")
    print("response", res)
    decoded_response = res and base64.b64decode(res).decode("utf-8")
    response_json = json.loads(decoded_response)
    
    print("response_json",response_json)
    response_data = response_json["data"]

    print("response_data", response_data)

    # await pg.handle_callback(decoded_response=decoded_response)
    response = PgS2SCallbackResponse(**response_data)  # data
    print("response_pg", response)

    async with db():
        if response.callback_type == CALLBACK_TYPE.auth:
            ### check tx db for pending .. if pending... call pg auth stattus req

            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.auth_request_id,db_session=db.session
            )
            subs_db = await subscription_service.get_by_field(
                field="auth_req_id", value=response.auth_request_id,db_session=db.session
            )

            tx_update = TransactionUpdate(
                pg_data=response.transaction_details,
                pg_ref_id=response.transaction_details.provider_reference_id,
                tx_status=response.transaction_details.state,
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )

            pg_data = subs_db.pg_data
            print("sub_state", response.subscription_details.state)
            pg_data["state"] = response.subscription_details.state
            print("AUTH>>>>", pg_data["state"], response.transaction_details.state)
            subs_update = SubscriptionUpdate(
                subscription_status=response.subscription_details.state,
                payment_status=response.transaction_details.state,
                pg_data=pg_data,
            )
            subs_update_db = await subscription_service.update(
                obj_current=subs_db, obj_new=subs_update,db_session=db.session
            )

            # if auth tx susccessful, setup recurring init task 24h before curr exp
            if response.transaction_details.state == "COMPLETED" and check_recur_left(
                subs=subs_db
            ):
                print("TRANSACTION COMPLETED")
                recurr_date = subs_db.current_expiry_at - timedelta(days=1)

                tx_id_new = generate_random_alphanum(length=20)
                recurr_init_tx = TransactionCreate(
                    paid_by=subs_db.user_id,
                    subscription_id=subs_db.id,
                    amount=subs_db.subscription_amount,
                    payment_mode=tx_db.payment_mode,
                    description="Subscription Recurring Debit Transaction",
                    tx_id=tx_id_new,
                    tx_status=PaymentStatus.created,
                    tx_type=TxType.subs_debit,
                    tx_at=subs_db.current_expiry_at,
                )
                transaction_db = await transaction_service.create(obj_in=recurr_init_tx,db_session=db.session)
                recurr_in = PgRecurringInitSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantUserId=str(subs_db.user_id),
                    subscriptionId=subs_db.pg_ref_id,
                    transaction_id=recurr_init_tx.tx_id,
                    auto_debit=True,
                    amount=subs_db.subscription_amount,
                )
                ###celery task for recurring subs

                task_id = celery_tasks.subs_recurring_init_task.apply_async(
                    (recurr_in.model_dump_json(),), eta=recurr_date
                )
                print("task_id>>>",task_id)

            # update subs with auth tx details and recurring init task id
            subs_new_update_db = await subscription_service.update(
                obj_current=subs_update_db,
                obj_new={
                    # **subs_update.model_dump(),
                    "recurring_task_id": str(task_id)
                    or None,
                },db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.notify:
            # will not get for autodebit = True
            ### check tx db
            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.transaction_id,db_session=db.session
            )
            subs_db = await subscription_service.get_by_field(
                field="pg_ref_id", value=response.subscription_details.subscription_id,db_session=db.session
            )
            pg_data = tx_db.pg_data
            pg_data["notification_details"] = response.notification_details

            tx_update = TransactionUpdate(
                pg_data=pg_data, tx_status=response.notification_details.state
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.debit:
            ### check tx db
            print("DEBIT CALLBACK RECEIVED")
            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.transaction_id,db_session=db.session
            )
            pg_data = response or tx_db.pg_data
            pg_data["notification_details"] = response.notification_details
            tx_update = TransactionUpdate(
                pg_data=pg_data, tx_status=response.transaction_details.state
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )

            subs_db = await subscription_service.get(id=tx_db.subscription_id,db_session=db.session)
            pg_data = subs_db.pg_data
            pg_data["state"] = response.subscription_details.state

            # if recurring debit tx susccessful, setup recurring init task 24h before curr exp
            if response.transaction_details.state == "COMPLETED" and check_recur_left(
                subs=subs_db
            ):
                # update current expiry date for the subs
                current_expiry_at: datetime = subs_db.current_expiry_at
                expiry_month = (
                    current_expiry_at.month + subs_db.plan.billing_frequency - 1
                ) % 12 + 1
                # expiry_year = start_at.year + int((start_at.month + plan.billing_frequency) / 12)
                expiry_year = (
                    current_expiry_at.year
                    + (current_expiry_at.month + subs_db.plan.billing_frequency - 1)
                    // 12
                )
                days_in_expiry_month = calendar.monthrange(
                    year=expiry_year, month=expiry_month
                )[1]

                expiry_day = min(current_expiry_at.day, days_in_expiry_month)

                current_expiry_at_new = (
                    current_expiry_at.replace(day=expiry_day)
                    .replace(month=expiry_month)
                    .replace(year=expiry_year)
                )
                recurr_date = current_expiry_at_new - timedelta(days=1)
                tx_id_new = generate_random_alphanum(length=20)
                recurr_init_tx = TransactionCreate(
                    paid_by=subs_db.user_id,
                    subscription_id=subs_db.id,
                    amount=subs_db.subscription_amount,
                    payment_mode=tx_db.payment_mode,
                    description="Subscription Recurring Debit Transaction",
                    tx_id=tx_id_new,
                    tx_status=PaymentStatus.created,
                    tx_type=TxType.subs_debit,
                    tx_at=subs_db.current_expiry_at,
                )
                recurr_in = PgRecurringInitSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantUserId=str(subs_db.user_id),
                    subscriptionId=subs_db.pg_ref_id,
                    transaction_id=recurr_init_tx.tx_id,
                    auto_debit=True,
                    amount=subs_db.subscription_amount,
                )
                ##celery task
                task_id = celery_tasks.subs_recurring_init_task.apply_async(
                    (recurr_in,), eta=recurr_date
                )

            # update subs with auth tx details and recurring init task id
            subs_update = SubscriptionUpdate(
                current_expiry_at=current_expiry_at_new or subs_db.current_expiry_at,
                subscription_status=response.subscription_details.state,
                payment_status=response.transaction_details.state,
                pg_data=pg_data,
            )
            subs_update_db = await subscription_service.update(
                obj_current=subs_db,
                obj_new={
                    **subs_update.model_dump(),
                    "recurring_task_id": task_id or None,
                },db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.subscription:
            """
            s2s_tx = response.data
            subs_in = subscription_service.get_by_field(
                value=s2s_tx["subscriptionDetails"]["subscriptionId"], field="pg_ref_id"
            )
            subs_update = PgSubsData(
                **subs_in.pg_data, state=s2s_tx["subscriptionDetails"]["state"]
            )

            subs_in = Subscription(pg_data=subs_update)
            subs_update_db = subscription_service.update(
                obj_current=subs_in, obj_new=subs_in
            )
            """
            subs_db = await subscription_service.get_by_field(
                field="subs_id", value=response.merchant_subscription_id,db_session=db.session
            )
            pg_data = subs_db.pg_data
            pg_data["state"] = response.subscription_details.state
            if response.subscription_details.state_start_date:
                pg_data[
                    "state_start_date"
                ] = response.subscription_details.state_start_date
            if response.subscription_details.state_end_date:
                pg_data["state_end_date"] = response.subscription_details.state_end_date

            subs_update = SubscriptionUpdate(
                subscription_status=response.subscription_details.state,
                # payment_status=response.transaction_details.state,
                pg_data=pg_data,
            )

            subs_update_db = await subscription_service.update(
                obj_current=subs_db, obj_new=subs_update,db_session=db.session
            )
        else:
            print(response)

        await email.send_email(
            recipient_name="Swathi",
            email_to=["swathi@nearbuzz.com"],
            subject="Response of pg call back",
            data=response.model_dump(),
            template_name="email_s2sresponse",
        )

        # return True

    # bg_tasks.add_task(pg.handle_callback, response=response_json)

    return {"success": True, "status": 200}

@pg_router.get("/phonepe/callback", include_in_schema=True)
async def s2s_call_back_phonepe(
    *, response: str | None = None, bg_tasks: BackgroundTasks
):
    # if X_API_Key != settings.PG_PHONEPE_CALLBACK_API_KEY:
    #     return {"success": True, "status": 200}
    # print("s2s payload", payload)
    # res = payload.get("response")
    print("response", response)
    decoded_response = response and base64.b64decode(response).decode("utf-8")
    response_json = json.loads(decoded_response)

    print("response_json",response_json)
    response_data = response_json["data"]

    print("response_data", response_data)

    # await pg.handle_callback(decoded_response=decoded_response)
    response = PgS2SCallbackResponse(**response_data)  # data
    print("response_pg", response)

    async with db():
        if response.callback_type == CALLBACK_TYPE.auth:
            ### check tx db for pending .. if pending... call pg auth stattus req

            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.auth_request_id,db_session=db.session
            )
            subs_db = await subscription_service.get_by_field(
                field="auth_req_id", value=response.auth_request_id,db_session=db.session
            )

            tx_update = TransactionUpdate(
                pg_data=response.transaction_details,
                pg_ref_id=response.transaction_details.provider_reference_id,
                tx_status=response.transaction_details.state,
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )

            pg_data = subs_db.pg_data
            print("sub_state", response.subscription_details.state)
            pg_data["state"] = response.subscription_details.state
            print("AUTH>>>>", pg_data["state"], response.transaction_details.state)
            subs_update = SubscriptionUpdate(
                subscription_status=response.subscription_details.state,
                payment_status=response.transaction_details.state,
                pg_data=pg_data,
            )
            subs_update_db = await subscription_service.update(
                obj_current=subs_db, obj_new=subs_update,db_session=db.session
            )

            # if auth tx susccessful, setup recurring init task 24h before curr exp
            if response.transaction_details.state == "COMPLETED" and check_recur_left(
                subs=subs_db
            ):
                print("TRANSACTION COMPLETED")
                recurr_date = subs_db.current_expiry_at - timedelta(days=1)

                tx_id_new = generate_random_alphanum(length=20)
                recurr_init_tx = TransactionCreate(
                    paid_by=subs_db.user_id,
                    subscription_id=subs_db.id,
                    amount=subs_db.subscription_amount,
                    payment_mode=tx_db.payment_mode,
                    description="Subscription Recurring Debit Transaction",
                    tx_id=tx_id_new,
                    tx_status=PaymentStatus.created,
                    tx_type=TxType.subs_debit,
                    tx_at=subs_db.current_expiry_at,
                )
                transaction_db = await transaction_service.create(obj_in=recurr_init_tx,db_session=db.session)
                recurr_in = PgRecurringInitSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantUserId=str(subs_db.user_id),
                    subscriptionId=subs_db.pg_ref_id,
                    transaction_id=recurr_init_tx.tx_id,
                    auto_debit=True,
                    amount=subs_db.subscription_amount,
                )
                ###celery task for recurring subs

                task_id = celery_tasks.subs_recurring_init_task.apply_async(
                    (recurr_in.model_dump_json(),), eta=recurr_date
                )
                print("task_id>>>",task_id)

            # update subs with auth tx details and recurring init task id
            subs_new_update_db = await subscription_service.update(
                obj_current=subs_update_db,
                obj_new={
                    # **subs_update.model_dump(),
                    "recurring_task_id": str(task_id)
                    or None,
                },db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.notify:
            # will not get for autodebit = True
            ### check tx db
            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.transaction_id,db_session=db.session
            )
            subs_db = await subscription_service.get_by_field(
                field="pg_ref_id", value=response.subscription_details.subscription_id,db_session=db.session
            )
            pg_data = tx_db.pg_data
            pg_data["notification_details"] = response.notification_details

            tx_update = TransactionUpdate(
                pg_data=pg_data, tx_status=response.notification_details.state
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.debit:
            ### check tx db
            print("DEBIT CALLBACK RECEIVED")
            tx_db = await transaction_service.get_by_field(
                field="tx_id", value=response.transaction_id,db_session=db.session
            )
            pg_data = response or tx_db.pg_data
            pg_data["notification_details"] = response.notification_details
            tx_update = TransactionUpdate(
                pg_data=pg_data, tx_status=response.transaction_details.state
            )
            tx_update_db = await transaction_service.update(
                obj_current=tx_db, obj_new=tx_update,db_session=db.session
            )

            subs_db = await subscription_service.get(id=tx_db.subscription_id,db_session=db.session)
            pg_data = subs_db.pg_data
            pg_data["state"] = response.subscription_details.state

            # if recurring debit tx susccessful, setup recurring init task 24h before curr exp
            if response.transaction_details.state == "COMPLETED" and check_recur_left(
                subs=subs_db
            ):
                # update current expiry date for the subs
                current_expiry_at: datetime = subs_db.current_expiry_at
                expiry_month = (
                    current_expiry_at.month + subs_db.plan.billing_frequency - 1
                ) % 12 + 1
                # expiry_year = start_at.year + int((start_at.month + plan.billing_frequency) / 12)
                expiry_year = (
                    current_expiry_at.year
                    + (current_expiry_at.month + subs_db.plan.billing_frequency - 1)
                    // 12
                )
                days_in_expiry_month = calendar.monthrange(
                    year=expiry_year, month=expiry_month
                )[1]

                expiry_day = min(current_expiry_at.day, days_in_expiry_month)

                current_expiry_at_new = (
                    current_expiry_at.replace(day=expiry_day)
                    .replace(month=expiry_month)
                    .replace(year=expiry_year)
                )
                recurr_date = current_expiry_at_new - timedelta(days=1)
                tx_id_new = generate_random_alphanum(length=20)
                recurr_init_tx = TransactionCreate(
                    paid_by=subs_db.user_id,
                    subscription_id=subs_db.id,
                    amount=subs_db.subscription_amount,
                    payment_mode=tx_db.payment_mode,
                    description="Subscription Recurring Debit Transaction",
                    tx_id=tx_id_new,
                    tx_status=PaymentStatus.created,
                    tx_type=TxType.subs_debit,
                    tx_at=subs_db.current_expiry_at,
                )
                recurr_in = PgRecurringInitSchema(
                    merchantId=settings.MERCHANT_ID,
                    merchantUserId=str(subs_db.user_id),
                    subscriptionId=subs_db.pg_ref_id,
                    transaction_id=recurr_init_tx.tx_id,
                    auto_debit=True,
                    amount=subs_db.subscription_amount,
                )
                ##celery task
                task_id = celery_tasks.subs_recurring_init_task.apply_async(
                    (recurr_in,), eta=recurr_date
                )

            # update subs with auth tx details and recurring init task id
            subs_update = SubscriptionUpdate(
                current_expiry_at=current_expiry_at_new or subs_db.current_expiry_at,
                subscription_status=response.subscription_details.state,
                payment_status=response.transaction_details.state,
                pg_data=pg_data,
            )
            subs_update_db = await subscription_service.update(
                obj_current=subs_db,
                obj_new={
                    **subs_update.model_dump(),
                    "recurring_task_id": task_id or None,
                },db_session=db.session
            )
        elif response.callback_type == CALLBACK_TYPE.subscription:
            """
            s2s_tx = response.data
            subs_in = subscription_service.get_by_field(
                value=s2s_tx["subscriptionDetails"]["subscriptionId"], field="pg_ref_id"
            )
            subs_update = PgSubsData(
                **subs_in.pg_data, state=s2s_tx["subscriptionDetails"]["state"]
            )

            subs_in = Subscription(pg_data=subs_update)
            subs_update_db = subscription_service.update(
                obj_current=subs_in, obj_new=subs_in
            )
            """
            subs_db = await subscription_service.get_by_field(
                field="subs_id", value=response.merchant_subscription_id,db_session=db.session
            )
            pg_data = subs_db.pg_data
            pg_data["state"] = response.subscription_details.state
            if response.subscription_details.state_start_date:
                pg_data[
                    "state_start_date"
                ] = response.subscription_details.state_start_date
            if response.subscription_details.state_end_date:
                pg_data["state_end_date"] = response.subscription_details.state_end_date
            pg_data_cn = PgSubsData(subscription_id=response.merchant_subscription_id,state=response.subscription_details.state)
            subs_update = SubscriptionUpdate(
                subscription_status=response.subscription_details.state,
                # payment_status=response.transaction_details.state,
                pg_data=pg_data_cn,
            )

            subs_update_db = await subscription_service.update(
                obj_current=subs_db, obj_new=subs_update,db_session=db.session
            )
        else:
            print(response)

        await email.send_email(
            recipient_name="Swathi",
            email_to=["swathi@nearbuzz.com"],
            subject="Response of pg call back",
            data=response.model_dump(),
            template_name="email_s2sresponse",
        )

        # return True

    return {"success": True, "status": 200}

@pg_router.post("/phonepe/pay/callback")
async def s2s_call_back_phonepe( *, payload: dict = Body(...)):
  
    res = payload.get("response")
    print("pay_callback>>>", res)
    decoded_response = res and base64.b64decode(res).decode("utf-8")
    response_json = json.loads(decoded_response)
    response_data = response_json["data"]
    response = PgPayS2SCallbackResponse(**response_data)  # data
    async with db():
        tx_db = transaction_service.get_by_field(
                field="tx_id", value=response.merchant_transaction_id,db_session=db.session
            )
        tx_update = Transaction(
            amount = response.amount,
            pg_ref_id =  response.transaction_id,
            pg_data = PayPgData(**response),
            tx_status=response.state,
            tx_at=datetime.now(),
            )
        tx_update = transaction_service.update(db_session=db.session,obj_current=tx_db,object_new=tx_update)
        installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
        purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)

        ##
        if  response.state == "COMPLETED":    
            if purchases:
                for purchase in purchases:
                    purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":"COMPLETED"})
            if installments:
                for installment in installments :
                    installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":"COMPLETED"})   
                    purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":"COMPLETED"})       
        elif response.state == "FAILED":   
                if purchases:
                    for purchase in purchases:
                        purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":"CREATED"})
                if installments:
                    for installment in installments :
                        installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":"CREATED"})
                        purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":"CREATED"})
        
    ##
        return {"success": True, "status": 200}


@pg_router.get("/phonepe/subscriptions/{subs_id}/status")
async def subscription_status_phonepe(*, subs_id: str, user: User = Depends(valid_token_user)):
    res = await pg.check_subscription_status(subs_id=subs_id)

    return res

@pg_router.post("/phonepe/subscriptions")
async def subscription_create_phonepe(*, subs_in: PgSubsCreateSchema,user: User = Depends(valid_token_user)):
    res = await pg.create_subscription(create_subs=subs_in)

    return res

@pg_router.get("/check-callback")
async def callback_resp(*, res: str, bg_tasks: BackgroundTasks):
    RAZORPAY_WEBHOOK_SECRET = "laexstagewebhook"
    data = {'entity': 'event', 'account_id': 'acc_QLgqtftBn6fAql', 'event': 'payment.failed', 'contains': ['payment'], 'payload': {'payment': {'entity': 
                                                                                                                                               {'id': 'pay_QOoI4T2vESWbRq', 'entity': 'payment', 'amount': 10000, 'currency': 'INR', 'status': 'failed', 'order_id': 'order_QOoHjr46EeeUwB', 'invoice_id': None, 'international': False, 'method': 'netbanking', 'amount_refunded': 0, 'refund_status': None, 'captured': False, 'description': '#QOoFAZGNqDgXxw', 'card_id': None, 'bank': 'CNRB', 'wallet': None, 'vpa': None, 'email': 'xyz@gmail.com', 'contact': '+919573146729', 'notes': [], 'fee': 0, 'tax': None, 'error_code': 'BAD_REQUEST_ERROR', 'error_description': "Your payment didn't go through as it was declined by the bank. Try another payment method or contact your bank.", 'error_source': 'bank', 'error_step': 'payment_authorization', 'error_reason': 'payment_failed', 'acquirer_data': {'bank_transaction_id': None}, 'created_at': 1745915920, 'late_authorized': False}}}, 'created_at': 1745915925}
    if data["event"] == "payment.failed":
        print("failedrazorpay", data )
        hash_link = data["payload"]["payment"]["entity"]["description"]
        link_id = "plink_" + hash_link.lstrip("#")
        if link_id:
            tx_db = await transaction_service.get_tx_by_link_id(link_id=link_id,db_session=db.session)
            print("tx_db>>>>>", tx_db.__dict__)
            if tx_db:
                installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
                purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
                purchase_ids = tx_db.tx_data["purchase_ids"]
                purchase_installment_ids = tx_db.tx_data["purchase_installment_ids"]
                # tx_data = LinkTxData(purchase_ids=purchase_ids,purchase_installment_ids=purchase_installment_ids, **data["payload"]["payment_link"]["entity"] )
                pg_data = RazorpayPayment(**data["payload"]["payment"]["entity"])
                tx_update = PurchaseTransactionUpdate(
                    amount = data["payload"]["payment"]["entity"]["amount"],
                    pg_data = pg_data,
                    # tx_data = tx_data,
                    tx_status=TX_STATUS.failed,
                    tx_at=data["payload"]["payment"]["entity"]["created_at"],
                    pg_ref_id= data["payload"]["payment"]["entity"]["id"]
                    )
                
                tx_update_db = await transaction_service.update(obj_current=tx_db,obj_new=tx_update,db_session=db.session)          
                
                if purchases:
                    for purchase in purchases:
                        # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                        purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.created})
                if installments:
                    for installment in installments :
                        installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.created})   
                        purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created})   
    # body_bytes = b'{"entity":"event","account_id":"acc_QBMJ7G4H9v6DsM","event":"payment.failed","contains":["payment"],"payload":{"payment":{"entity":{"id":"pay_QOSPG2RQG4yVXy","entity":"payment","amount":4000000,"currency":"INR","status":"failed","order_id":"order_QOSOXRVLNxJVgH","invoice_id":null,"international":false,"method":"wallet","amount_refunded":0,"refund_status":null,"captured":false,"description":"#QOSOOk1gRfcKzM","card_id":null,"bank":null,"wallet":"phonepe","vpa":null,"email":"amitrgupta9@gmail.com","contact":"+919652000227","notes":[],"fee":0,"tax":null,"error_code":"BAD_REQUEST_ERROR","error_description":"Your payment has been cancelled. Try again or complete the payment later.","error_source":"customer","error_step":"payment_authentication","error_reason":"payment_cancelled","acquirer_data":{"transaction_id":null},"created_at":1745838853,"late_authorized":false}}},"created_at":1745838869}' 
    # body_str = body_bytes.decode()
    # razorpay_signature = "0bc01fa3ed397dd5c418ce9039ea49b85cf224c82f822c71c98a4ae80aee02c0"
    # verify_signature = await razorpg.verify_signature(body_str, razorpay_signature, RAZORPAY_WEBHOOK_SECRET)
    # if not verify_signature:
    #     raise HTTPException(status_code=400, detail="Invalid signature")
    # return verify_signature

    # decoded_response = res and base64.b64decode(res).decode("utf-8")
    # response_json = json.loads(decoded_response)
    # bg_tasks.add_task(pg.handle_callback, response_json=response_json)
    # return response_json

@pg_router.post("/razorpay/pay/callback")
async def razorpay_webhook(
    request: Request
):
    RAZORPAY_WEBHOOK_SECRET = "laexstagewebhook"
    data = await request.json()
    razorpay_signature = request.headers.get("x-razorpay-signature")

    if razorpay_signature is None:
        raise HTTPException(status_code=400, detail="Missing Razorpay signature")
    print("razordata>>>>>>>", data, await request.body(),razorpay_signature )
    body_bytes = await request.body()
    body_str = body_bytes.decode()
    
    verify_signature = await razorpg.verify_signature(body_str, razorpay_signature, RAZORPAY_WEBHOOK_SECRET)
    if not verify_signature:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if data["event"] == "payment_link.paid":
        ref_id = data["payload"]["payment_link"]["entity"]["reference_id"]
        tx_db = await transaction_service.get_by_field(value=ref_id,field="tx_id",db_session=db.session)
        installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
        purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
        purchase_ids = tx_db.tx_data["purchase_ids"]
        purchase_installment_ids = tx_db.tx_data["purchase_installment_ids"]
        tx_data = LinkTxData(purchase_ids=purchase_ids,purchase_installment_ids=purchase_installment_ids, **data["payload"]["payment_link"]["entity"] )
        pg_data = RazorpayPayment(**data["payload"]["payment"]["entity"])
        tx_update = PurchaseTransactionUpdate(
            amount = data["payload"]["payment"]["entity"]["amount"],
            pg_data = pg_data,
            tx_data = tx_data,
            tx_status=TX_STATUS.completed,
            tx_at=data["payload"]["payment"]["entity"]["captured_at"],
            pg_ref_id= data["payload"]["payment"]["entity"]["id"]
            )
           
        tx_update_db = await transaction_service.update(obj_current=tx_db,obj_new=tx_update,db_session=db.session)          
        
        if purchases:
            for purchase in purchases:
                # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.completed})
        if installments:
            for installment in installments :
                installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.completed})   
                purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.completed})  
    elif data["event"] == "payment_link.expired":
        pass
    elif data["event"] == "payment_link.cancelled":
        pass
    elif data["event"] == "payment.failed":
        print("failedrazorpay", data )
        hash_link = data["payload"]["payment"]["entity"]["description"]
        if hash_link:
            link_id = "plink_" + hash_link.lstrip("#")
            if link_id:
                tx_db = await transaction_service.get_tx_by_link_id(link_id=link_id,db_session=db.session)
                if tx_db:
                    installments = await purchase_installment_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
                    purchases = await purchase_crud.get_by_filters_multi(ids=[tx_db.id],attr="transaction_id",db=db.session)
                    purchase_ids = tx_db.tx_data["purchase_ids"]
                    purchase_installment_ids = tx_db.tx_data["purchase_installment_ids"]
                    # tx_data = LinkTxData(purchase_ids=purchase_ids,purchase_installment_ids=purchase_installment_ids, **data["payload"]["payment_link"]["entity"] )
                    pg_data = RazorpayPayment(**data["payload"]["payment"]["entity"])
                    tx_update = PurchaseTransactionUpdate(
                        amount = data["payload"]["payment"]["entity"]["amount"],
                        pg_data = pg_data,
                        # tx_data = tx_data,
                        tx_status=TX_STATUS.failed,
                        tx_at=data["payload"]["payment"]["entity"]["created_at"],
                        pg_ref_id= data["payload"]["payment"]["entity"]["id"]
                        )
                    
                    tx_update_db = await transaction_service.update(obj_current=tx_db,obj_new=tx_update,db_session=db.session)          
                    
                    if purchases:
                        for purchase in purchases:
                            # admission_db = await admission_crud.create(db=db.session,object=AdmissionCreate(user_id=purchase.paid_by,status=TX_STATUS.created))
                            purchase_update = await purchase_crud.update(db=db.session,id=purchase.id,object={"purchase_status":INSTALLMENT_STATUS.created})
                    if installments:
                        for installment in installments :
                            installments_update = await purchase_installment_crud.update(db=db.session,id=installment.id,object={"installment_status":INSTALLMENT_STATUS.created})   
                            purchase_update = await purchase_crud.update(db=db.session,id=installment.purchase_id,object={"purchase_status":INSTALLMENT_STATUS.created})  
    elif data["event"] == "payment.captured":
        pass
        
    #pg_status = await razorpg.paymentlink_payment_status(payment_id=link_update.razorpay_payment_id)
    
    return {"success": True, "status": 200}

    #sample
    ''' failedrazorpay {'account_id': 'acc_QBMJ7G4H9v6DsM', 'contains': ['payment'], 'created_at': 1752580360, 'entity': 'event', 'event': 'payment.failed', 'payload': {'payment': {'entity': {'acquirer_data': {'rrn': None}, 'amount': 2100000, 'amount_refunded': 0, 'bank': None, 'captured': False, 'card_id': None, 'contact': '+918464968477', 'created_at': 1752579680, 'currency': 'INR', 'description': '#QtKWD2TPpgTUTW', 'email': 'ishwaryapadavala@gmail.com', 'entity': 'payment', 'error_code': 'BAD_REQUEST_ERROR', 'error_description': 'Payment was unsuccessful as you could not complete it in time.', 'error_reason': 'payment_timed_out', 'error_source': 'customer', 'error_step': 'payment_authentication', 'fee': 0, 'id': 'pay_QtKXHk4aCUX1kP', 'international': False, 'invoice_id': None, 'late_authorized': False, 'method': 'upi', 'notes': [], 'order_id': 'order_QtKWeGb7joBe1s', 'provider': None, 'refund_status': None, 'reward': None, 'status': 'failed', 'tax': 0, 'upi': {'flow': 'intent', 'vpa': None}, 'vpa': None, 'wallet': None}}}}'''
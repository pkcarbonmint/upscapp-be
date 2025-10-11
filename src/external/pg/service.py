import hmac
import requests
import hashlib
import base64
import datetime
import calendar
from fastapi_async_sqlalchemy import db
from src.users.models import User, Transaction, Subscription
from src.users.deps import check_recur_left
from src.users.schemas import (
    PgTxData,
    PgSubsData,
    SubscriptionUpdate,
    SubscriptionStatus,
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
from datetime import datetime, timedelta, timezone
from src.external.emailer import email
from src.tasks import celery_tasks

subscription_service = SubscriptionService(Subscription, db)
transaction_service = TransactionService(Transaction, db)


class PaymentGateway:
    def __init__(self) -> None:
        pass

    async def create_subscription(
        self, create_subs: PgSubsCreateSchema
    ) -> PgSubsData | None:
        url = f"{settings.PG_BASE_URL}/v3/recurring/subscription/create"

        encoded_payload = base64.b64encode(
            create_subs.model_dump_json(
                exclude_unset=True, exclude_none=True, by_alias=True
            ).encode("utf-8")
        )
        encoded_payload_str = str(encoded_payload, encoding="utf-8")

        input_sha256 = (
            encoded_payload_str
            + "/v3/recurring/subscription/create"
            + settings.SALT_KEY
        )
        
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()

        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }
        payload = {"request": encoded_payload_str}

        response = requests.post(url=url, headers=headers, json=payload)

        # pg_subs_data = str((response.__dict__)["_content"], encoding="utf-8")
        # pg_dict = json.loads(pg_subs_data)

        if response.status_code != 200:
            print(f"request for pg create >> url: {url}, headers: {headers}, payload: {payload}")
            print("exception response pg create >> ", response.json())
            raise PgSubsCreateFailed()

        return response.json()["data"]

    async def check_subscription_status(self, subs_id: str):
        url = f"{settings.PG_BASE_URL}/v3/recurring/subscription/status/{settings.MERCHANT_ID}/{subs_id}"

        input_sha256 = (
            f"/v3/recurring/subscription/status/{settings.MERCHANT_ID}/{subs_id}"
            + settings.SALT_KEY
        )

        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }
        print("headers>>>>>", headers, "url", url)

        response = requests.get(url, headers=headers)
        print("response>>>>.", response.__dict__)

        return response

        # if response.status_code != 200:
        #     raise PgRequestFailed()

        # return response.json()["data"]

    async def verify_vpa(self, vpa: str) -> dict[str, Any]:
        url = f"{settings.PG_BASE_URL}/v3/vpa/{settings.MERCHANT_ID}/{vpa}/validate"

        input_sha256 = (
            f"/v3/vpa/{settings.MERCHANT_ID}/{vpa}/validate" + settings.SALT_KEY
        )

        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise VPANotVerified()

        return response.json()["data"]

    async def submit_auth_request(
        self, auth_req_in: PgAuthRequestSchema
    ) -> PgAuthResponseSchema:
        url = f"{settings.PG_BASE_URL}/v3/recurring/auth/init"

        encoded_payload = base64.b64encode(
            str(auth_req_in.model_dump_json(exclude_unset=True, by_alias=True)).encode(
                "utf-8"
            )
        )
        encoded_payload_str = str(encoded_payload, encoding="utf-8")
        input_sha256 = (
            encoded_payload_str + "/v3/recurring/auth/init" + settings.SALT_KEY
        )
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
            "x-callback-url": f"{settings.API_BASE_URL}/pg/phonepe/callback",
        }

        payload = {"request": encoded_payload_str}

        response = requests.post(url=url, headers=headers, json=payload)

        if response.status_code != 200:
            print("auth request failed", response.json())
            raise AuthMandateRequestFailed()

        return response.json()

    async def auth_request_status(self, auth_req_id: str) -> PgAuthStatusResponse:
        # To check the status of the auth init request
        url = f"{settings.PG_BASE_URL}/v3/recurring/auth/status/{settings.MERCHANT_ID}/{auth_req_id}"

        input_sha256 = (
            f"/v3/recurring/auth/status/{settings.MERCHANT_ID}/{auth_req_id}"
            + settings.SALT_KEY
        )
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }

        response = requests.get(url=url, headers=headers)
        # auth_init_state = response.data["subscriptionDetails"]["state"]
        # providerReferenceId = response.data["transactionDetails"]["providerReferenceId"]

        if response.status_code != 200:
            raise AuthStatusCheckFailed()

        return response.json()["data"]

    async def recurring_init(
        self, recurr_in: PgRecurringInitSchema
    ):  # If autoDebit flag is True no need of recurr debit.. we will get direct s2s response on recurr debit and values can be save to db
        print("RECURRING INIT")
        url = f"{settings.PG_BASE_URL}/v3/recurring/debit/init"

        encoded_payload = base64.b64encode(
            recurr_in.model_dump_json(
                exclude_unset=True, exclude_none=True, by_alias=True
            ).encode("utf-8")
        )
        encoded_payload_str = str(encoded_payload, encoding="utf-8")
        input_sha256 = (
            encoded_payload_str + "/v3/recurring/debit/init" + settings.SALT_KEY
        )
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }
        payload = {"request": encoded_payload_str}
        response = requests.post(url=url, headers=headers, json=payload)
        if response.status_code != 200:
            raise NotificationFailed()
        # notification_id = response.data["notification_id"]
        return response.json()["data"]

    async def recurring_debit_execute(self, recurr_debit_in: PgRecurringDebitExecute):
        url = f"{settings.PG_BASE_URL}/v3/recurring/debit/execute"

        encoded_bytes = base64.b64encode(
            recurr_debit_in.model_dump_json(
                exclude_unset=True, exclude_none=True, by_alias=True
            ).encode("utf-8")
        )
        input_sha256 = encoded_bytes + "/v3/recurring/debit/execute" + settings.SALT_KEY
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256}###{settings.SALT_INDEX}",
        }
        payload = {"request": "encoded_payload_str"}
        response = requests.post(url=url, headers=headers, json=payload)

        return response.json()["data"]

    async def recurring_debit_execute_status(self, tx_id: str):
        url = f"{settings.PG_BASE_URL}/v3/recurring/auth/status/{settings.MERCHANT_ID}/{tx_id}"

        input_sha256 = (
            f"/v3/recurring/auth/status/{settings.MERCHANT_ID}/{tx_id}"
            + settings.SALT_KEY
        )
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256}###{settings.SALT_INDEX}",
        }
        response = requests.get(url=url, headers=headers)
        return response.json()["data"]

    async def cancel_subscription(
        self, user_id: int, pg_subs_id: str
    ) -> dict[str, Any]:
        url = f"{settings.PG_BASE_URL}/v3/recurring/subscription/cancel"
        data = {
            "merchantId": settings.MERCHANT_ID,
            "merchantUserId": str(user_id),
            "subscriptionId": pg_subs_id,
        }
        encoded_payload = base64.b64encode(json.dumps(data).encode("utf-8"))
        encoded_payload_str = str(encoded_payload, encoding="utf-8")
        input_sha256 = (
            str(encoded_payload_str)
            + "/v3/recurring/subscription/cancel"
            + settings.SALT_KEY
        )
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
            "x-callback-url": f"{settings.API_BASE_URL}/pg/phonepe/callback",
        }
        payload = {"request": encoded_payload_str}

        response = requests.post(url=url, headers=headers, json=payload)

        if response.status_code != 200:
            raise CancelSubscriptionFailed()

        return response.json()["data"]

    async def pay_api(self, pay_api_in: PgPayApiSchema):
        url = f"{settings.PG_PAY_BASE_URL}/pg/v1/pay"

        encoded_payload = base64.b64encode(
            pay_api_in.model_dump_json(
                exclude_unset=True, exclude_none=True, by_alias=True
            ).encode("utf-8")
        )
        encoded_payload_str = str(encoded_payload, encoding="utf-8")

        input_sha256 = encoded_payload_str + "/pg/v1/pay" + settings.SALT_KEY
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()

        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }
        payload = {"request": encoded_payload_str}
        print("url>>", url,"headers>>",headers,"payload>>",payload)
        response = requests.post(url=url, headers=headers, json=payload)
        if response.status_code != 200:
            # print("pay_api_error>>", response.json())
            raise AuthMandateRequestFailed()

        return response.json()["data"]

    async def check_payapi_status(self, merchant_tx_id: str):
        url = f"{settings.PG_PAY_BASE_URL}/pg/v1/status/{settings.MERCHANT_ID}/{merchant_tx_id}"

        input_sha256 = (
            f"/pg/v1/status/{settings.MERCHANT_ID}/{merchant_tx_id}" + settings.SALT_KEY
        )

        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()
        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
            "X-MERCHANT-ID": settings.MERCHANT_ID,
        }
        print("headers>>>>>", headers, "url", url)

        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            # print("pay_api_error_check>>", response.json())
            raise PgRequestFailed()

        return response.json()["data"]


    async def pg_pay_api(self, pay_api_in: PgPAYAPISchema):
        url = f"{settings.PG_PAY_BASE_URL}/pg/v1/pay"
        encoded_payload = base64.b64encode(
            pay_api_in.model_dump_json(
                exclude_unset=True, exclude_none=True, by_alias=True
            ).encode("utf-8")
        )
        encoded_payload_str = str(encoded_payload, encoding="utf-8")

        input_sha256 = encoded_payload_str + "/pg/v1/pay" + settings.SALT_KEY
        encoded_sha256 = hashlib.sha256(input_sha256.encode("utf-8")).hexdigest()

        encoded_sha256_str = str(encoded_sha256)

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-verify": f"{encoded_sha256_str}###{settings.SALT_INDEX}",
        }
        payload = {"request": encoded_payload_str}

        response = requests.post(url=url, headers=headers, json=payload)
        if response.status_code != 200:
            print("resp>>>>>>pay>>>", response.json())
            raise AuthMandateRequestFailed()
        return response.json()["data"]
    
    """
    decoded_bytes and decoded_bytes.decode("utf-8")
    The s2s callback for Submit Auth Request will have the "callbackType": "AUTH".
    The s2s callback for Recurring INIT will have the "callbackType": "NOTIFY".
    The s2s callback for Recurring Debit Execute will have the "callbackType": "DEBIT".
    The s2s callback for Cancel Subscription will have the "callbackType": "SUBSCRIPTION".

    """

    async def handle_callback(self, response_json):
        print("response_json",response_json)
        response_data = response_json["data"]

        print("response_data", response_data)

        # await pg.handle_callback(decoded_response=decoded_response)
        response = PgS2SCallbackResponse(**response_data)  # data
        print("response", response)

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
                    payment_status=response.transaction_details.state,
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

            return True

class RazorPayPaymentGateway:
    def __init__(self) -> None:
        pass

    async def paymentlink_api(self, link_in: PaymentLinkRequest, key_id:str ,key_secret: str):
        url = "https://api.razorpay.com/v1/payment_links/"
        
        auth=(key_id, key_secret)
        payload = PaymentLinkRequest(**link_in.model_dump())
        response = requests.post(url=url, auth=auth, json=payload.model_dump())
        print("resp>>>>>", response,response.json(),response.status_code)
        return response
    
    async def paymentlink_payment_status(self,payment_id:str,key_id:str ,key_secret: str): # starts with pay
        url = f"https://api.razorpay.com/v1/payments/{payment_id}"
        auth=(key_id, key_secret)     
        response = requests.get(url=url, auth=auth)
        return response
    
    async def payment_link_status(self,paymentlink_id:str,key_id:str ,key_secret: str): # id is what we got from paymentlink_api which starts with plink
        url = f"https://api.razorpay.com/v1/payment_links/{paymentlink_id}"
        auth=(key_id, key_secret)
        response = requests.get(url=url, auth=auth)
        return response
    
    async def order_status(self,order_id:str,key_id:str ,key_secret: str): # id is what we got from paymentlink_api which starts with plink
        url = f"https://api.razorpay.com//v1/orders/{order_id}/payments"
        auth=(key_id, key_secret)
        response = requests.get(url=url, auth=auth)
        return response
    
    async def verify_signature(self,body: str, signature: str, secret: str) -> bool:
        generated_signature = hmac.new(
            secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(generated_signature, signature)


pg = PaymentGateway()

razorpg = RazorPayPaymentGateway()

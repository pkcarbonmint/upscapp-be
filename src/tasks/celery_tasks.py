from celery import Celery
from celery.result import AsyncResult
from src.external.pg import service
from src.external.pg.schemas import PgRecurringInitSchema
import asyncio, json
from src.config import settings

celery_app = Celery(
    "upscpro_tasks", broker=str(settings.REDIS_URL), backend=str(settings.REDIS_URL)
)


@celery_app.task
def run_celery(a):
    print(a)
    print("okay")
    return 5


@celery_app.task
def subs_recurring_init_task(recurr_in: str):
    recurr_json = json.loads(recurr_in)
    recurr_init = PgRecurringInitSchema(**recurr_json)
    loop = asyncio.get_event_loop()

    recurr_subs = loop.run_until_complete(
        service.pg.recurring_init(recurr_in=recurr_init)
    )

    return recurr_subs


def delete_task(task_id: str):
    recurr_task = get_task(task_id=task_id)
    recurr_task.revoke(terminate=True)


def get_task(task_id: str):
    task = AsyncResult(id=task_id)
    return task


def get_all_scheduled_tasks():
    # run_celery.delay()
    i = celery_app.control.inspect()
    registered_tasks = i.registered()  # Show registred tasks for specified workers
    active_tasks = i.active()  # Get a list of active tasks
    scheduled_tasks = i.scheduled()  # Get a list of tasks waiting to be scheduled
    reserved_tasks = (
        i.reserved()
    )  # Get a list of tasks that has been received, but are still waiting to be executed

    return {
        "active_tasks": active_tasks,
        "registered_tasks": registered_tasks,
        "scheduled_tasks": scheduled_tasks,
        "reserved_tasks": reserved_tasks,
        "registered_tasks": registered_tasks,
    }


###periodic task###


# async def set_subs_periodic_task(subs_id: int, expiry_date: datetime, subs_freq: int):
#     @celery_app.on_after_configure.connect
#     async def setup_subs_recurr_task(sender, **kwargs):
#         # current_month = expiry_date.month
#         # current_year = expiry_date.year

#         # next_month = (current_month + subs_freq) % 12
#         # next_year = current_year + ((current_month + subs_freq - 1) // 12)

#         # if next_month == 0:
#         #     next_month = 12

#         # next_expiry = expiry_date.replace(
#         #     year=next_year, month=next_month, day= expiry_date.date - timedelta(days=1)
#         # )
#         sender.add_periodic_task(
#             crontab(
#                 month_of_year="expiry_date.month",
#                 day_of_month="expiry_date.day",
#                 hour="expiry_date.hour",
#                 minute=0,
#             ),
#             subs_recurr_task.s(subs_id=subs_id),
#         )


# @celery_app.task(name="subs_tasks.subs_recurr_task")
# async def subs_recurr_task(subs_id: int):
#     subs: Subscription = await subscription_service.get(id=subs_id)

#     recurr_subs = await pg.recurring_init(
#         recurr_in=PgRecurringInitSchema(
#             merchantId=settings.MERCHANT_ID,
#             merchantUserId=str(subs.user_id),
#             subscriptionId=subs.pg_ref_id,
#             transaction_id=subs.auth_req_id,
#             auto_debit=True,
#             amount=subs.subscription_amount,
#         )
#     )
#     tx_db = await transaction_service.get_by_field(
#         field="tx_id", value=subs.auth_req_id
#     )
#     pg_data = tx_db.pg_data
#     pg_data["notification_details"] = recurr_subs.data.notification_details
#     tx_update = TransactionUpdate(pg_data=pg_data)
#     tx_update_db = await transaction_service.update(
#         obj_current=tx_db, obj_new=tx_update
#     )

from fastapi import APIRouter
from .schemas import *
from .service import *
from fastapi_async_sqlalchemy import db


log_router = APIRouter(prefix="/logs",tags=["LOGS"])
eventlog_crud = EventlogService(model=EventLog,db=db)

@log_router.post("/filters")
async def get_logs_by_filters(*,log_filters:log_filters):
    events = await eventlog_crud.get_event_logs(from_date=log_filters.from_date,till_date=log_filters.till_date,event_by_user_id=log_filters.event_by_user_id,
                                          user_name=log_filters.user_name,user_phone=log_filters.user_phone,source_ip=log_filters.source_ip,
                                          event_type=log_filters.event_type, limit=log_filters.limit,offset=log_filters.offset,
                                          db_session=db.session)
    return events

@log_router.post("/events")
async def log_event(*,log_schema:EventLogCreate):

    events = await eventlog_crud.create(obj_in=log_schema,db_session=db.session)

    return events

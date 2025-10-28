from datetime import date
from src.base.service import BaseService
from .models import EventLog
from .schemas import *
from sqlalchemy import Integer, select,cast,func,Date,Time
from sqlalchemy.ext.asyncio import AsyncSession


class EventlogService(BaseService[EventLog, EventLogSchema, EventLogSchema]):

    async def get_logs_by_filters(self,tx_id:int,event_type:EVENT_TYPE| None = None,db_session:AsyncSession | None = None):
            session = db_session
            transaction_query = (
                select(EventLog)
                .where(
                    cast(EventLog.event_details.op("->>")("tx_id"), Integer) == tx_id,
                      EventLog.event_type == event_type if event_type else True)
            )
        
            result = await session.execute(transaction_query)
            txs = result.scalars().all()
            return txs
    
    async def get_event_logs(self,from_date: date | None = None,
                            till_date: date | None = None,
                            event_by_user_id: int | None = None,
                            user_name: str| None = None,
                            user_phone: str | None = None,
                            source_ip: str | None = None,
                            event_type: str| None = None,
                            limit: int = 10, offset: int = 0,db_session:AsyncSession | None = None):
        session = db_session
        timestamp_ist = self.model.timestamp.op("AT TIME ZONE")("Asia/Kolkata")


        query = (select(self.model,
                        cast(timestamp_ist, Date).label("ist_date"),
                        cast(timestamp_ist, Time).label("ist_time"),)
                        .where( cast(timestamp_ist, Date) >= from_date if from_date else True,
                                cast(timestamp_ist, Date) <= till_date if till_date else True,
                                self.model.event_by_user_id == event_by_user_id if event_by_user_id else True,
                                self.model.user_name.ilike(f"%{user_name}%") if user_name else True,
                                self.model.user_phone == user_phone if user_phone else True,
                                self.model.source_ip == source_ip if source_ip else True,
                                self.model.event_type == event_type if event_type else True,
                                )
                        .order_by(self.model.created_at.desc()).limit(limit).offset(offset))
        result = await session.execute(query)
        events = result.mappings().all()
        return events
          
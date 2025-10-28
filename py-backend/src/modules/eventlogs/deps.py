from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .models import *
from fastapi.requests import Request
from .schemas import *
from sqlalchemy import exc

async def get_request(request: Request):
    return request

async def log_event(
    db: AsyncSession,
    request: Request,
    event_type: EVENT_TYPE,
    event_details: dict,
    event_by_user_id: int | None = None,
    user_name: str | None = None,
    user_phone: str | None = None
):
    source_ip = request.client.host if request.client else None
    session = db
    log = EventLog(
        event_by_user_id=event_by_user_id,
        user_name=user_name,
        user_phone=user_phone,
        source_ip=source_ip,
        event_type=event_type,
        event_details=event_details
    )
    try:
        session.add(log)
        await session.commit()
    except exc.IntegrityError as err:
            print("errr>>>>>>", err)
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource already exists",
            )
    await session.refresh(log)
    return log
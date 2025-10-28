

from datetime import datetime
from fastapi import APIRouter
import httpx
from src.external.zoom.deps import get_zoom_access_token

from src.external.zoom.schemas import ZoomMeetingCreate


zoom_router = APIRouter(prefix="/zoom", tags=["ZOOM V2"])

@zoom_router.post(path="/meetings")
async def create_mentorship_meetinglink(zoom_meeting_in: ZoomMeetingCreate):
    token = await get_zoom_access_token()
    async with httpx.AsyncClient() as client:
        meeting_data = zoom_meeting_in.model_dump()
        if isinstance(meeting_data.get("start_time"), datetime):
            meeting_data["start_time"] = meeting_data["start_time"].isoformat()
        resp = await client.post(
            "https://api.zoom.us/v2/users/me/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        resp.raise_for_status()
        # get_meets = await client.get(f"https://api.zoom.us/v2/meetings/85780327961",
        #     headers={
        #     "Authorization": f"Bearer{token}"
        #     },
        #     params={
        #     }
        # )
        return resp.json()

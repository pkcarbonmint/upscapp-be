from fastapi import HTTPException
import httpx
from src.config import settings


async def get_zoom_access_token():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url= f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={settings.ZOOM_ACCOUNT_ID}",
                auth=(settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_SECRET))
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.json())

        return resp.json()["access_token"]
        
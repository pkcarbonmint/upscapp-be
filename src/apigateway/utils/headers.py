import re
from fastapi import Request
import requests
from src.config import settings
from starlette.datastructures import MutableHeaders, Headers
from typing import Dict, Any


def inheritance_service_headers(
    gateway_headers: MutableHeaders,
    service_headers: MutableHeaders,
) -> Dict[str, Any]:
    forced_gateway_headers = [
        "server",
        "date",
        "content-encoding",
        "content-type",
        "content-length",
    ]
    return {
        key: service_headers[key]
        for key in service_headers
        if key not in gateway_headers and key.lower() not in forced_gateway_headers
    }


def generate_headers_for_microservice(request: Request , headers: Headers) -> MutableHeaders:
    path_parts = request.url.path.split('/')
    index_of_v2 = path_parts.index("v2")
    service = path_parts[index_of_v2 + 1]
    if service == "zoho":
        url =  "https://accounts.zoho.in/oauth/v2/token"
        params = {
            "refresh_token": settings.ZOHO_REFRESH_TOKEN,
            "client_id": settings.ZOHO_CLIENT_ID,
            "client_secret": settings.ZOHO_CLIENT_SECRET,
            "grant_type": "refresh_token"
            }

        response = requests.post(url=url, params=params)
        resp_json = response.json()
        token = resp_json["access_token"]
        new_headers = {}
        new_headers['Authorization'] = f"Zoho-oauthtoken {token}"
        return new_headers
    elif service == "cms":
        new_headers = {}
        new_headers['Authorization'] = f"Bearer {settings.CMS_API_KEY}"
        return new_headers

    new_headers = headers.mutablecopy()
    gateway_host = headers.get("host")
    new_headers.append("gateway_host", gateway_host)   
    forced_gateway_headers = [
        "host",
        "content-type",
        "accept-encoding",
        "content-length",
    ]
    [new_headers.__delitem__(key_header) for key_header in forced_gateway_headers]

    return new_headers
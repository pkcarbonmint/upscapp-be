import logging
import random
import string
import time
import http
from datetime import datetime
from typing import Callable, Awaitable
from fastapi import Request

logger = logging.getLogger(__name__)
ALPHA_NUM = string.ascii_letters + string.digits


class LoggingMiddleware:
    """
    Lightweight ASGI logging middleware that is resilient to errors in downstream
    handlers. It observes the response status via the ASGI send channel, so a
    response is always logged even when exception handlers generate it.
    """

    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):  # type: ignore[no-untyped-def]
        if scope.get("type") != "http":
            # Pass through non-HTTP scopes (e.g. lifespan, websocket)
            await self.app(scope, receive, send)
            return

        method = scope.get("method")
        path = scope.get("path")
        query_string = scope.get("query_string", b"")
        try:
            query = query_string.decode("latin-1") if query_string else ""
        except Exception:
            query = ""
        url = f"{path}?{query}" if query else path

        client_host, client_port = None, None
        client = scope.get("client")
        if isinstance(client, (list, tuple)) and len(client) == 2:
            client_host, client_port = client

        start_time = time.time()
        status_code_holder: dict[str, int | None] = {"status": None}

        async def send_wrapper(message):  # type: ignore[no-untyped-def]
            if message.get("type") == "http.response.start":
                # Record status from the first start event
                status_code_holder["status"] = int(message.get("status", 0))
            await send(message)

        # Delegate to downstream app while capturing status via send_wrapper
        await self.app(scope, receive, send_wrapper)

        process_time_ms = (time.time() - start_time) * 1000
        formatted_ms = f"{process_time_ms:.2f}"
        status_code = status_code_holder["status"] or 0
        try:
            status_phrase = http.HTTPStatus(status_code).phrase if status_code else ""
        except ValueError:
            status_phrase = ""

        logger.info(
            f"{client_host}:{client_port} - \"{method} {url}\" {status_code} {status_phrase} {formatted_ms}ms"
        )


def generate_random_alphanum(length: int = 20) -> str:
    return "".join(random.choices(ALPHA_NUM, k=length)) + str(
        int(datetime.now().timestamp())
    )

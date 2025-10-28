from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi_async_sqlalchemy import db, SQLAlchemyMiddleware
from sqlalchemy.pool import NullPool, QueuePool
from .config import app_configs, settings, Environment
from src.auth.routes import router as auth_router
from src.auth.routesv2 import auth_router_v2
from src.users.routes import router as user_router
from src.users.routes import account_router, admin_router, auth_test_router
from src.tenants.routes import router as tenant_router,org_router
from src.external.aws import router as aws_router
from src.modules.tests.routes import test_router
from src.external.cms.routes import cms_router,cms_router_v2
from src.external.pg.routes import pg_router
from src.external.zoho.routes import zoho_router_v2,nopaperforms_v2
from src.external.zoom.routes import zoom_router
from src.external.whatsapp.routes import whatsapp_router_v2
from src.modules.questions.routes import question_router
from src.modules.questions.routesv2 import question_router_v2
from src.reports.routes import report_router
from src.reports.routesv2 import report_router_v2
from src.modules.notifications.routes import (
    notification_router,notification_router_v2
)
from src.modules.products.routes import product_router,purchase_router
from src.modules.accountsv2.routes import account_router_v2
from src.modules.teaching.routes import studyplan_router,studentprod_router
from src.database.seed_db import create_init_data
import sentry_sdk

from src.external.cms.routes import cms_router
from src.users.routesv2 import user_router as user_router_v2
from src.modules.frontdesk.routes import frontdesk_router
from src.modules.contentmgnt.routes import cntn_mgnt_router_v2
from src.modules.tests.routesv2 import test_router_v2
from src.modules.fee.routes import fee_router
from src.modules.eventlogs.routes import log_router

from fastapi.exceptions import (
    RequestValidationError,
    ResponseValidationError,
    HTTPException,
)
from .exceptions import (
    http_exception_handler,
    request_validation_exception_handler,
    response_validation_exception_handler,
    unhandled_exception_handler,
)
from .utils import log_request_middleware


@asynccontextmanager
async def lifespan(_application: FastAPI) -> AsyncGenerator:
    # Startup
    await create_init_data()

    # db.init()
    # pool = aioredis.ConnectionPool.from_url(
    #     str(settings.REDIS_URL), max_connections=10, decode_responses=True
    # )
    # redis.redis_client = aioredis.Redis(connection_pool=pool)
    # await database.connect()

    yield

    # # Shutdown
    # await db.close()
    # await database.disconnect()
    # await redis.redis_client.close()


app = FastAPI(**app_configs, lifespan=lifespan)
# app = FastAPI(**app_configs)

app.add_middleware(
    SQLAlchemyMiddleware,
    db_url=str(settings.DATABASE_URL),
    engine_args={
        "echo": True if Environment.is_debug else False,
        "pool_pre_ping": True,
        # "pool_size": settings.POOL_SIZE,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_POOL_MAX_OVERFLOW,
        "echo_pool": True,
        # "poolclass": NullPool
        # if settings.ENVIRONMENT == Environment.TESTING
        # else QueuePool,  # Asincio pytest works with NullPool
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # allow_origin_regex=settings.CORS_ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
    allow_headers=settings.CORS_HEADERS,
)

app.middleware("http")(log_request_middleware)
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(
    ResponseValidationError, response_validation_exception_handler
)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

if settings.ENVIRONMENT.is_deployed:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
    )


@app.get("/healthcheck", include_in_schema=False)
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def check():
    return "running good!"


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(tenant_router)
app.include_router(org_router)
app.include_router(aws_router)
app.include_router(account_router)
app.include_router(cms_router)
app.include_router(admin_router)
app.include_router(test_router)
app.include_router(question_router)
app.include_router(pg_router)
app.include_router(notification_router)
app.include_router(report_router)
app.include_router(question_router_v2)
app.include_router(product_router, prefix="/v2")
app.include_router(user_router_v2)
app.include_router(notification_router_v2, prefix="/v2")
app.include_router(cms_router_v2, prefix="/v2")
app.include_router(account_router_v2, prefix="/v2")
app.include_router(frontdesk_router, prefix="/v2")
app.include_router(purchase_router, prefix="/v2")
app.include_router(zoho_router_v2,prefix="/v2")
app.include_router(nopaperforms_v2,prefix="/v2")
app.include_router(cntn_mgnt_router_v2,prefix="/v2")
app.include_router(auth_router_v2)
app.include_router(studyplan_router)
app.include_router(test_router_v2)
app.include_router(fee_router)
app.include_router(studentprod_router)
app.include_router(log_router)
app.include_router(report_router_v2)
app.include_router(zoom_router)
app.include_router(whatsapp_router_v2)
if settings.ENVIRONMENT.is_debug:
    app.include_router(auth_test_router)

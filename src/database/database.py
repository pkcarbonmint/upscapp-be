from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData
from src.config import settings

DB_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

# Create Engine and Session (force asyncpg driver if plain postgresql URL provided)
_db_url = str(settings.DATABASE_URL)
if _db_url.startswith("postgresql://") and "+asyncpg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
engine = create_async_engine(_db_url, future=True, echo=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# Declarative Base
class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=DB_NAMING_CONVENTION)


# Async DB session
# class AsyncDatabaseSession:
#     def __init__(self) -> None:
#         self._session = None
#         self._engine = None

#     def __getattr__(self, name) -> Any:
#         return getattr(self._session, name)

#     def init(self):
#         self._engine = create_async_engine(
#             str(settings.DATABASE_URL), future=True, echo=True
#         )
#         self._session = sessionmaker(
#             self._engine, expire_on_commit=False, class_=AsyncSession
#         )()

#     async def create_all(self):
#         async with self._engine.begin() as conn:
#             await conn.run_sync(Base.metadata.create_all)


# class AsyncDbSession:
#     def init(self):
#         self.engine = create_async_engine(
#             str(settings.DATABASE_URL), future=True, echo=True
#         )
#         self.SessionLocal = sessionmaker(engine, autoflush=False, class_=AsyncSession)
#         self.session = self.SessionLocal()
#         try:
#             yield self.session
#             self.session.commit()
#         except Exception as exc:
#             self.session.rollback()
#             raise exc
#         finally:
#             self.session.close()

#     async def create_all(self):
#         async with self.engine.begin() as conn:
#             await conn.run_sync(Base.metadata.create_all)


# db = AsyncDatabaseSession()


# async def get_db():
#     session = SessionLocal()
#     try:
#         yield session
#     finally:
#         await session.close()

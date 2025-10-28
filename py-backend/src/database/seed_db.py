import asyncio
from src.users.utils import create_super_admin_user
from .database import SessionLocal


async def create_init_data() -> None:
    async with SessionLocal() as session:
        await create_super_admin_user(db_session=session)


async def main() -> None:
    await create_init_data()


if __name__ == "__main__":
    asyncio.run(main())

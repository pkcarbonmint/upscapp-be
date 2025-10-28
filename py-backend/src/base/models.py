from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import DateTime, func

# from sqlalchemy import update as sa_update, delete as sa_delete, select


class BaseMixinNoKey:
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )


class BaseMixin(BaseMixinNoKey):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # @classmethod
    # async def create(cls, db: Session, **kwargs):
    #     item = cls(**kwargs)
    #     db.add(item)

    #     try:
    #         await db.commit()
    #     except Exception:
    #         await db.rollback()
    #         raise
    #     return item

    # @classmethod
    # async def update(cls, db: Session, id, **kwargs):
    #     query = (
    #         sa_update(cls)
    #         .where(cls.id == id)
    #         .values(**kwargs)
    #         .execution_options(synchronize_session="fetch")
    #     )

    #     await db.execute(query)
    #     try:
    #         await db.commit()
    #     except Exception:
    #         await db.rollback()
    #         raise
    #     return await cls.get(id)

    # @classmethod
    # async def get(cls, db: Session, id):
    #     query = select(cls).where(cls.id == id)
    #     users = await db.execute(query)
    #     item = users.first()
    #     return item

    # @classmethod
    # async def get_all(cls, db: Session):
    #     query = select(cls)
    #     users = await db.execute(query)
    #     users = users.scalars().all()
    #     return users

    # @classmethod
    # async def delete(cls, db: Session, id):
    #     query = sa_delete(cls).where(cls.id == id)
    #     await db.execute(query)
    #     try:
    #         await db.commit()
    #     except Exception:
    #         await db.rollback()
    #         raise
    #     return True

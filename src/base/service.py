from typing import TypeVar, Generic, Any
from typing import Any, Dict, Generic, Union, Optional, Callable,List
from datetime import datetime, timezone
import fastcrud
from pydantic import BaseModel
from src.database.database import Base
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_async_sqlalchemy.middleware import db
from sqlalchemy import ClauseElement, select, func, Select, exc, update, inspect, column, and_,or_
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from uuid import UUID
from .schemas import IOrderEnum
from .exceptions import MultipleResultsFound


ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
SchemaType = TypeVar("SchemaType", bound=BaseModel)

T = TypeVar("T", bound=Base)

class BaseCRUD(fastcrud.FastCRUD):

    async def create(
        self,
        *,
        object: CreateSchemaType | ModelType,
        db: AsyncSession,
        commit: bool = True
    ) -> ModelType:
        session = db 
        if isinstance(object, self.model):
            db_obj: ModelType = object
        else:
            db_obj: ModelType = self.model(**object.model_dump())  # type: ignore

        try:
            session.add(db_obj)
            await session.commit()
        except exc.IntegrityError as err:
            print("eroor>>>>>>", err)
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource already exists",
            )
        await session.refresh(db_obj)
        return db_obj
    
    # async def bulk_create(
    #         self,
    #         *,
    #         objects: List[CreateSchemaType | ModelType],
    #         db: AsyncSession,
    #         commit: bool = True
    #     ) -> List[ModelType]:
    #         session = db  
    #         db_objs = []

    #         for obj in objects:
    #             if isinstance(obj, self.model):
    #                 db_obj: ModelType = obj
    #             else:
    #                 db_obj: ModelType = self.model(**obj.model_dump())  # Convert schema to model instance
                
    #             db_objs.append(db_obj)

    #         try:
    #             session.add_all(db_objs)  # Bulk insert all objects
    #             await session.commit()
    #         except exc.IntegrityError as err:
    #             await session.rollback()
    #             raise HTTPException(status_code=409, detail=f"Database Integrity Error: {str(err)}")

    #         # Refresh all objects
    #         for db_obj in db_objs:
    #             await session.refresh(db_obj)

    #         return db_objs  # Return the inserted objects
    
    async def bulk_create(
            self,
            *,
            objects: List[CreateSchemaType | ModelType],
            db: AsyncSession
        ) -> List[ModelType]:
            """Efficient bulk insert using bulk_insert_mappings for performance."""
            try:
                # Convert objects to dictionary format for bulk insert
                data_list = [obj.model_dump() if isinstance(obj, self.model) else obj if isinstance(obj, dict) else vars(obj) for obj in objects]

                # Use bulk_insert_mappings to insert all records at once
                await db.run_sync(lambda session: session.bulk_insert_mappings(self.model, data_list))
                
                await db.commit()

                return data_list  # Return inserted data (without full ORM objects) so ids of the data will not be seen
            except exc.IntegrityError as err:
                await db.rollback()
                raise HTTPException(status_code=409, detail=f"Database Integrity Error: {str(err)}")
    # async def update(
    #     self,
    #     db: AsyncSession,
    #     object: Union[UpdateSchemaType, dict[str, Any]],
    #     allow_multiple: bool = False,
    #     commit: bool = True,
    #     return_columns: Optional[list[str]] = None,
    #     schema_to_select: Optional[type[BaseModel]] = None,
    #     return_as_model: bool = False,
    #     one_or_none: bool = False,
    #     **kwargs: Any,
    # ) -> Optional[Union[dict, BaseModel]]:
    #     """
    #     Updates an existing record or multiple records in the database based on specified filters. This method allows for precise targeting of records to update.

    #     For filtering details see [the Advanced Filters documentation](../advanced/crud.md/#advanced-filters)

    #     Args:
    #         db: The database session to use for the operation.
    #         object: A Pydantic schema or dictionary containing the update data.
    #         allow_multiple: If `True`, allows updating multiple records that match the filters. If `False`, raises an error if more than one record matches the filters.
    #         commit: If `True`, commits the transaction immediately. Default is `True`.
    #         return_columns: A list of column names to return after the update. If `return_as_model` is True, all columns are returned.
    #         schema_to_select: Pydantic schema for selecting specific columns from the updated record(s). Required if `return_as_model` is `True`.
    #         return_as_model: If `True`, returns the updated record(s) as Pydantic model instances based on `schema_to_select`. Default is False.
    #         one_or_none: If `True`, returns a single record if only one record matches the filters. Default is `False`.
    #         **kwargs: Filters to identify the record(s) to update, supporting advanced comparison operators for refined querying.

    #     Returns:
    #         The updated record(s) as a dictionary or Pydantic model instance or `None`, depending on the value of `return_as_model` and `return_columns`.

    #     Raises:
    #         MultipleResultsFound: If `allow_multiple` is `False` and more than one record matches the filters.
    #         ValueError: If extra fields not present in the model are provided in the update data.
    #         ValueError: If `return_as_model` is `True` but `schema_to_select` is not provided.

    #     Examples:
    #         Update a user's email based on their ID:
    #         ```python
    #         await user_crud.update(db, {'email': 'new_email@example.com'}, id=1)
    #         ```

    #         Update users' statuses to `"inactive"` where age is greater than 30 and allow updates to multiple records:
    #         ```python
    #         await user_crud.update(
    #             db,
    #             {'status': 'inactive'},
    #             allow_multiple=True,
    #             age__gt=30,
    #         )
    #         ```

    #         Update a user's username excluding specific user ID and prevent multiple updates:
    #         ```python
    #         await user_crud.update(
    #             db,
    #             {'username': 'new_username'},
    #             allow_multiple=False,
    #             id__ne=1,
    #         )
    #         ```

    #         Update a user's email and return the updated record as a Pydantic model instance:
    #         ```python
    #         await user_crud.update(
    #             db,
    #             {'email': 'new_email@example.com'},
    #             schema_to_select=UserSchema,
    #             return_as_model=True,
    #             id=1,
    #         )
    #         ```

    #         Update a user's email and return the updated record as a dictionary:
    #         ```python
    #         await user_crud.update(
    #             db,
    #             {'email': 'new_email@example.com'},
    #             return_columns=['id', 'email'],
    #             id=1,
    #         )
    #         ```
    #     """
    #     if not allow_multiple and (total_count := await self.count(db, **kwargs)) > 1:
    #         raise MultipleResultsFound(
    #             f"Expected exactly one record to update, found {total_count}."
    #         )

    #     if isinstance(object, dict):
    #         update_data = object
    #     else:
    #         update_data = object.model_dump(exclude_unset=True)

    #     updated_at_col = getattr(self.model, self.updated_at_column, None)
    #     if updated_at_col:
    #         update_data[self.updated_at_column] = datetime.now(timezone.utc)

    #     update_data_keys = set(update_data.keys())
    #     model_columns = {column.name for column in inspect(self.model).c}
    #     extra_fields = update_data_keys - model_columns
    #     if extra_fields:
    #         raise ValueError(f"Extra fields provided: {extra_fields}")

    #     filters = self._parse_filters(**kwargs)
    #     stmt = update(self.model).filter(*filters).values(update_data)

    #     if return_as_model:
    #         return_columns = self.model_col_names

    #     if return_columns:
    #         stmt = stmt.returning(*[column(name) for name in return_columns])
    #         db_row = await db.execute(stmt)
    #         if commit:
    #             await db.commit()
    #         if allow_multiple:
    #             return self._as_multi_response(
    #                 db_row,
    #                 schema_to_select=schema_to_select,
    #                 return_as_model=return_as_model,
    #             )
           
    #         return self._as_single_response(
    #             db_row,
    #             schema_to_select=schema_to_select,
    #             return_as_model=return_as_model,
    #             one_or_none=one_or_none,
    #         )

    #     await db.execute(stmt)
    #     if commit:
    #         await db.commit()
    #     return None

    async def get(
        self,
        *,
        id: int | UUID | str | tuple[int, ...],
        db: AsyncSession | None = None,
    ) -> ModelType | None:
        session = db 
        query = select(self.model).where(self.model.id == id)
        response = await session.execute(query)
        return response.scalar_one_or_none()
    
    async def get_by_filters_multi(
        self,
        *,
        filters: dict[str, int | UUID | str] | None = None,  # Use a dict for filters
        attr: str | None = None ,
        ids: list[int] | None = None ,
        clause_statements: str | None = None,
        order_by: str | None = None,
        skip: int | None = None,
        limit: int | None = None,
        db: AsyncSession | None = None,
    ) -> list[ModelType]:
        session = db
        columns = self.model.__table__.columns
        if order_by is None or order_by not in columns:
            order_by = "id"
        conditions = []   
        if filters:
            for field, value in filters.items():
                column = getattr(self.model, field, None)
                if column is None:
                    raise ValueError(f"Invalid filter field: {field}")

                if isinstance(value, list):
                    # Use in_ for list-based filtering
                    conditions.append(column.in_(value))
                else:
                    # Use == for single-value filtering
                    conditions.append(column == value)
        
            # # Construct filters dynamically using and_ for multiple conditions
            # conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        if ids:
            conditions.append(getattr(self.model, attr).in_(ids))  # Assuming 'batch_id' is the column name
        if clause_statements:
            if isinstance(clause_statements,(list,tuple)):
                for clause in clause_statements:
                    if isinstance(clause, ClauseElement):
                        conditions.append(clause)
                    else:
                        raise ValueError(f"Invalid clause: {clause}")
            elif isinstance(clause_statements, ClauseElement):
                conditions.append(clause_statements)
            else:
                raise ValueError("clause_statements must be a ClauseElement or list/tuple of them")

        # Main query to get all columns from self.model and join with the count subquery
        response = await session.execute(
            select(self.model)  # Select all columns from model and count from subquery
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(columns[order_by].asc())
        )
    
        return response.scalars().all()
    
    async def get_by_filters_multi_desc(
        self,
        *,
        filters: dict[str, int | UUID | str] | None = None,  # Use a dict for filters
        attr: str | None = None ,
        ids: list[int] | None = None ,
        clause_statements: str | None = None,
        order_by: str | None = None,
        skip: int | None = None,
        limit: int | None = None,

        db: AsyncSession | None = None,
    ) -> list[ModelType]:
        session = db
        columns = self.model.__table__.columns
        if order_by is None or order_by not in columns:
            order_by = "id"
        conditions = []   
        if filters:
            for field, value in filters.items():
                column = getattr(self.model, field, None)
                if column is None:
                    raise ValueError(f"Invalid filter field: {field}")

                if isinstance(value, list):
                    # Use in_ for list-based filtering
                    conditions.append(column.in_(value))
                else:
                    # Use == for single-value filtering
                    conditions.append(column == value)
        
            # # Construct filters dynamically using and_ for multiple conditions
            # conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        if ids:
            conditions.append(getattr(self.model, attr).in_(ids))  # Assuming 'batch_id' is the column name
        if clause_statements:
            if isinstance(clause_statements,(list,tuple)):
                for clause in clause_statements:
                    if isinstance(clause, ClauseElement):
                        conditions.append(clause)
                    else:
                        raise ValueError(f"Invalid clause: {clause}")
            elif isinstance(clause_statements, ClauseElement):
                conditions.append(clause_statements)
            else:
                raise ValueError("clause_statements must be a ClauseElement or list/tuple of them")

        # Main query to get all columns from self.model and join with the count subquery
        response = await session.execute(
            select(self.model)  # Select all columns from model and count from subquery
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(columns[order_by].desc())
        )
    
        return response.scalars().all()
    

    async def get_by_filters_multi_by_or(
        self,
        *,
        filters: dict[str, int | UUID | str] | None = None,  # Use a dict for filters
        attr: str | None = None ,
        ids: list[int] | None = None ,
        order_by: str | None = None,
        skip: int | None = None,
        limit: int | None = None,
        db: AsyncSession | None = None,
    ) -> list[ModelType]:
        session = db
        columns = self.model.__table__.columns
        if order_by is None or order_by not in columns:
            order_by = "id"
        conditions = []   
        if filters:
            for field, value in filters.items():
                column = getattr(self.model, field, None)
                if column is None:
                    raise ValueError(f"Invalid filter field: {field}")

                if isinstance(value, list):
                    # Use in_ for list-based filtering
                    conditions.append(column.in_(value))
                else:
                    # Use == for single-value filtering
                    conditions.append(column == value)
        
            # # Construct filters dynamically using and_ for multiple conditions
            # conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        if ids:
            conditions.append(getattr(self.model, attr).in_(ids))  # Assuming 'batch_id' is the column name

        # Main query to get all columns from self.model and join with the count subquery
        response = await session.execute(
            select(self.model)  # Select all columns from model and count from subquery
            .where(or_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(columns[order_by].asc())
        )
    
        return response.scalars().all()
    

    async def get_count_by_filters(
        self,
        *,
        filters: dict[str, Any] | None = None,  # Use a dict for filters
        attr: str | None = None ,
        ids: list[int] | None = None ,
        db: AsyncSession | None = None,
    ) -> list[ModelType] | None:
        session = db
        
        # if filters:
        #     # Construct filters dynamically using and_ for multiple conditions
        #     conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        # else:
        #     conditions = [] 
        # if ids:
        #     conditions.append(getattr(self.model, attr).in_(ids))        
        conditions = []   
        if filters:
            for field, value in filters.items():
                column = getattr(self.model, field, None)
                if column is None:
                    raise ValueError(f"Invalid filter field: {field}")

                if isinstance(value, list):
                    # Use in_ for list-based filtering
                    conditions.append(column.in_(value))
                else:
                    # Use == for single-value filtering
                    conditions.append(column == value)
        
            # # Construct filters dynamically using and_ for multiple conditions
            # conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        if ids:
            conditions.append(getattr(self.model, attr).in_(ids))  # Assuming 'batch_id' is the column name

        # Subquery to get count with conditions
        response = await session.execute(
            select(func.count()).select_from(select(self.model)
            .where(and_(*conditions)).subquery()
           
        ))
        return response.scalar_one()

    async def get_by_field(
        self,
        *,
        value: int | UUID | str,
        field: str,
        db: AsyncSession | None = None,
    ) -> ModelType | None:
        session = db 
        response = await session.execute(
            select(self.model).where(
                self.model.__getattribute__(self.model, field) == value
            )
        )
        return response.scalar_one_or_none()

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType], db = db):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        **Parameters**
        * `model`: A SQLAlchemy model class
        * `schema`: A Pydantic model (schema) class
        """
        self.model = model
        self.db = db

    def get_db(self) -> AsyncSession:
        return self.db.session

    async def create(
        self,
        *,
        obj_in: CreateSchemaType | ModelType,
        created_by_id: int | UUID | str | None = None,
        db_session: AsyncSession | None = None,
    ) -> ModelType:
        session = db_session 
        if isinstance(obj_in, self.model):
            db_obj = obj_in

        else:
            db_obj = self.model(**obj_in.model_dump())  # type: ignore

        if created_by_id:
            db_obj.created_by_id = created_by_id

        try:
            session.add(db_obj)
            await session.commit()
        except exc.IntegrityError as err:
            print("errr>>>>>>", err)
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource already exists",
            )
        await session.refresh(db_obj)
        return db_obj

    async def update(
        self,
        *,
        obj_current: ModelType,
        obj_new: UpdateSchemaType | dict[str, Any] | ModelType,
        db_session: AsyncSession | None = None,
    ) -> ModelType:
        session = db_session 
        obj_data = jsonable_encoder(obj_current)

        if isinstance(obj_new, dict):
            update_data = obj_new
        elif isinstance(obj_new, self.model):
            update_data = obj_new.__dict__
        else:
            update_data = obj_new.model_dump(
                exclude_unset=True
            )  # This tells Pydantic to not include the values that were not sent

        for field in obj_data:
            if field in update_data:
                setattr(obj_current, field, update_data[field])

        try:
            session.add(obj_current)
            await session.commit()
        except exc.IntegrityError as err:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource already exists",
            )

        await session.refresh(obj_current)
        return obj_current

    async def get(
        self,
        *,
        id: int | UUID | str | tuple[int, ...],
        db_session: AsyncSession | None = None,
    ) -> ModelType | None:
        session = db_session 
        query = select(self.model).where(self.model.id == id)
        response = await session.execute(query)
        return response.scalar_one_or_none()

    async def get_by_ids(
        self,
        *,
        list_ids: list[int | UUID | str],
        db_session: AsyncSession | None = None,
    ) -> list[ModelType] | None:
        session = db_session 
        response = await session.execute(
            select(self.model).where(self.model.id.in_(list_ids))
        )
        return response.scalars().all()

    async def get_by_field(
        self,
        *,
        value: int | UUID | str,
        field: str,
        db_session: AsyncSession | None = None,
    ) -> ModelType | None:
        session = db_session 
        response = await session.execute(
            select(self.model).where(
                self.model.__getattribute__(self.model, field) == value
            )
        )
        return response.scalar_one_or_none()

    async def get_by_field_multi(
        self,
        *,
        value: int | UUID | str,
        field: str,
        db_session: AsyncSession | None = None,
    ) -> list[ModelType] | None:
        session = db_session 
        response = await session.execute(
            select(self.model).where(
                self.model.__getattribute__(self.model, field) == value
            )
        )
        return response.scalars().all()

    async def get_by_filters_multi(
        self,
        *,
        filters: dict[str, int | UUID | str],  # Use a dict for filters
        db_session: AsyncSession | None = None,
    ) -> list[ModelType] | None:
        session = db_session
        
        # Construct filters dynamically using and_ for multiple conditions
        conditions = [getattr(self.model, field) == value for field, value in filters.items()]
        
        # Use and_ to combine all the conditions if multiple, or single condition if only one filter
        response = await session.execute(
            select(self.model).where(and_(*conditions))  # Apply dynamic conditions
        )
        
        return response.scalars().all()

    async def get_count_by_filters(
            self,
            *,
            filters: dict[str, int | UUID | str],  # Use a dict for filters
            attr: str | None = None ,
            ids: list[int] | None = None ,
            db: AsyncSession | None = None,
        ) -> list[ModelType] | None:
            session = db
            
            if filters:
                # Construct filters dynamically using and_ for multiple conditions
                conditions = [getattr(self.model, field) == value for field, value in filters.items()]
            else:
                conditions = [] 
            if ids:
                conditions.append(getattr(self.model, attr).in_(ids))        

            # Subquery to get count with conditions
            response = await session.execute(
                select(func.count()).select_from(select(self.model)
                .where(and_(*conditions)).subquery()
            
            ))
            return response.scalar_one()


    async def get_count(
        self, db_session: AsyncSession | None = None
    ) -> ModelType | None:
        session = db_session 
        response = await session.execute(
            select(func.count()).select_from(select(self.model).subquery())
        )
        return response.scalar_one()

    async def get_multi(
        self,
        *,
        skip: int = 0,
        limit: int = 10000,
        query: T | Select[T] | None = None,
        db_session: AsyncSession | None = None,
    ) -> list[ModelType]:
        session = db_session 
        if query is None:
            query = select(self.model).offset(skip).limit(limit).order_by(self.model.id)
        response = await session.execute(query)
        return response.scalars().all()

    async def get_multi_ordered(
        self,
        *,
        skip: int = 0,
        limit: int = 10000,
        order_by: str | None = None,
        order: IOrderEnum | None = IOrderEnum.ascendent,
        db_session: AsyncSession | None = None,
    ) -> list[ModelType]:
        session = db_session 

        columns = self.model.__table__.columns

        if order_by is None or order_by not in columns:
            order_by = "id"

        if order == IOrderEnum.ascendent:
            query = (
                select(self.model)
                .offset(skip)
                .limit(limit)
                .order_by(columns[order_by].asc())
            )
        else:
            query = (
                select(self.model)
                .offset(skip)
                .limit(limit)
                .order_by(columns[order_by].desc())
            )

        response = await session.execute(query)
        return response.scalars().all()


    # async def get_multi_paginated(
    #     self,
    #     *,
    #     params: Params | None = Params(),
    #     query: T | Select[T] | None = None,
    #     db_session: AsyncSession | None = None,
    # ) -> Page[ModelType]:
    #     session = db_session 
    #     if query is None:
    #         query = select(self.model)
    #     return await paginate(session, query, params)

    # async def get_multi_paginated_ordered(
    #     self,
    #     *,
    #     params: Params | None = Params(),
    #     order_by: str | None = None,
    #     order: IOrderEnum | None = IOrderEnum.ascendent,
    #     query: T | Select[T] | None = None,
    #     db_session: AsyncSession | None = None,
    # ) -> Page[ModelType]:
    #     session = db_session 

    #     columns = self.model.__table__.columns

    #     if order_by is None or order_by not in columns:
    #         order_by = "id"

    #     if query is None:
    #         if order == IOrderEnum.ascendent:
    #             query = select(self.model).order_by(columns[order_by].asc())
    #         else:
    #             query = select(self.model).order_by(columns[order_by].desc())

    #     return await paginate(session, query, params)

    async def delete(
        self,
        *,
        id: int | UUID | str | tuple[int, ...],
        db_session: AsyncSession | None = None,
    ) -> ModelType:
        session = db_session 
        response = await session.execute(select(self.model).where(self.model.id == id))
        obj = response.scalar_one()
        try:
            await session.delete(obj)
            await session.commit()
        except exc.IntegrityError as err:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="Resource delete error" + err.__str__(),
            )

        return obj

    async def bulk_create(
            self,
            *,
            objects: List[CreateSchemaType | ModelType],
            db: AsyncSession
        ) -> List[ModelType]:
            """Efficient bulk insert using bulk_insert_mappings for performance."""
            try:
                # Convert objects to dictionary format for bulk insert
                data_list = [obj.model_dump() if isinstance(obj, self.model) else obj if isinstance(obj, dict) else vars(obj) for obj in objects]

                # Use bulk_insert_mappings to insert all records at once
                await db.run_sync(lambda session: session.bulk_insert_mappings(self.model, data_list))
                
                await db.commit()

                return data_list  # Return inserted data (without full ORM objects) so ids of the data will not be seen
            except exc.IntegrityError as err:
                await db.rollback()
                raise HTTPException(status_code=409, detail=f"Database Integrity Error: {str(err)}")
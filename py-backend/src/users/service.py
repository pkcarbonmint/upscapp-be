import pytz
from src.base.service import BaseService
from src.exceptions import NotFound
from src.external.cms.service import fetch_paginated_review_items
from src.modules.frontdesk.models import MasterData, Walkin, Admission
from src.modules.products.schemas import OFFERING_CATEGORY, OFFERING_SUB_TYPE
from .schemas import *
from .models import *
from sqlalchemy.dialects.postgresql import JSONB
from src.modules.products.models import Batch, Enrollment, Offering, Product, Purchase,PurchaseInstallment
from .exceptions import *
from src.tenants.models import Tenant, Branch
from sqlalchemy import (
    Date,
    any_,
    exists,
    select,
    and_,
    desc,
    asc,
    func,
    literal_column,
    text,
    or_,
    case,
    cast,
    join, distinct,
    update
)
from sqlalchemy.orm import joinedload, aliased
from sqlalchemy.dialects.postgresql import aggregate_order_by
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, date, timezone

class UserService(BaseService[User, UserCreate, UserUpdate]):
    async def check_user(self, value: str, auth_field_type: str,db_session: AsyncSession | None = None) -> User:
        user = await self.get_by_field(field=auth_field_type, value=value,db_session=db_session)
        if not user:
            raise NotFound()

        return user

    async def check_auth_user(
        self, auth_user: str, db_session: AsyncSession | None = None
    ) -> User:
        session = db_session 
        response = await session.execute(
            select(self.model).where(
                or_(
                    self.model.phone_number == auth_user,
                    self.model.email == auth_user,
                    self.model.username == auth_user,
                )
            )
        )
        return response.scalar_one_or_none()

    async def check_user_by_id(self, id, db_session: AsyncSession| None = None) -> User:
        user = await self.get(id=id,db_session=db_session)
        if not user:
            raise NotFound()

        return user

    async def get_users_by_partial_ph_nos(self, prefix: str, db_session: AsyncSession| None = None):
        users = await self.get_multi(limit=100000,db_session=db_session)

        matching_users = [
            user for user in users if (user.phone_number).startswith(prefix)
        ]
        if len(matching_users) == 0:
            return {"message": "No matching numbers found"}
        five_users = matching_users[:5]
        return five_users

    async def get_users_by_name_phno(self,name:str|None, phno: str|None, db_session: AsyncSession|None = None):
        session = db_session 
        query = select(self.model).where(and_(self.model.full_name.ilike(f"%{name}%") if name else True,self.model.phone_number.ilike(f"%{phno}%") if phno else True))
        result = await session.execute(query)
        return result.scalars().all()

    async def get_tenant_admins(
        self, tenant_id: int, db_session: AsyncSession
    ) -> list[User]:
        query = select(self.model).where(
            self.model.tenant_id == tenant_id,
            self.model.roles.any("TENANT_ADMIN"),
            self.model.is_admin == True,
        )
        users = await self.get_multi(query=query, db_session=db_session)

        return users

    async def get_tenant_users(
        self, tenant_id: int, db_session: AsyncSession | None = None
    ) -> list[User]:
        session = db_session 
        query = select(self.model).where(
            and_(self.model.tenant_id == tenant_id, self.model.is_admin == False)
        )
        users = await self.get_multi(query=query, db_session=session)
        return users

    async def calc_tenant_users_stats(
        self, tenant_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        # query= select(self.model,func.sum(self.model.tenant_id == tenant_id, self.model.is_admin==False).label("total_students"))
        end_of_week = datetime.now() + timedelta(days=7)

        stmt = (
            select(
                func.count().label("total"),
                func.sum(
                    case(
                        (
                            and_(
                                Subscription.subscription_status == "ACTIVE",
                                Subscription.subscription_amount > 0,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("paid_with_active"),
                func.sum(
                    case(
                        (
                            and_(
                                Subscription.subscription_amount == 0,
                                Subscription.subscription_status == "ACTIVE",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("free_with_active"),
                func.sum(
                    case(
                        (
                            or_(Subscription.subscription_status != "ACTIVE", User.subscription_id == None ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("with_non_active"),
                func.sum(
                    case(
                        (
                            and_(
                                Subscription.current_expiry_at.between(
                                    datetime.now(), end_of_week
                                ),
                                Subscription.subscription_status == "ACTIVE",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("ending_this_week"),
            )
            .select_from(User)
            .where(
                self.model.tenant_id == tenant_id,
                self.model.is_admin == False,
            )
            .outerjoin(Subscription, self.model.subscription_id == Subscription.id)
        )

        result = await session.execute(stmt)
        return result.first()._asdict()

    async def tenant_user_reports(self, db_session: AsyncSession | None = None):
        session = db_session 

        query = (
            select(
                User,
                Tenant.logo.label("tenant_logo"),
                Tenant.name.label("brand_name"),
                Tenant.domain.label("tenant_domain"),
            )
            .select_from(User)
            .join(Tenant, User.tenant_id == Tenant.id)
        )
        result = await session.execute(query)

        reports = result.all()

        return reports

    async def get_user_emails(
        self, db_session: AsyncSession | None = None
    ) -> User:
        session = db_session 
        response = await session.execute(
            # select(self.model.email.label("email"), self.model.full_name.label("name")).where(
            #         self.model.is_active == True
            # )
            select(self.model.email).where(
                    self.model.is_active == True,
                    self.model.email != None
             )
        )
        result = response.scalars().all()
        return result
    
    async def get_referred_users(
        self, db_session: AsyncSession | None = None
    ) -> User:
        session = db_session 
        u1 = aliased(User) #referee
        u2 = aliased(User) #referrer

        query = select(u1.id.label("referee_id"),u1.created_at.label("referee_joined"),u1.full_name.label("referee_name"),u1.phone_number.label("referee_phno"),u1.referred_by_id.label("referrer_id"),u2.full_name.label("referrer_name"),u2.phone_number.label("referrer_phno"),).select_from(u1).join(u2 , u1.referred_by_id == u2.id).where(
                    u1.referred_by_id != None,
                    u1.is_active != False
             )
      
        response = await session.execute(query)
        result = response.all()
        return result

    async def get_values_masterdata(self,category:str,db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = (select(MasterData.value).where(MasterData.category == category))
        response = await session.execute(query)
        result = response.scalars().all()
        return result


    async def get_users_by_usertype(self, user_type:USER_TYPE | None = None,is_external:bool | None = None,role:USER_ROLE | None = None, db_session: AsyncSession | None = None):
        session = db_session 
        subquery = (
        select(func.count(distinct(User.id)).label("total_users"))
        .where(and_(User.user_type == user_type if user_type is not None else True,
                    User.is_external == is_external if is_external is not None else True,
                    User.roles.any(role) if role is not None else True))
        .scalar_subquery()
    )
        query = (
            select(
                User,
                func.array_agg(func.json_build_object(
                'id', Branch.id,
                'name', Branch.name,
                'address', Branch.address,
                'photo', Branch.photo,  # You can explicitly set this to None
                'city', Branch.city,
                'pincode', Branch.pincode,
                'phoneNumber', Branch.phone_number,
                'email', Branch.email,
                'status', Branch.status,
                'tenantId', Branch.tenant_id
            )).label("branches"),
                subquery.label("count")
            )
            .outerjoin(BranchUser, BranchUser.user_id == User.id)
            .outerjoin(Branch, BranchUser.branch_id == Branch.id)
            .where(and_(User.user_type == user_type if user_type is not None else True,
                        User.is_external == is_external if is_external is not None else True,
                        User.roles.any(role) if role is not None else True))
            .group_by(User.id)
        )
        result = await session.execute(query)

        users = result.all()

        return users
    
    async def get_users_role_branch_by_filter(self, user_type:USER_TYPE | None = None, is_external:bool | None = None,role:USER_ROLE | None = None, branch_ids:list[int] | None = None, db_session: AsyncSession | None = None):
        session = db_session 
        subquery = (
        select(func.count(distinct(User.id)).label("total_users"))
        .select_from(User)
        .outerjoin(UserRole, User.id == UserRole.user_id)
        .outerjoin(BranchUser, BranchUser.branch_id == UserRole.branch_id)
        .where(and_(User.user_type == user_type if user_type is not None else True,
                    User.is_external == is_external if is_external is not None else True,
                    User.roles.any(role) if role is not None else True,
                    UserRole.branch_id.in_(branch_ids) if branch_ids is not None else True,
                    BranchUser.branch_id.in_(branch_ids) if branch_ids is not None else True))
        .scalar_subquery()
        )
        roles_subquery = (
            select(
                UserRole.branch_id.label("branch_id"),
                UserRole.user_id.label("user_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Role.id,
                        'role', Role.role,
                        'user_role_id',UserRole.id
                    )
                ).label("roles")
            ).select_from(UserRole)
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(and_(
                UserRole.user_id == User.id,
                User.user_type == user_type if user_type is not None else True,
                User.is_external == is_external if is_external is not None else True,
                User.roles.any(role) if role is not None else True
            ))
            .group_by(UserRole.branch_id, UserRole.user_id)
            .subquery()
        )
        # Main query to aggregate branches and join the roles subquery
        query = (
            select(
                User,
                func.json_agg(
                    func.json_build_object(
                        'id', Branch.id,
                        'name', Branch.name,
                        'address', Branch.address,
                        'photo', Branch.photo, 
                        'city', Branch.city,
                        'pincode', Branch.pincode,
                        'phoneNumber', Branch.phone_number,
                        'email', Branch.email,
                        'status', Branch.status,
                        'tenantId', Branch.tenant_id,
                        'roles', roles_subquery.c.roles, 
                        # 'user_role_id', roles_subquery.c.user_role_id
                        

                    )
                ).label("branches"),
                subquery.label("count")
            )
            .select_from(User)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(BranchUser, BranchUser.user_id == User.id) 
            .outerjoin(Branch, or_(Branch.id == UserRole.branch_id, Branch.id == BranchUser.branch_id))  
            .outerjoin(roles_subquery, and_(roles_subquery.c.branch_id == Branch.id, roles_subquery.c.user_id == User.id))
            .where(and_(User.user_type == user_type if user_type is not None else True,
                        User.is_external == is_external if is_external is not None else True,
                        User.roles.any(role) if role is not None else True,
                        UserRole.branch_id.in_(branch_ids) if branch_ids is not None else True,
                        BranchUser.branch_id.in_(branch_ids) if branch_ids is not None else True))
            .group_by(User.id)
            .order_by(User.id)
        )

        result = await session.execute(query)
        users = result.all()

        return users
    
    async def get_user(self, user_id:int, db_session: AsyncSession | None = None):
        session = db_session 

        query = (
            select(
                User,
                func.array_agg(func.json_build_object(
                'id', Branch.id,
                'name', Branch.name,
                'address', Branch.address,
                'photo', Branch.photo,  # You can explicitly set this to None
                'city', Branch.city,
                'pincode', Branch.pincode,
                'phoneNumber', Branch.phone_number,
                'email', Branch.email,
                'status', Branch.status,
                'tenantId', Branch.tenant_id
            )).label("branches")
            )
            .outerjoin(BranchUser, BranchUser.user_id == User.id)
            .outerjoin(Branch, BranchUser.branch_id == Branch.id)
            .where(User.id == user_id)
            .group_by(User.id)
        )
        result = await session.execute(query)

        user = result.mappings().all()

        return user
    
    async def get_branch_users(self, *, user_type:USER_TYPE | None = None,
                                is_external:bool | None = None, branch_ids:list[int]| None = None,role:USER_ROLE | None = None,
                                  db_session: AsyncSession | None = None,limit: int = 10000, offset: int = 0):
        session = db_session 
        subquery = (
            select(func.count(distinct(User.id)).label("total_users"))
            .outerjoin(BranchUser, BranchUser.user_id == User.id)
            .where(and_(User.user_type == user_type if user_type is not None else True,
                        BranchUser.branch_id.in_(branch_ids) if branch_ids is not None else True , 
                        User.is_external == is_external if is_external is not None else True,
                        User.roles.any(role) if role is not None else True))
            .scalar_subquery()
        )
        query = (
            select(
                User,
                func.array_agg(func.json_build_object(
                'id', Branch.id,
                'name', Branch.name,
                'address', Branch.address,
                'photo', Branch.photo,  # You can explicitly set this to None
                'city', Branch.city,
                'pincode', Branch.pincode,
                'phoneNumber', Branch.phone_number,
                'email', Branch.email,
                'status', Branch.status,
                'tenantId', Branch.tenant_id
            )).label("branch_names"),
                subquery.label("count")
            )
            .select_from(User)
            .outerjoin(BranchUser, BranchUser.user_id == User.id)
            .outerjoin(Branch, BranchUser.branch_id == Branch.id)
            .where(and_(User.user_type == user_type if user_type is not None else True,
                        BranchUser.branch_id.in_(branch_ids) if branch_ids is not None else True, 
                        User.is_external == is_external if is_external is not None else True,
                        User.roles.any(role) if role is not None else True))
            .group_by(User.id)
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(query)

        user = result.all()

        return user

    async def get_user_by_role_branch(self,*, user_id: int, db_session: AsyncSession | None = None):
        session = db_session

        # Subquery to aggregate roles by branch
        roles_subquery = (
            select(
                UserRole.branch_id.label("branch_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Role.id,
                        'role', Role.role,
                        'user_role_id', UserRole.id
                    )
                ).filter(Role.id.isnot(None)).label("roles")
            ).select_from(UserRole)
            .outerjoin(Role, Role.id == UserRole.role_id)
            .where(UserRole.user_id == user_id)
            .group_by(UserRole.branch_id)
        #     .union_all(
        #     select(
        #         BranchUser.branch_id.label("branch_id"),
        #         func.json_agg(
        #             func.json_build_object(
        #                 'id', None,
        #                 'role', None,
        #                 'user_role_id', None
        #             )
        #         ).label("roles")
        #     )
        #     .select_from(BranchUser)
        #     .where(BranchUser.user_id == user_id)
        #     .group_by(BranchUser.branch_id)
        # )
            .subquery()
        )

        # Main query to aggregate branches and join the roles subquery
        query = (
            select(
                User,
                func.json_agg(
                    func.json_build_object(
                        'id', Branch.id,
                        'name', Branch.name,
                        'address', Branch.address,
                        'photo', Branch.photo,
                        'city', Branch.city,
                        'pincode', Branch.pincode,
                        'phoneNumber', Branch.phone_number,
                        'email', Branch.email,
                        'status', Branch.status,
                        'tenantId', Branch.tenant_id,
                        'roles', roles_subquery.c.roles
                    )
                ).label("branches")
            )
            .select_from(User)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(BranchUser, BranchUser.user_id == User.id) 
            .outerjoin(Branch, or_(Branch.id == UserRole.branch_id, Branch.id == BranchUser.branch_id))
            .outerjoin(roles_subquery, roles_subquery.c.branch_id == Branch.id)
            .where(User.id == user_id)
            .group_by(User.id)
        )

        result = await session.execute(query)
        user = result.first()

        return user  
    
    async def get_content_reviewers(self,db_session: AsyncSession | None = None , offset: int | None = None, limit: int | None = None):
        session = db_session 
        stmt = (
            select(User.id, User.full_name, User.photo, User.is_external,User.phone_number,User.roles)
            .where(User.roles.any(USER_ROLE.content_reviewer)) 
            # .outerjoin(UserRole, UserRole.user_id == User.id)
            # .join(Role, UserRole.role_id == Role.id)
            # .where(Role.role == USER_ROLE.content_reviewer)
            .group_by(User.id)
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(stmt)
        return result.all()
    
    async def count_review_items_for_reviewers(self,db_session: AsyncSession | None = None):
        session = db_session
        offset = 0
        results = []

        while True:
            # Step 1: Fetch a batch of reviewers
            reviewers = await self.get_content_reviewers(session, offset=offset, limit=20)
            if not reviewers:
                break  # Stop when there are no more users
            reviewers = [item._asdict() for item in reviewers]
            user_ids = [user["id"] for user in reviewers]

            # Step 2: Fetch paginated review items for the current batch of users
            review_items = await fetch_paginated_review_items(user_ids)

            # Step 3: Initialize user counts
            assigned_count = {user_id: 0 for user_id in user_ids}
            completed_count = {user_id: 0 for user_id in user_ids}

            # last_week = (datetime.utcnow() - timedelta(days=7)).isoformat()

            # Step 4: Process review items
            for item in review_items:
                reviewers_in_item = []

                reviewerL1 = item["attributes"].get("reviewerL1")
                if reviewerL1 and reviewerL1["id"] in user_ids:
                    reviewers_in_item.append(reviewerL1["id"])

                reviewerL2 = item["attributes"].get("reviewerL2")
                if reviewerL2 and reviewerL2["id"] in user_ids:
                    reviewers_in_item.append(reviewerL2["id"])

                for reviewer_id in reviewers_in_item:
                    assigned_count[reviewer_id] += 1

                    if item["attributes"]["reviewStatus"] in ["REVIEW_PASSED", "REVIEW_FAILED"]:
                        # if item["attributes"]["updatedAt"] >= last_week:
                            completed_count[reviewer_id] += 1

            # Step 5: Construct results for the current batch
            batch_result = [
                {
                    "user": user,
                    "total_assigned": assigned_count[user["id"]],
                    "completed_assigned": completed_count[user["id"]]
                }
                for user in reviewers
            ]

            results.extend(batch_result)
            offset += 20

        return results

    async def get_walkins_by_user_name_phno(self, name:str|None = None, phno:str|None = None,db_session: AsyncSession | None = None ):
        session = db_session 
        subquery = select((User.id)).where(and_(self.model.full_name.ilike(f"%{name}%") if name else True,self.model.phone_number.ilike(f"%{phno}%") if phno else True)).subquery()
        query = select(Walkin).where(Walkin.user_id.in_(subquery))
        result = await session.execute(query)
        return result.unique().scalars().all()
    
    async def get_walkins_by_count(
        self,
        is_repeat: bool,
        limit: int | None = None,
        offset: int | None = None,
        phone_number: str | None = None,
        user_name: str | None = None,
        email: str | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session

        # Subquery to get repeat or non-repeat user_ids with walkin counts
        if is_repeat:
            repeated_users_subq = (
                select(Walkin.user_id, func.count(Walkin.id).label("walkin_user_count"))
                .group_by(Walkin.user_id)
                .having(func.count(Walkin.id) > 1)
                .subquery()
            )
        else:
             repeated_users_subq = (
                    select(Walkin.user_id, func.count(Walkin.id).label("walkin_user_count"))
                    .group_by(Walkin.user_id)
                    .having(func.count(Walkin.id) == 1)
                    .subquery()
                )


        # Build base condition list
        conditions = [
            Walkin.user_id.in_(select(repeated_users_subq.c.user_id))
        ]

        if user_name:
            conditions.append(
                cast(Walkin.profile_details.op("->>")("name"), String).ilike(f"%{user_name}%")
            )
        if phone_number:
            conditions.append(
                cast(Walkin.profile_details.op("->>")("phone_number"), String) == phone_number
            )
        if email:
            conditions.append(
                cast(Walkin.profile_details.op("->>")("email"), String).ilike(f"%{email}%")
            )

        # Final query
        query = (
            select(
                    func.json_agg(
                    func.jsonb_build_object(
                        "name", cast(Walkin.profile_details.op("->>")("name"), String),
                        "email", cast(Walkin.profile_details.op("->>")("email"), String),
                        "phone_no", cast(Walkin.profile_details.op("->>")("phone_number"), String),
                        "birth_date", cast(Walkin.profile_details.op("->>")("birth_date"), String))
                        ).label("profile_details"),
                Walkin.user_id,
                repeated_users_subq.c.walkin_user_count,
            )
            .join(repeated_users_subq, repeated_users_subq.c.user_id == Walkin.user_id)
            .outerjoin(Admission, Admission.walkin_id == Walkin.id)
            .where(*conditions)
            .group_by(Walkin.user_id,repeated_users_subq.c.walkin_user_count)
            .order_by(Walkin.user_id)
            .limit(limit)
            .offset(offset)
        )

        resp = await session.execute(query)
        return [dict(row) for row in resp.mappings().all()]

        
        
    async def get_walkins_by_college_university(self, db: AsyncSession, old_name: str, new_name: str, is_college: bool
        ):
        from sqlalchemy.dialects.postgresql import JSONB

        """Bulk update college or university name in education_details JSONB field."""
        field_key = "college" if is_college else "university"

        stmt = (
            update(Walkin)
            .where(  cast(Walkin.education_details.op("->>")(f"{field_key}"), String)== old_name)  # Match old value
            .values(
                education_details=func.jsonb_set(
                    cast(Walkin.education_details, JSONB),  # Ensure JSONB type
                     text(f"ARRAY['{field_key}']"),   # Proper JSON path
                    func.to_jsonb(new_name),  
                    True  # Create key if missing
                ),
                updated_at=func.now()
            )
            .returning(Walkin.id)
        )
       

        result = await db.execute(stmt)
        await db.commit()
        return result.mappings().all()

    async def get_walkins_masterdata_count(
        self, db_session: AsyncSession, category: str, name: str | None = None, verified: bool | None = None,limit: int = 10, offset: int = 0
    ):
        session = db_session

         # Build filters
        filters = [
            MasterData.category == category,
            # MasterData.value.ilike(f"%{name}%")
        ]
        if name:
            filters.append(MasterData.value.ilike(f"%{name}%"))

        if verified is not None:
            filters.append(MasterData.is_verified == verified)

        # Query
        master_data_query = (
            select( MasterData, func.count(Walkin.id).label("walkin_count"))
            .outerjoin(
                Walkin,
                or_(
                    cast(Walkin.education_details.op("->>")("university"), String) == MasterData.value,
                    cast(Walkin.education_details.op("->>")("college"), String) == MasterData.value,
                )
            )
            .where(and_(*filters))
            .group_by(MasterData.id)
            .limit(limit)  # Apply Pagination Limit
            .offset(offset)
        )

        result = await session.execute(master_data_query)
        count = result.mappings().all()

        return count

                                                
    async def get_enrollments_with_user_details(
        self, 
        id:int | None = None,
        enrolled_as: str | None = None, 
        enrollment_status: str | None = None,
        batch_id: int | None = None, 
        role_batch_ids: list[int] | None = None,
        offering_id: int | None = None, 
        product_id: int | None = None, 
        enrolled_user_id: str | None = None,
        assigned_mentor_id: int | None = None, 
        db_session: AsyncSession | None = None
    ):
        session = db_session
        count_subquery = select(func.count(distinct(Enrollment.id)).label("total_users")).select_from(Enrollment).where(and_(
                Enrollment.enrolled_as == enrolled_as if enrolled_as is not None else True,
                Enrollment.enrollment_status == enrollment_status if enrollment_status is not None else True,
                Enrollment.batch_id == batch_id if batch_id is not None else True,
                Enrollment.offering_id == offering_id if offering_id is not None else True,
                Enrollment.product_id == product_id if product_id is not None else True,
                Enrollment.assigned_mentor_id == assigned_mentor_id if assigned_mentor_id is not None else True,
                Enrollment.id == id if id is not None else True,
                Enrollment.enrolled_user_id == enrolled_user_id if enrolled_user_id is not None else True,
                Enrollment.batch_id.in_(role_batch_ids) if role_batch_ids is not None else True,
            )).scalar_subquery()
        
        roles_subquery = (
            select(
                UserRole.branch_id.label("branch_id"),
                UserRole.user_id.label("user_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Role.id,
                        'role', Role.role,
                        'user_role_id',UserRole.id
                    )
                ).label("roles")
            ).select_from(UserRole)
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(and_(
                UserRole.user_id == User.id
            ))
            .group_by(UserRole.branch_id, UserRole.user_id)
            .subquery()
        )
        # Main query to aggregate branches and join the roles subquery
        user_details_subquery = (
            select(
                User.id.label("user_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Branch.id,
                        'name', Branch.name,
                        'address', Branch.address,
                        'photo', Branch.photo, 
                        'city', Branch.city,
                        'pincode', Branch.pincode,
                        'phoneNumber', Branch.phone_number,
                        'email', Branch.email,
                        'status', Branch.status,
                        'tenantId', Branch.tenant_id,
                        'roles', roles_subquery.c.roles, 
                        # 'user_role_id', roles_subquery.c.user_role_id
                        

                    )
                ).label("branches")
                .label("enrolled_user_details")
               
            )
            .select_from(User)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(BranchUser, BranchUser.user_id == User.id) 
            .outerjoin(Branch, or_(Branch.id == UserRole.branch_id, Branch.id == BranchUser.branch_id))  
            .outerjoin(roles_subquery, and_(roles_subquery.c.branch_id == Branch.id, roles_subquery.c.user_id == User.id))
            .group_by(User.id)
            .order_by(User.id)
        ).subquery()


        # Subquery to get user details along with roles and branches
    
        query = (
            select(
                Enrollment,
                user_details_subquery.c.enrolled_user_details,
                count_subquery.label("count")
            )
            .select_from(Enrollment)
            .join(user_details_subquery, user_details_subquery.c.user_id == Enrollment.enrolled_user_id)
            .where(and_(
                Enrollment.enrolled_as == enrolled_as if enrolled_as is not None else True,
                Enrollment.enrollment_status == enrollment_status if enrollment_status is not None else True,
                Enrollment.batch_id == batch_id if batch_id is not None else True,
                Enrollment.offering_id == offering_id if offering_id is not None else True,
                Enrollment.product_id == product_id if product_id is not None else True,
                Enrollment.assigned_mentor_id == assigned_mentor_id if assigned_mentor_id is not None else True,
                Enrollment.id == id if id is not None else True,
                Enrollment.enrolled_user_id == enrolled_user_id if enrolled_user_id is not None else True,
                Enrollment.batch_id.in_(role_batch_ids) if role_batch_ids is not None else True,
            ))
            .order_by(Enrollment.id)
        )

        result = await session.execute(query)
        enrollments = result.all()

        return enrollments

    async def get_enrollments_with_prod_ids(
        self, 
        id:int | None = None,
        enrolled_as: str | None = None, 
        enrollment_status: str | None = None,
        batch_id: int | None = None, 
        role_product_ids: list[int] | None = None,
        offering_id: int | None = None, 
        product_id: int | None = None, 
        enrolled_user_id: str | None = None,
        assigned_mentor_id: int | None = None, 
        db_session: AsyncSession | None = None
    ):
        session = db_session
        count_subquery = select(func.count(distinct(Enrollment.id)).label("total_users")).select_from(Enrollment).where(and_(
                Enrollment.enrolled_as == enrolled_as if enrolled_as is not None else True,
                Enrollment.enrollment_status == enrollment_status if enrollment_status is not None else True,
                Enrollment.batch_id == batch_id if batch_id is not None else True,
                Enrollment.offering_id == offering_id if offering_id is not None else True,
                Enrollment.product_id == product_id if product_id is not None else True,
                Enrollment.product_id.in_(role_product_ids) if role_product_ids is not None else True,
                Enrollment.assigned_mentor_id == assigned_mentor_id if assigned_mentor_id is not None else True,
                Enrollment.id == id if id is not None else True,
                Enrollment.enrolled_user_id == enrolled_user_id if enrolled_user_id is not None else True,
            )).scalar_subquery()
        
        roles_subquery = (
            select(
                UserRole.branch_id.label("branch_id"),
                UserRole.user_id.label("user_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Role.id,
                        'role', Role.role,
                        'user_role_id',UserRole.id
                    )
                ).label("roles")
            ).select_from(UserRole)
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(and_(
                UserRole.user_id == User.id
            ))
            .group_by(UserRole.branch_id, UserRole.user_id)
            .subquery()
        )
        # Main query to aggregate branches and join the roles subquery
        user_details_subquery = (
            select(
                User.id.label("user_id"),
                func.json_agg(
                    func.json_build_object(
                        'id', Branch.id,
                        'name', Branch.name,
                        'address', Branch.address,
                        'photo', Branch.photo, 
                        'city', Branch.city,
                        'pincode', Branch.pincode,
                        'phoneNumber', Branch.phone_number,
                        'email', Branch.email,
                        'status', Branch.status,
                        'tenantId', Branch.tenant_id,
                        'roles', roles_subquery.c.roles, 
                        # 'user_role_id', roles_subquery.c.user_role_id
                        

                    )
                ).label("branches")
                .label("enrolled_user_details")
               
            )
            .select_from(User)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(BranchUser, BranchUser.user_id == User.id) 
            .outerjoin(Branch, or_(Branch.id == UserRole.branch_id, Branch.id == BranchUser.branch_id))  
            .outerjoin(roles_subquery, and_(roles_subquery.c.branch_id == Branch.id, roles_subquery.c.user_id == User.id))
            .group_by(User.id)
            .order_by(User.id)
        ).subquery()


        # Subquery to get user details along with roles and branches
    
        query = (
            select(
                Enrollment,
                user_details_subquery.c.enrolled_user_details,
                count_subquery.label("count")
            )
            .select_from(Enrollment)
            .join(user_details_subquery, user_details_subquery.c.user_id == Enrollment.enrolled_user_id)
            .where(and_(
                Enrollment.enrolled_as == enrolled_as if enrolled_as is not None else True,
                Enrollment.enrollment_status == enrollment_status if enrollment_status is not None else True,
                Enrollment.batch_id == batch_id if batch_id is not None else True,
                Enrollment.offering_id == offering_id if offering_id is not None else True,
                Enrollment.product_id == product_id if product_id is not None else True,
                Enrollment.assigned_mentor_id == assigned_mentor_id if assigned_mentor_id is not None else True,
                Enrollment.id == id if id is not None else True,
                Enrollment.enrolled_user_id == enrolled_user_id if enrolled_user_id is not None else True,
                Enrollment.product_id.in_(role_product_ids) if role_product_ids is not None else True,
            ))
            .order_by(Enrollment.id)
        )

        result = await session.execute(query)
        enrollments = result.all()

        return enrollments

    async def get_products_for_enrollment(self, enrolled_user_id:int | None = None ,offering_name: str | None = None,offering_category: str | None = None,product_name: str | None = None,
    product_code: str | None = None,planned_start_date: str | None = None,branch_id: int | None = None,exam_id: int | None = None,stage_id: int| None = None
    ,subject_id: int| None = None,assigned_mentor_id:int | None = None ,assigned_guide_id:int | None = None,limit: int = 100, offset: int = 0, db_session: AsyncSession | None = None ):
        session = db_session
        filters = []
    
        if enrolled_user_id is not None:
            filters.append(Enrollment.enrolled_user_id == enrolled_user_id)
        if assigned_mentor_id is not None:
            filters.append(Enrollment.assigned_mentor_id == assigned_mentor_id)
        if assigned_guide_id is not None:
            filters.append(Enrollment.assigned_guide_id == assigned_guide_id)
        if offering_name is not None:
            filters.append(Offering.name.ilike(f"%{offering_name}%"))
        if offering_category is not None:
            filters.append(Offering.offering_category.ilike(f"%{offering_category}%"))
        if product_name is not None:
            filters.append(Product.name.ilike(f"%{product_name}%"))
        if product_code is not None:
            filters.append(Product.code.ilike(f"%{product_code}%"))
        if branch_id is not None:
            filters.append(Product.branch_id == branch_id)

        if exam_id is not None:
            exams_subquery = (
                select(literal_column("unnested_exam ->> 'id'").cast(Integer).label("exam_id"))
                .select_from(func.unnest(Offering.exams).alias("unnested_exam"))
                .where(literal_column("unnested_exam ->> 'id'").cast(Integer).in_([exam_id]))
            )
            filters.append(func.exists(exams_subquery))

        if stage_id is not None:
            stages_subquery = (
                select(literal_column("unnested_stage ->> 'id'").cast(Integer).label("stage_id"))
                .select_from(func.unnest(Offering.stages).alias("unnested_stage"))
                .where(literal_column("unnested_stage ->> 'id'").cast(Integer).in_([stage_id]))
            )
            filters.append(func.exists(stages_subquery))

        if subject_id is not None:
            subject_subquery = (
                select(literal_column("unnested_subject ->> 'id'").cast(Integer).label("subject_id"))
                .select_from(func.unnest(Offering.subjects).alias("unnested_subject"))
                .where(literal_column("unnested_subject ->> 'id'").cast(Integer).in_([subject_id]))
            )
            filters.append(func.exists(subject_subquery))

        if planned_start_date is not None:
            try:
                planned_start_dt = datetime.strptime(planned_start_date, "%Y-%m-%d")
                filters.append(Batch.planned_start_date == planned_start_dt)
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD.")


        query = (select(Product)
                 .select_from(Product)
                 .join(Offering,Offering.id == Product.offering_id)
                 .join(Enrollment, Enrollment.product_id == Product.id)
                 .join(
                     Batch,Batch.id == Product.batch_id
                 )
                 .where(and_(*filters))
                 .distinct(Product.id)
                 .offset(offset).limit(limit))
        result = await session.execute(query)
        purchases = result.scalars().all()
        return purchases
    
    async def get_students_with_guides_mentors(self, product_id:int | None = None, batch_id:int | None = None,name:str | None = None,
                                               student_id:int | None = None,email:str | None = None,phone_no:str | None = None,limit: int = 100, offset: int = 0,db_session: AsyncSession | None = None):
        session = db_session
        student_alias = aliased(User) #student
        mentor_alias = aliased(User) #mentor
        guide_alias = aliased(User) #guide



        # query = (select(student,mentor.full_name.label("mentor_name"),guide.full_name.label("guide_name"))
        #         .select_from(student)
        #         .outerjoin(mentor , mentor.id == student.assigned_mentor_id)
        #         .outerjoin(guide, guide.id == student.assigned_guide_id)
        #         .where(
        #             student.enrolled_as == "STUDENT",
        #             or_(student.product_id == product_id,student.batch_id == batch_id)
        #      ))
        query = (
            select(
                student_alias.id,
                student_alias.full_name.label("student_name"),
                student_alias.email,
                student_alias.photo,    
                student_alias.phone_number,
                mentor_alias.full_name.label("mentor_name"),
                guide_alias.full_name.label("guide_name"),
                guide_alias.id.label("guide_id"),
                Branch.name.label("branch_name"),
                Enrollment.id.label("enrollment_id")
            )
            
            .select_from(Enrollment)  # Start query from Enrollment table
            .outerjoin(student_alias, Enrollment.enrolled_user_id == student_alias.id)
            .outerjoin(mentor_alias, Enrollment.assigned_mentor_id == mentor_alias.id)
            .outerjoin(guide_alias, Enrollment.assigned_guide_id == guide_alias.id)
            .outerjoin(BranchUser, BranchUser.user_id == student_alias.id)
            .outerjoin(Branch,BranchUser.branch_id == Branch.id)
            .where(Enrollment.product_id == product_id if product_id else True,
                    Enrollment.batch_id == batch_id if batch_id else True,
                    Enrollment.enrolled_as == "STUDENT" ,
                    student_alias.full_name == name if name else True,
                    student_alias.id== student_id if student_id else True,
                    student_alias.email == email if email else True,
                    student_alias.phone_number== phone_no if phone_no else True)
            # .distinct(student_alias.id)
            .offset(offset).limit(limit)
        )
      
        response = await session.execute(query)
        result = response.all()
        return result

    async def get_student_for_teacher(self,teacher_id:int,db_session:AsyncSession| None = None,
                                        student_name: str | None = None,
                                        student_id: int | None = None,
                                        phone_number: str | None = None,
                                        email: str | None = None,
                                        offering_name: str | None = None,
                                        product_name: str | None = None,
                                        product_code: str | None = None,
                                        branch_name: str | None = None,
                                        guide_name: str | None = None,
                                        status: str | None = None,
                                         limit: int = 100,
        offset: int = 0):
        session = db_session
        Guide = aliased(User)
        sub_query = (
            select(Enrollment.product_id)
            .where(
                and_(
                    Enrollment.enrolled_as == "TEACHER",
                    or_(
                        Enrollment.enrolled_user_id == teacher_id,
                        Enrollment.assigned_mentor_id == teacher_id,
                        Enrollment.assigned_guide_id == teacher_id
                    )
                )
            )
            .distinct()
            .subquery()
        )    
        query = (
        select(
            User.id.label("student_id"),
            User.full_name.label("student_name"),
            User.phone_number.label("phone_number"),
            User.email.label("user_email"),
            User.photo.label("user_photo"),
            Product.name.label("product_name"),
            Product.code.label("product_code"),
            Offering.name.label("offering_name"),
            Branch.name.label("branch_name"),  # Student's branch
            Enrollment.enrollment_status.label("enrollment_status"),
            Guide.full_name.label("guide_name")  # Fetch guide's name if assigned
        )
        .select_from(User)
        .join(Enrollment, User.id == Enrollment.enrolled_user_id)
        .join(Product, Enrollment.product_id == Product.id)
        .join(Offering, Product.offering_id == Offering.id)
        .join(BranchUser, BranchUser.user_id == User.id, isouter=True)  # Join with BranchUser
        .join(Branch, Branch.id == BranchUser.branch_id, isouter=True)  # Get the student's branch
        .join(Guide, Enrollment.assigned_guide_id == User.id, isouter=True)
        .join(sub_query, sub_query.c.product_id == Enrollment.product_id)
        .where(Enrollment.enrolled_as == "STUDENT")
    )

        if student_name:
            query = query.where(User.full_name == student_name)  # Exact match
        if student_id:
            query = query.where(User.id == student_id)
        if phone_number:
            query = query.where(User.phone_number == phone_number)  # Exact match
        if email:
            query = query.where(User.email == email)  # Exact match
        if offering_name:
            query = query.where(Offering.name == offering_name)  # Exact match
        if product_name:
            query = query.where(Product.name == product_name)  # Exact match
        if product_code:
            query = query.where(Product.code == product_code)  # Exact match
        if branch_name:
            query = query.where(Branch.name == branch_name)  # Exact match
        if guide_name:
            query = query.where(User.full_name == guide_name)  # Exact match for guide
        if status:
            query = query.where(Enrollment.enrollment_status == status)  # Exact match

        query = query.order_by(Enrollment.id).limit(limit).offset(offset)
        result = await session.execute(query)
        students = result.mappings().all()
        return students           
        # query = (select(User).select_from(User).outerjoin(Enrollment,User.id == Enrollment.enrolled_user_id)
        #          .outerjoin(sub_query,sub_query.c.product_id == Enrollment.product_id)
        #          .where(Enrollment.product_id == sub_query.c.product_id, Enrollment.enrolled_as == "STUDENT").order_by(Enrollment.id))
        # result = await session.execute(query)
        # students = result.mappings().all()
        # return students

     # Base query
    
    async def get_prod_student_count_for_teacher(self,user_id: int,
                                                 db_session: AsyncSession | None = None):
        session = db_session
        studentEnrollment = aliased(Enrollment)
        
        # One query to get product count and student count
        query = select(
        func.count(func.distinct(Enrollment.product_id)).label("product_count"),
        func.count(func.distinct(studentEnrollment.enrolled_user_id))
        .filter(studentEnrollment.enrolled_as == "STUDENT")
        .label("student_count")
        ).outerjoin(studentEnrollment, Enrollment.product_id == studentEnrollment.product_id
        ).where(
            or_(
                and_(Enrollment.enrolled_user_id == user_id, Enrollment.enrolled_as == "TEACHER"),
                Enrollment.assigned_mentor_id == user_id,
                Enrollment.assigned_guide_id == user_id
            )
        )

        result = await session.execute(query)
        data = result.first()._asdict() 
        return data
    
    async def get_purchases_with_product_data(self,admission_id: int, db_session: AsyncSession | None = None):
        session = db_session
        query = (
        select(Purchase, Product.name)
        .join(Product, Purchase.product_id == Product.id)
        .where(Purchase.admission_id == admission_id)
        )
        result = await session.execute(query)
        purchases = result.all()
        return purchases
    
    async def get_purchases_with_offering_name(self,pur_ids: list[int], db_session: AsyncSession | None = None):
        session = db_session
        query = (
        select(Purchase, Offering.name, Product.name, Product.code)
        .join(Product, Purchase.product_id == Product.id)
        .join(Offering,Offering.id == Product.offering_id)
        .where(Purchase.id.in_(pur_ids))
        )
        result = await session.execute(query)
        purchases = result.all()
        return purchases
    
    async def get_pur_purinst_with_offering_name(self, admission_id: int, db_session: AsyncSession | None = None):
        session = db_session
        query = (
        select(
            Purchase.id,
            Offering.name.label("offering_name"),
            func.jsonb_agg(
                func.jsonb_build_object(
                    "id", PurchaseInstallment.id,
                    "installment_date", func.date(PurchaseInstallment.installment_date),
                    "installment_amount", PurchaseInstallment.installment_amount,
                    "installment_status", PurchaseInstallment.installment_status
                )
            ).filter(PurchaseInstallment.id.isnot(None)).label("installments")  # Exclude null values
        ).select_from(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .join(Offering, Offering.id == Product.offering_id)
        .outerjoin(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
        .where(Purchase.admission_id == admission_id,or_(
    PurchaseInstallment.is_deleted == False,
    PurchaseInstallment.is_deleted == None
) )
        .group_by(Offering.name,Purchase.id)
        )

        result = await session.execute(query)
        return result.mappings().all() 
    
    async def get_tx_purchases_with_product_data(self,transaction_id: int,  db_session: AsyncSession | None = None):
        session = db_session
        query = (
        select(Purchase, Product.name)
        .join(Product, Purchase.product_id == Product.id)
        .where(Purchase.transaction_id == transaction_id)
        )
        result = await session.execute(query)
        purchases = result.all()
        return purchases

    async def get_purchases_with_prod_filter(self, user_id:int, category:str| None = None, db_session:AsyncSession | None = None):
        session = db_session

        query = (select(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .join(Offering, Product.offering_id == Offering.id)
        .where(Purchase.student_id == user_id,
               Offering.offering_category == category if category else [],
               Purchase.purchase_status == 'COMPLETED',
                )
        .order_by(Purchase.created_at.desc())
        )
        
        result = await session.execute(query)
        purchases = result.scalars().all()
        return purchases
    
    async def get_purchases_with_filters(self,user_id:int | None = None,
                                                     student_name: str | None = None,
                                                     ph_no: str | None = None,
                                                     branch_name: str | None = None,
                                                     purchase_amt: int | None = None,
                                                     purchase_date: date | None = None,
                                                     installment_date: date | None = None,
                                                     prod_name: str | None = None,
                                                     purchase_id:int | None = None,
                                                     purchase_type: str | None = None,
                                                     purchase_status: str | None = None,
                                                     admission_id: int | None = None,
                                                     limit: int = 100, offset: int = 0,db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.student_id == user_id if user_id else True ,or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None), PurchaseInstallment.transaction_id == None)
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        # installment_check = (
        #     select(PurchaseInstallment.id)
        #     .where(
        #         PurchaseInstallment.purchase_id == Purchase.id,
        #         PurchaseInstallment.installment_status.in_(["COMPLETED", "PROVISIONALLY_PAID"])
        #     ).correlate(Purchase)
        # )
        query = (
        select(sub_query.c.due_amount ,Transaction.tx_at.label("tx_at"),Purchase,Product,Admission)
        .select_from(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .outerjoin(Admission,Admission.id == Purchase.admission_id)
        .outerjoin(Transaction, Transaction.id == Purchase.transaction_id)
        .outerjoin(User, User.id == Purchase.student_id)
        .outerjoin(Branch, Branch.id == Admission.branch_id )
        .outerjoin(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
        .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
        .where(Purchase.student_id == user_id if user_id else True,
                User.full_name.ilike(f"%{student_name}%") if student_name else True,
                User.phone_number == ph_no if ph_no else True,
                 Branch.name == branch_name if branch_name else True,
                 Purchase.total_amount == purchase_amt if purchase_amt else True,
                 func.date(Purchase.purchase_date) == purchase_date if purchase_date else True,
                 func.date(PurchaseInstallment.installment_date) == installment_date if installment_date else True,
                 Product.name.ilike(f"%{prod_name}%") if prod_name else True,
                 Purchase.id == purchase_id if purchase_id else True,
                 Purchase.purchase_type == purchase_type if purchase_type else True,
                 Purchase.purchase_status == purchase_status if purchase_status else True,
                 Admission.id == admission_id if admission_id else True,
                #  or_(
                #         Purchase.purchase_status.in_(["COMPLETED", "PROVISIONALLY_PAID"]),
                #         and_(
                #             Purchase.purchase_status == "CREATED",
                #             exists(installment_check)
                #         )
                #     ),
                 or_(PurchaseInstallment.is_deleted == False,
                        PurchaseInstallment.is_deleted == None))
        
        .distinct(Purchase.id)
        .order_by(Purchase.id.desc())
        .offset(offset).limit(limit))
        result = await session.execute(query)
        purchases = result.all()
        return purchases
    
    async def get_purchases_with_prod_admission_data(self,user_id:int | None = None,limit: int = 100, offset: int = 0,db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount"),PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.student_id == user_id if user_id else True , or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None) , PurchaseInstallment.transaction_id == None)
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        installment_check = (
            select(PurchaseInstallment.id)
            .where(
                PurchaseInstallment.purchase_id == Purchase.id,
                PurchaseInstallment.installment_status.in_(["COMPLETED", "PROVISIONALLY_PAID"])
            )
            .correlate(Purchase)
        )
        query = (
        select(sub_query.c.due_amount ,Purchase,Product,Admission).select_from(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .outerjoin(Admission,Admission.id == Purchase.admission_id)
        .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
        .where((Purchase.student_id == user_id if user_id else True),
               or_(
                Purchase.purchase_status.in_(["COMPLETED", "PROVISIONALLY_PAID"]),
                and_(
                    Purchase.purchase_status == "CREATED",
                    exists(installment_check)
                )
            ) )
        .order_by(Purchase.id.desc()).offset(offset).limit(limit))
        result = await session.execute(query)
        purchases = result.all()
        return purchases
    
    async def get_txs_by_purchase(self,purchase_id:int,db_session:AsyncSession | None = None):
        
        session = db_session
        query = (
        select(
            func.jsonb_build_object(
                "id", Purchase.id,
                "transaction_id", Purchase.transaction_id,
                "refund_tx_id", Purchase.refund_tx_id,
                "amount", Purchase.amount,
                "product_id", Purchase.product_id,
                "price_id",  Purchase.price_id,
                "tier_price_id", Purchase.tier_price_id,
                "admission_id",Purchase.admission_id ,
                "purchase_type" , Purchase.purchase_type,
                "student_id" ,Purchase.student_id,
                "quantity",Purchase.quantity,
                "intallments_count",Purchase.intallments_count,
                "purchase_date",Purchase.purchase_date,
                "pricing_model",Purchase.pricing_model,
                "amount",Purchase.amount,
                "discount_id",Purchase.discount_id,
                "discount_amount" ,Purchase.discount_amount,
                "additional_discount_id" ,Purchase.additional_discount_id,
                "additional_disc_amt" ,Purchase.additional_disc_amt,
                "total_amount" ,Purchase.total_amount,
                "billing_frequency" ,Purchase.billing_frequency,
                "recurring_count" ,Purchase.recurring_count,
                "purchase_status" ,Purchase.purchase_status,
                "refund_amount" ,Purchase.refund_amount,
                "purchase_details",Purchase.purchase_details,
                # "purchase_installments",Purchase.purchase_installments,
                
            ).label("purchase"),
            func.coalesce(
            func.array_agg(
                func.jsonb_build_object(
                    "id", PurchaseInstallment.id,
                    "installment_amount", PurchaseInstallment.installment_amount,
                    "price_id", PurchaseInstallment.price_id,
                    "product_id", PurchaseInstallment.product_id,
                    "tier_price_id", PurchaseInstallment.tier_price_id,
                    "purchase_id", PurchaseInstallment.purchase_id,
                    "transaction_id", PurchaseInstallment.transaction_id,
                    "installment_date", PurchaseInstallment.installment_date,
                    "installment_status", PurchaseInstallment.installment_status
                )
            ).filter(PurchaseInstallment.id.isnot(None)),
            []  # Replace NULL with an empty array
        ).label("installments"),
            func.array_agg(
                func.jsonb_build_object(
                    "id", Transaction.id,
                    "amount", Transaction.amount,
                    "paid_by", Transaction.paid_by, 
                    "paid_to" , Transaction.paid_to, 
                    "amount", Transaction.amount, 
                    "currency" , Transaction.currency, 
                    "payment_mode" , Transaction.payment_mode, 
                    "description", Transaction.description,  
                    "pg_ref_id" , Transaction.pg_ref_id, 
                    "pg_data", Transaction.pg_data, 
                    "tx_data" , Transaction.tx_data, 
                    "tx_uuid" , Transaction.tx_uuid, 
                    "tx_id" , Transaction.tx_id, 
                    "tx_at", Transaction.tx_at, 
                    "tx_type" , Transaction.tx_type, 
                    "tx_status" , Transaction.tx_status, 
                   
                )
                ).label("transactions"),
                
            )
            .select_from(Purchase)
            .outerjoin(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
            
            .where(
                Purchase.id == purchase_id,
                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                or_(Purchase.transaction_id == Transaction.id,Purchase.refund_tx_id == Transaction.id,PurchaseInstallment.transaction_id == Transaction.id)

            )
            .group_by(Purchase.id)
        )

        result = await session.execute(query)
        txs = result.all()
       
        return txs
    
    async def get_all_txs_by_purchase(self,purchase_id:int,db_session:AsyncSession | None = None):
        session = db_session
        transaction_query = (
            select(Transaction)
            .where(
                cast(Transaction.tx_data.op("->>")("purchase_ids"), String).contains(purchase_id))
        )
    
        result = await session.execute(transaction_query)
        txs = result.scalars().all()
        return txs

    async def get_offering_types_by_prod_ids(self,prod_ids:list[int],db_session:AsyncSession | None = None):
        session = db_session
        query = (select(Offering.offering_category,
                        func.json_extract_path_text(func.unnest(Offering.exams), 'id').label('exam_ids'),
                        func.json_extract_path_text(func.unnest(Offering.stages), 'id').label('stage_ids'),
                        func.json_extract_path_text(func.unnest(Offering.papers), 'id').label('paper_ids'))
                 .select_from(Offering)
                 .join(Product,Product.offering_id == Offering.id)
                 .where(Product.id.in_(prod_ids)))
        result = await session.execute(query)
        offerings = result.all()
        return offerings

    async def get_product_ids_by_filter(self, offering_category: str,
                                        exam_ids: list[int] | None = None, stage_ids: list[int] | None = None,
                                        paper_ids: list[int] | None = None, db_session: AsyncSession | None = None):
        session = db_session
        filters = [Offering.offering_category == offering_category]
        
        if exam_ids:
            exams_subquery = (
                select(literal_column("unnested_exam ->> 'id'").cast(Integer).label("exam_id"))
                .select_from(func.unnest(Offering.exams).alias("unnested_exam"))
                .where(literal_column("unnested_exam ->> 'id'").cast(Integer).in_(exam_ids))
            )
            filters.append(func.exists(exams_subquery))

        if stage_ids:
            stages_subquery = (
                select(literal_column("unnested_stage ->> 'id'").cast(Integer).label("stage_id"))
                .select_from(func.unnest(Offering.stages).alias("unnested_stage"))
                .where(literal_column("unnested_stage ->> 'id'").cast(Integer).in_(stage_ids))
            )
            filters.append(func.exists(stages_subquery))

        if paper_ids:
            papers_subquery = (
                select(literal_column("unnested_paper ->> 'id'").cast(Integer).label("paper_id"))
                .select_from(func.unnest(Offering.papers).alias("unnested_paper"))
                .where(literal_column("unnested_paper ->> 'id'").cast(Integer).in_(paper_ids))
            )
            filters.append(func.exists(papers_subquery))


        query = (
            select(Product.id)
            .select_from(Product)
            .join(Offering, Offering.id == Product.offering_id)
            .where(and_(*filters))
        )
        
        result = await session.execute(query)
        prods = result.scalars().all()
        return prods

    async def txs_by_date_window(self,start_date:date,end_date:date,branch_ids:list[int] | None = None, 
                                 include_incomplete_txs: bool | None = None,is_online_branch: bool | None = None,
                                 limit:int | None = None,plan_name:str | None = None,offset:int | None = None,tx_id: int | None = None,db_session:AsyncSession | None = None):
        # start_date_with_tz = datetime.combine(start_date, datetime.min.time(), pytz.UTC)
        # end_date_with_tz = datetime.combine(end_date, datetime.max.time(), pytz.UTC)
        # print(f"start_date with timezone: {start_date_with_tz}, {end_date_with_tz}")            
        session = db_session
        # IST_offset = '+05:30'
        # timestamp_ist = func.timezone(IST_offset,Transaction.tx_at)
        start_ist = datetime.combine(start_date, datetime.min.time())
        end_ist = datetime.combine(end_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_utc = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_utc = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        query = (select((
                func.jsonb_build_object(
                    "id", Transaction.id,
                    "amount", Transaction.amount,
                    "paid_by", Transaction.paid_by, 
                    "paid_to" , Transaction.paid_to, 
                    "amount", Transaction.amount, 
                    "currency" , Transaction.currency, 
                    "payment_mode" , Transaction.payment_mode, 
                    "description", Transaction.description,  
                    "pg_ref_id" , Transaction.pg_ref_id, 
                    "pg_data", Transaction.pg_data, 
                    "tx_data" , Transaction.tx_data, 
                    "tx_uuid" , Transaction.tx_uuid, 
                    "tx_id" , Transaction.tx_id, 
                    "tx_at", Transaction.tx_at, 
                    "tx_type" , Transaction.tx_type, 
                    "tx_status" , Transaction.tx_status,    
                    "tx_created_at" , Transaction.created_at    
                )
                ).label("Transaction"),
                func.array_agg(
                func.jsonb_build_object(
                "id", Purchase.id,
                "transaction_id", Purchase.transaction_id,
                "refund_tx_id", Purchase.refund_tx_id,
                "amount", Purchase.amount,
                "product_id", Purchase.product_id,
                "price_id",  Purchase.price_id,
                "tier_price_id", Purchase.tier_price_id,
                "admission_id",Purchase.admission_id ,
                "purchase_type" , Purchase.purchase_type,
                "student_id" ,Purchase.student_id,
                "quantity",Purchase.quantity,
                "intallments_count",Purchase.intallments_count,
                "purchase_date",Purchase.purchase_date,
                "pricing_model",Purchase.pricing_model,
                "amount",Purchase.amount,
                "discount_id",Purchase.discount_id,
                "discount_amount" ,Purchase.discount_amount,
                "additional_discount_id" ,Purchase.additional_discount_id,
                "additional_disc_amt" ,Purchase.additional_disc_amt,
                "total_amount" ,Purchase.total_amount,
                "billing_frequency" ,Purchase.billing_frequency,
                "recurring_count" ,Purchase.recurring_count,
                "purchase_status" ,Purchase.purchase_status,
                "refund_amount" ,Purchase.refund_amount,
                "purchase_details",Purchase.purchase_details,
                # "purchase_installments",Purchase.purchase_installments,
                
            ).distinct()).label("Purchase"),
            func.array_agg(
                func.jsonb_build_object(
                    "id", PurchaseInstallment.id,
                    "transaction_id", PurchaseInstallment.transaction_id,
                    "installment_date",PurchaseInstallment.installment_date,
                    "installment_amount",PurchaseInstallment.installment_amount,
                    "installment_status", PurchaseInstallment.installment_status,
                    "purchase_id", PurchaseInstallment.purchase_id,
                ).distinct()).label("Purchase_Installment"),
                func.array_agg(
                func.jsonb_build_object(
                    "id", Admission.id,
                    "user_id", Admission.user_id,
                    "admission_date", Admission.admission_date,
                    "branch_id" , Admission.branch_id,
                    "status" , Admission.status ,
                    "is_dropout",Admission.is_dropout,
                    "dropout_reason",Admission.dropout_reason
                    # "user" , Admission.user
                )).label("Admission"),
                func.array_agg(
                    func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number
                    
                )).label("User"),
                func.array_agg(
                    func.jsonb_build_object(
                        "id", Subscription.id,
                        "subs_amt", Subscription.subscription_amount,
                        "start_date", Subscription.start_at,
                        "end_date", Subscription.current_expiry_at,
                        "subscription_status", Subscription.subscription_status,
                        "plan_name", Plan.name,
                        "plan_id", Plan.id,
                        "plan_rate", Plan.rate             
                    ).distinct()).label("Subscription")
                )           
        .select_from(Transaction)
        .outerjoin(
            Subscription,Subscription.id == Transaction.subscription_id
        )
        .outerjoin(
            Plan,Subscription.plan_id == Plan.id
        )
        .outerjoin(PurchaseInstallment, or_(PurchaseInstallment.transaction_id == Transaction.id))
        .outerjoin(Purchase,or_(Purchase.transaction_id == Transaction.id,
                           Purchase.refund_tx_id == Transaction.id,
                           PurchaseInstallment.purchase_id == Purchase.id
                            ))
        .outerjoin(Admission, Admission.id == Purchase.admission_id)
        .outerjoin(User, or_(User.id == Admission.user_id,User.id == Subscription.user_id))
        .where(
            # Transaction.tx_status == "COMPLETED",
            or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),
            and_(
                Transaction.tx_at >= start_utc if start_date else True,
                Transaction.tx_at <= end_utc if end_date else True
                ))
        .group_by(Transaction.id)
        .limit(limit)
        .offset(offset))
        if not include_incomplete_txs:
            query = query.where(Transaction.tx_status == "COMPLETED")
        if is_online_branch:
            conditions = []
            if branch_ids:
                conditions.append(Admission.branch_id.in_(branch_ids))
            conditions.append(Subscription.id.isnot(None))
            query = query.where(or_(*conditions))
        elif branch_ids:
            query = query.where(Admission.branch_id.in_(branch_ids))
        if plan_name:
            query = query.where(Plan.name == plan_name)
        if tx_id:
            query = query.where(Transaction.id == tx_id)
        result = await session.execute(query)
        purchases = result.all()
        return purchases

    async def pending_purchases(self,limit:int | None = None,offset:int | None = None,branch_ids:list[int] | None = None,filter_dropout: bool | None = None,db_session:AsyncSession | None = None):
        session = db_session
        sub_query = (select(func.sum(PurchaseInstallment.installment_amount).label("paid_amount"),
                            # Purchase.total_amount.label("purchase_tot_amt"),
                            PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .join(Admission,Admission.id == Purchase.admission_id)
                           .where(Admission.branch_id.in_(branch_ids) if branch_ids else True ,or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),
                                   PurchaseInstallment.installment_status == "COMPLETED")
                            .group_by(PurchaseInstallment.purchase_id)
                           .subquery())
        
        query = (
        select(func.coalesce(sub_query.c.paid_amount, 0).label("paid_amount"),
               (Purchase.total_amount - func.coalesce(sub_query.c.paid_amount)).label("pending_amount"),
               (datetime.today().date()- func.date(Purchase.purchase_date)).label("pending_days"),
               Purchase,
                func.jsonb_build_object(
                    "id", Admission.id,
                    "user_id", Admission.user_id,
                    "admission_date", Admission.admission_date,
                    "branch_id" , Admission.branch_id,
                    "status" , Admission.status ,
                    # "user" , Admission.user
                ).label("Admission"),
               
                    func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number
                    
                ).label("User")
                       ).select_from(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .join(Admission,Admission.id == Purchase.admission_id)
        .join(User, User.id == Admission.user_id)
        .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
        .where(Admission.branch_id.in_(branch_ids) if branch_ids  else True, Purchase.intallments_count !=0,
               (Purchase.total_amount - func.coalesce(sub_query.c.paid_amount, 0) != 0), Purchase.purchase_status == "COMPLETED")
        .order_by(Purchase.id.desc()).offset(offset).limit(limit))
        if filter_dropout:
            query = query.where(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))
        result = await session.execute(query)
        purchases = result.all()
        return purchases

    async def pending_installments_by_date(self,upto_date:date,limit:int | None = None,offset:int | None = None,branch_ids:list[int] | None = None,db_session:AsyncSession | None = None):
        session = db_session
        # get inst for purchase having completed status, inst not in completed status and inst date <= upto date
        sub_query = (
                select(
                    func.coalesce(func.sum(PurchaseInstallment.installment_amount)
                                .over(partition_by=PurchaseInstallment.purchase_id), 0).label("paid_amount"),
                    (Purchase.total_amount - func.coalesce(
                        func.sum(PurchaseInstallment.installment_amount)
                        .over(partition_by=PurchaseInstallment.purchase_id), 0)
                    ).label("pending_amount"),
                    (datetime.today().date() - func.date(Purchase.purchase_date)).label("pending_days"),
                    PurchaseInstallment.purchase_id.label("purchase_id"),
                )
                .select_from(PurchaseInstallment)
                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                .join(Admission, Admission.id == Purchase.admission_id)  
                .where(
                    Admission.branch_id.in_(branch_ids) if branch_ids else True,
                    Purchase.purchase_status == "COMPLETED",
                    PurchaseInstallment.installment_status == "COMPLETED",
                    or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None)
                )
                .distinct(PurchaseInstallment.purchase_id)  # Only unique purchase_id rows
                .subquery()
            )
        
        query = (select(PurchaseInstallment,sub_query.c.paid_amount,sub_query.c.pending_amount,sub_query.c.pending_days,
                         Purchase,
                         func.jsonb_build_object(
                    "id", Admission.id,
                    "user_id", Admission.user_id,
                    "admission_date", Admission.admission_date,
                    "branch_id" , Admission.branch_id,
                    "status" , Admission.status ,
                    # "user" , Admission.user
                ).label("Admission"),
               
                    func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number
                    
                ).label("User"))
                        .select_from(PurchaseInstallment)
                        .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Admission,Admission.id == Purchase.admission_id)
                        .join(User, User.id == Admission.user_id)
                        .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
                        .where(Admission.branch_id.in_(branch_ids) if branch_ids else True, Purchase.purchase_status == "COMPLETED",
                                or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),
                               and_(PurchaseInstallment.installment_status != "COMPLETED", func.date(PurchaseInstallment.installment_date) <= upto_date ))
                               .order_by(PurchaseInstallment.purchase_id.asc()).offset(offset).limit(limit))
               
        result = await session.execute(query)
        purchases = result.all()
        return purchases

    async def get_active_purchases_for_student(self,student_id:int,qbank_type:str | None = None,db_session:AsyncSession| None = None):
        session = db_session
        now = datetime.now(pytz.timezone("Asia/Kolkata"))

        # We’ll build a case expression for time_period to compare purchase_date
        one_month_ago = now - timedelta(days=30)
        three_months_ago = now - timedelta(days=90)
        one_year_ago = now - timedelta(days=365)

        # Alias for easier referencing
        product_details = Product.product_details

        # Extract time_period from nested JSON
        # time_period_expr = product_details["q_bank_info"]["time_period"].astext
        time_period_expr = cast(product_details["q_bank_info"].op("->>")("time_period"), String)
        
        # Dynamic cutoff date based on time_period
        cutoff_expr = case(
            (time_period_expr == "MONTH", one_month_ago),
            (time_period_expr == "QUARTER", three_months_ago),
            (time_period_expr == "YEAR", one_year_ago),
            else_=now  # fallback just in case
        )
        
        query = (select(
            func.jsonb_build_object(
                "id",Product.id ,
                "product_details", Product.product_details
            ).label("product"),
            func.array_agg(
                func.jsonb_build_object(
                "id", Purchase.id,
                "product_id", Purchase.product_id,
                "purchase_date",Purchase.purchase_date                  
                )
                ).label("purchases"),   
            )
                .select_from(Purchase)
                .join(Product,Product.id == Purchase.product_id)
                .join(Offering, Offering.id == Product.offering_id)
                .where(Purchase.student_id == student_id,
                        Purchase.purchase_status == PaymentStatus.completed,
                        Product.status == "PUBLISHED",
                        Purchase.purchase_type == "BUY",
                        Offering.offering_sub_type == OFFERING_SUB_TYPE.qbank,
                        Purchase.purchase_date >= cutoff_expr
                        )
                .group_by(Product.id))
        if qbank_type:
            query = query.where(
            cast(product_details["q_bank_info"],JSONB).op("?")("qbank_type")  # key exists
        ).where(
            cast(product_details["q_bank_info"].op("->>")("qbank_type"), String) == qbank_type
        )
        result = await session.execute(query)
        prods = result.mappings().all()
        return prods

class ProfileService(BaseService[Profile, ProfileCreate, ProfileUpdate]):
    async def get_profiles(self, user_id: int, db_session: AsyncSession | None = None) -> list[Profile]:
        session = db_session 
        query = select(self.model).where(self.model.user_id == user_id)
        profiles = await self.get_multi(query=query,db_session=session)

        return profiles
        # response = await session.execute(query)
        # result = response.scalars().all()
        # return result


    async def get_profile_by_type(
        self, user_id: int, profile_type: str, db_session: AsyncSession | None = None
    ) -> list[Profile]:
        session = db_session 
        query = select(self.model).where(
            self.model.user_id == user_id, self.model.profile_type == profile_type
        )
        response = await session.execute(query)

        return response.scalar_one_or_none()


class SubscriptionService(
    BaseService[Subscription, SubscriptionCreate, SubscriptionUpdate]
):
    async def get_active_subscription(
        self, id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.subscription_status == SubscriptionStatus.active,
            )
        )
        subscription = await session.execute(query)

        return subscription.scalar_one_or_none()
    
    async def get_user_subs_free_plan(
            self, user_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        # zero_rate_plan = await PlanService.get_by_field(self=PlanService,field="rate", value=0, db_session=db_session)
        # print("zero_rate_plan", zero_rate_plan)
        query = select(self.model).join(Plan, Plan.id == self.model.plan_id).where(
            and_(
                self.model.user_id == user_id,
               Plan.rate == 0
                # self.model.subscription_status != SubscriptionStatus.active,
            )
            
        ).order_by(self.model.id.desc())
        subscription = await session.execute(query)

        return subscription.all()

    async def cancel_subscription(
        self, id: int, db_session: AsyncSession | None = None
    ) -> Subscription | None:
    
        my_subscription = await self.get(id=id, db_session=db_session)
        if not my_subscription:
            raise SubscriptionNotFound()

        subscription_db = await self.update(
            obj_current=my_subscription, obj_new={"subscription_status": SubscriptionStatus.cancelled}, db_session=db_session
        )

        return subscription_db

    async def get_billing_reports(
        self, tenant_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = (
            select(User, Subscription)
            # .select_from(Subscription, User)
            .join(User, Subscription.user_id == User.id).where(
                User.tenant_id == tenant_id
            )
        )

        result = await session.execute(query)
        reports = result.all()
        return reports

    async def tenant_user_reports(self, db_session: AsyncSession | None = None):
        session = db_session 

        query = (
            select(
                User,
                Subscription,
                Tenant.logo.label("tenant_logo"),
                Tenant.name.label("brand_name"),
                Tenant.domain.label("tenant_domain"),
            )
            .select_from(Subscription, User)
            .join(Tenant, User.tenant_id == Tenant.id)
            .join(Subscription, Subscription.user_id == User.id)
        )
        result = await session.execute(query)

        reports = result.all()

        return reports

    async def get_student_subscription(
        self, student_id: int, tenant_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 

        query = (
            select(Subscription, Transaction)
            .select_from(Subscription)
            .join(User, User.id == Subscription.user_id)
            .outerjoin(Transaction, Transaction.subscription_id == Subscription.id)
            .where(Subscription.user_id == student_id, User.tenant_id == tenant_id)
        )
        result = await session.execute(query)

        subs = result.all()

        return subs


class PlanService(BaseService[Plan, PlanCreate, PlanUpdate]):
    async def get_plan_by_tenant(
        self, plan_id: int, tenant_id: int, db_session: AsyncSession | None = None
    ) -> Plan | None:
        session = db_session 

        query = select(self.model).where(
            self.model.id == plan_id, self.model.tenant_id == tenant_id
        )

        result = await session.execute(query)

        plan = result.scalar_one_or_none()
        return plan

    async def get_active_plans_grouped_by_name(
        self, tenant_id: int, db_session: AsyncSession | None = None
    ) -> list[dict[str, Any]]:
        session = db_session 

        query = (
            select(
                self.model.name,
                func.json_agg(
                    aggregate_order_by(
                        literal_column(self.model.__tablename__),
                        self.model.billing_frequency.asc(),
                    )
                ).label("active_plans"),
            )
            .select_from(self.model)
            .where(self.model.is_active == True, self.model.tenant_id == tenant_id)
            .order_by(desc(self.model.name))
            .group_by(self.model.name)
        )

        response = await session.execute(query)

        return response.all()

    async def get_active_plan_by_name_frequency(
        self,
        tenant_id: int,
        plan_name: str,
        billing_frequency: str,
        db_session: AsyncSession | None = None,
    ) -> Plan | None:
        session = db_session 
        # query = select(self.model).where(
        #     self.model.is_active == True,
        #     self.model.name == plan_name,
        #     self.model.billing_frequency == billing_frequency,
        # )
        query = select(self.model).where(
            and_(
                self.model.is_active == True,
                self.model.name == plan_name,
                self.model.billing_frequency == billing_frequency,
                self.model.tenant_id == tenant_id,
            )
        )
        response = await session.execute(query)

        return response.scalars().all()


class DiscountCodeService(
    BaseService[DiscountCode, DiscountCodeCreate, DiscountCodeUpdate]
):
    async def get_disc_by_tenant(
        self, disc_id: int, tenant_id: int, db_session: AsyncSession | None = None
    ) -> DiscountCode | None:
        session = db_session 

        query = select(self.model).where(
            self.model.id == disc_id, self.model.tenant_id == tenant_id
        )

        result = await session.execute(query)

        discount = result.scalar_one_or_none()
        return discount

    async def verify_discount_code(
        self, coupon_code: str, tenant_id: int, db_session: AsyncSession | None = None
    ) -> DiscountCode | None:
        session = db_session 

        query = select(self.model).where(
            self.model.coupon_code == coupon_code, self.model.tenant_id == tenant_id
        )

        result = await session.execute(query)

        discount = result.scalar_one_or_none()
        return discount


class TransactionService(
    BaseService[Transaction, TransactionCreate, TransactionUpdate]
):
    async def get_tx_by_id(
        self, auth_req_id: int, subs_id: int, db_session: AsyncSession | None = None
    ):
        session = db_session 
        query = select(self.model).where(
            and_(self.model.tx_id == auth_req_id, self.model.subscription_id == subs_id)
        )
        transaction = await session.execute(query)
        return transaction.scalars().all()

    async def get_transactions(
        self, user_id: int, db_session: AsyncSession
    ) -> list[Transaction]:
        session = db_session 
        query = (
            select(Transaction, Subscription)
            .select_from(Transaction)
            .join(
                Subscription,
                Subscription.id == Transaction.subscription_id,
            )
            .join(
                Plan,
                Subscription.plan_id == Plan.id,
            )
            .where(or_(self.model.paid_by == user_id, self.model.paid_to == user_id))
        )
        transactions = await session.execute(query)
        return transactions.all()

    async def get_tx_by_link_id(
        self, link_id: str,  db_session: AsyncSession | None = None
    ):
        session = db_session 
        
        query = select(self.model).where(
            (cast(self.model.tx_data.op("->>")("id"), String) == link_id)
        )
        transaction = await session.execute(query)
        return transaction.scalar_one_or_none()
    
    async def get_subs_txs(self,start_date:date| None = None,end_date:date| None = None,plan_id:int| None = None, plan_name:str| None = None,
                           user_id:int| None = None, user_name:str| None = None, phone_no:str| None = None, payment_mode:str| None = None,status:str|None = None,limit:int | None = None,offset:int | None = None,db_session:AsyncSession | None = None):
        session = db_session 
        # IST_offset = '+05:30'
        # timestamp_ist = func.timezone(IST_offset,Transaction.tx_at)
        if start_date and end_date:
            start_ist = datetime.combine(start_date, datetime.min.time())
            end_ist = datetime.combine(end_date, datetime.max.time())
            
            # shift IST → UTC by subtracting 5h30m
            start_utc = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
            end_utc = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)

        query = (
            select(Transaction, Subscription,func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number
                    
                ).label("User") )
            .select_from(Transaction)
            .join(
                Subscription,Subscription.id == Transaction.subscription_id,
            )
            .join(
                Plan,Subscription.plan_id == Plan.id,
            )
            .join(User, User.id == Subscription.user_id)
            .where(and_(Transaction.tx_at >= start_utc if start_date else True,
                Transaction.tx_at <= end_utc if end_date else True),
                Plan.id == plan_id if plan_id else True,
                Plan.name == plan_name if plan_name else True,
                User.id == user_id if user_id else True,
                User.full_name == user_name if user_name else True,
                User.phone_number == phone_no if phone_no else True,
                Transaction.payment_mode == payment_mode if payment_mode else True,
                Transaction.tx_status == status if status else True)
            .order_by(Transaction.id).limit(limit).offset(offset))
            
        transactions = await session.execute(query)
        return transactions.mappings().all()

        


class UserQuotaService(BaseService[UserQuota, UserQuotaCreate, UserQuotaUpdate]):
    async def get_user_quota_consumed(
        self,
        user_id: int,
        subscription_id: int,
        quota_name: str,
        feature_name: str,
        plan_name: str,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ) -> int | None:
        session = db_session 
        query = (
            select(func.sum(self.model.quota_consumed).label("total_quota_consumed"))
            .select_from(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.subscription_id == subscription_id,
                self.model.quota_name == quota_name,
                self.model.feature_name == feature_name,
                self.model.plan_name == plan_name,
                and_(
                    self.model.created_at <= till_date,
                    self.model.created_at > from_date,
                ),
            )
        )
        aggregate_result = await session.execute(query)

        return aggregate_result.scalar()
    
    async def get_user_quota_consumed_lifetime(
        self,
        user_id: int,
        subscription_id: int,
        quota_name: str,
        feature_name: str,
        plan_name: str,
        db_session: AsyncSession | None = None,
    ) -> int | None:
        session = db_session 
        query = (
            select(func.sum(self.model.quota_consumed).label("total_quota_consumed"))
            .select_from(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.subscription_id == subscription_id,
                self.model.quota_name == quota_name,
                self.model.feature_name == feature_name,
                self.model.plan_name == plan_name
            )
        )
        aggregate_result = await session.execute(query)

        return aggregate_result.scalar()

    async def get_all_user_quota_consumed(
        self,
        user_id: int,
        subscription_id: int,
        from_date: date,
        till_date: date,
        db_session: AsyncSession | None = None,
    ) -> list[dict[str, Any]]:
        session = db_session 
        query = (
            select(
                self.model.plan_name,
                self.model.feature_name,
                self.model.quota_name,
                func.sum(self.model.quota_consumed).label("total_quota_consumed"),
            )
            .select_from(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.subscription_id == subscription_id,
                and_(
                    self.model.created_at <= till_date,
                    self.model.created_at >= from_date,
                ),
            )
            .group_by(
                self.model.plan_name, self.model.feature_name, self.model.quota_name
            )
        )
        aggregate_result = await session.execute(query)

        return aggregate_result.all()

    async def get_user_quota_consumed_by_products(
        self,
        user_id: int,
        purchase_id: int,
        product_id: int,
        quota_name: str,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None,
    ) -> int | None:
        session = db_session 
        query = (
            select(func.sum(self.model.quota_consumed).label("total_quota_consumed"))
            .select_from(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.purchase_id == purchase_id,
                self.model.quota_name == quota_name,
                self.model.product_id == product_id,
                and_(
                    self.model.created_at <= till_date if till_date else True,
                    self.model.created_at > from_date if from_date else True,
                ),
            )
        )
        aggregate_result = await session.execute(query)

        return aggregate_result.scalar()

class BranchUserService(BaseService[BranchUser, BranchUserCreate, BranchUserUpdate]):
    async def get_user_branch(self, user_id:int, branch_id:int, db_session: AsyncSession | None = None):
        session = db_session 

        query = (
            select(
                self.model
            )
            .where(BranchUser.user_id == user_id, BranchUser.branch_id == branch_id)
        )
        result = await session.execute(query)

        user_branch = result.scalar_one_or_none()

        return user_branch
    
    async def get_user_branches(self, user_id: int, db_session: AsyncSession | None = None):
        session = db_session

        query = (
            select(BranchUser.branch_id)  # Select only the branch_id
            .where(BranchUser.user_id == user_id)
        )
        result = await session.execute(query)

        branch_ids = result.scalars().all()  # Retrieve all branch_ids associated with the user_id

        return branch_ids
    
class UserRoleService(BaseService[UserRole, UserRoleCreate, UserRoleUpdate]):

    async def get_branches_for_role_user(self, user_id:int, role: USER_ROLE | None = None, db_session: AsyncSession | None = None):
        session = db_session
        query = (
            select(self.model.branch_id).join(Role, Role.id == self.model.role_id).where(Role.role == role if role is not None else True, self.model.user_id == user_id )
        )
        result = await session.execute(query)

        branch_ids = result.scalars().all()

        return branch_ids
    
    async def get_batches_by_branch(self, user_id:int, role: USER_ROLE | None = None, db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (
            select(self.model.branch_id).join(Role, Role.id == self.model.role_id).where(Role.role == role if role is not None else True, self.model.user_id == user_id )
        )
        query = select(Batch.id).where(Batch.branch_id == sub_query.c.branch_id)
       
        result = await session.execute(query)

        batch_ids = result.scalars().all()

        return batch_ids
    
    async def get_products_by_branch(self, user_id:int, role: USER_ROLE | None = None, db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (
            select(self.model.branch_id).join(Role, Role.id == self.model.role_id).where(Role.role == role if role is not None else True, self.model.user_id == user_id )
        )
        query = select(Product.id).where(Product.branch_id == sub_query.c.branch_id)
       
        result = await session.execute(query)

        product_ids = result.scalars().all()

        return product_ids
    
    async def get_batch_ids_by_user_role(self, user_id:int, role: USER_ROLE | None = None, db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (
            select(self.model.branch_id).join(Role, Role.id == self.model.role_id).where(Role.role == role if role is not None else True, self.model.user_id == user_id )
        )
        query = select(Batch.id).select_from(Batch).join(Product,Product.batch_id == Batch.id).where(Product.branch_id == sub_query.c.branch_id)
       
        result = await session.execute(query)

        batch_ids = result.scalars().all()

        return batch_ids
    
    
class RoleService(BaseService[Role, RoleCreate, RoleUpdate]):
    async def get_apps_by_role(self, roles: list[USER_ROLE], db_session: AsyncSession | None = None):
        session = db_session

        if roles:
            query = select(self.model.apps).where(self.model.role.in_(roles))
        else:
            query = select(self.model.apps)
        result = await session.execute(query)

        apps = result.scalars().all()

        return apps

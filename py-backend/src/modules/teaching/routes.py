import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi_async_sqlalchemy import db
from fastcrud import JoinConfig
from src.base.schemas import ResponseListSchema, ResponseSchema

from src.base.service import BaseCRUD
from src.constants import APP
from src.modules.eventlogs.deps import log_event
from src.modules.eventlogs.schemas import EVENT_TYPE
from src.modules.products.models import Purchase
from src.modules.tests.schemas import PlanTaskTestTaken, PlanTestResp, PlanTestTAResp, TestListResponse, TestResponse, TestV2Response
from src.users.deps import CheckV2UserAccess
from src.users.models import User
from src.users.schemas import USER_ROLE, USER_TYPE
from .service import *


studyplan_router = APIRouter(prefix="/studyplan", tags=["StudyPlan"])
studentprod_router = APIRouter(prefix="/students", tags=["StudentProduct"])

studyplan_service = StudyPlanService(StudyPlan, db)
studyplan_crud = BaseCRUD(model=StudyPlan)
plantask_crud = BaseCRUD(model=PlanTask)
studyplanuser_crud = BaseCRUD(model=StudyPlanUser)
plantaskuser_crud = BaseCRUD(model=PlanTaskUser)
purchase_crud = BaseCRUD(model=Purchase)

#studyplan

@studyplan_router.post("", response_model=ResponseSchema[StudyPlanResponse])
async def create_studyplan(*, studyplan_in: StudyPlanCreate, request: Request, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.teacher],apps=[APP.admin_app]))):
    studyplan_db = await studyplan_crud.create(db=db.session,object=studyplan_in)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.STUDYPLAN_CREATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"studyplan_id":studyplan_db.id})

    return ResponseSchema(data=studyplan_db, success=True)

@studyplan_router.put("/{id}",response_model=ResponseSchema[StudyPlanResponse])
async def update_studyplan(*,id:int, studyplan_in:StudyPlanUpdate, request: Request, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.teacher],apps=[APP.admin_app]))):
    studyplan_update = await studyplan_crud.update(db=db.session,id=id,object=studyplan_in)
    studyplan_db = await studyplan_crud.get(id=id, db=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.STUDYPLAN_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"studyplan_id":studyplan_db.id,"updated_data":studyplan_in.model_dump(exclude_unset=True)})

    return ResponseSchema(data=studyplan_db, success=True)

@studyplan_router.get("", response_model=ResponseListSchema[StudyPlanResponse])
async def get_studyplans(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.teacher,USER_ROLE.admission_manager],apps=[APP.admin_app]))):
    if filters:
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    studyplan_db = await studyplan_crud.get_by_filters_multi(db=db.session,filters=filter_data)
    studyplan_count = await studyplan_crud.get_count_by_filters(db=db.session, filters=filter_data)
    return ResponseListSchema(data=studyplan_db, success=True, meta={"count": studyplan_count})

#plantask

@studyplan_router.post("/plantasks", response_model=ResponseSchema[PlanTaskResponse])
async def create_plantask(*,plantask_in:PlanTaskCreate,request: Request, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin,USER_ROLE.teacher],apps=[APP.admin_app]))):
    plan_db = await plantask_crud.create(db=db.session,object=plantask_in)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.PLANTASK_CREATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"plantask_id":plan_db.id,"studyplan_id":plantask_in.studyplan_id})

    return ResponseSchema(data=plan_db, success=True)

@studyplan_router.post("/plantasks/copy")
async def create_plantask_from_product(*,request: Request, plantask_in:PlanTaskCopy,user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce]))):
    studyplans_db = await studyplan_crud.get_by_filters_multi(filters={"product_id":plantask_in.product_id},db=db.session)
    plantasks = []
    old_tasks_ids = [task.id for task in await plantask_crud.get_by_filters_multi(filters={"studyplan_id":plantask_in.studyplan_id},db=db.session)]
    for studyplan in studyplans_db:
        plantasks_db = await plantask_crud.get_by_filters_multi(filters={"studyplan_id":studyplan.id},db=db.session)       
        plantask_data = [
            {
                **{k: v for k, v in task.__dict__.items() if k not in ("id", "_sa_instance_state")},
                "studyplan_id": plantask_in.studyplan_id  # Assign new studyplan_id
            }
            for task in plantasks_db
        ]
        # Perform efficient bulk insert
        plantasks_db = await plantask_crud.bulk_create(db=db.session, objects=plantask_data)
        plantasks.append(plantasks_db)
    created_tasks = await plantask_crud.get_by_filters_multi(
        filters={"studyplan_id": plantask_in.studyplan_id},
        db=db.session
    )
    new_tasks = [created_task for created_task in created_tasks if created_task.id not in old_tasks_ids ]

    # Log PLANTASK_CREATE for each
    for task in new_tasks:
        await log_event(
            db=db.session,
            request=request,
            event_type=EVENT_TYPE.PLANTASK_CREATE,
            event_by_user_id=user.id,
            user_name=user.full_name,
            user_phone=user.phone_number,
            event_details={
                "plantask_id": task.id,
                "studyplan_id": task.studyplan_id,
            }
        )
        
    return plantasks


@studyplan_router.put("/plantasks/{id}",response_model=ResponseSchema[PlanTaskResponse])
async def update_plantask(*,id:int, plantask_in:PlanTaskUpdate, request: Request, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    task_db = await plantask_crud.get(id=id, db=db.session)
    update_data = plantask_in.model_dump(exclude_unset=True)
    for field in ["planned_completion_date", "actual_completion_date"]:
        if field in update_data:
            val = update_data[field]
            if isinstance(val, date) and not isinstance(val, datetime):
                update_data[field] = datetime.combine(val, datetime.min.time(), tzinfo=timezone.utc)
            elif isinstance(val, datetime):
                update_data[field] = val.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    plantask_update = await plantask_crud.update(db=db.session,id=id,object=update_data)
    plantask_db = await plantask_crud.get(id=id, db=db.session)
    #log event
    await log_event(db=db.session,request=request,event_type=EVENT_TYPE.PLANTASK_UPDATE,event_by_user_id=user.id,user_name=user.full_name,user_phone=user.phone_number,event_details={"plantask_id":plantask_db.id,"studyplan_id":plantask_db.studyplan_id,
                                                                                                                                                                                      "before_update_data": json.dumps(jsonable_encoder(task_db)),"updated_data":json.dumps(jsonable_encoder(update_data))})

    return ResponseSchema(data=plantask_db, success=True)

@studyplan_router.get("/plantasks",response_model=ResponseListSchema[PlanTaskResponse])
async def get_plantasks(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    if filters: 
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    plan_db = await plantask_crud.get_multi(db=db.session,**filter_data)
    # plan_db = await plantask_crud.get_joined(
    #     db=db.session,
    #     nest_joins=True,
    #     joins_config=[
    #         JoinConfig(
    #             model=PlanTaskUser,
    #             join_on=PlanTask.id == PlanTaskUser.plantask_id,
    #             schema_to_select=PlanTaskUserResponse,
    #             join_prefix="plantaskuser_",
    #              relationship_type="one-to-many",
    #         )
    #     ],
    #     schema_to_select=PlanTaskWithUsersSchema,
    #     relationship_type="one-to-many",
    #     **filter_data  # <- filters applied dynamically
    # )
    # return plan_db

    return ResponseListSchema(data=plan_db["data"], success=True, meta={"count": plan_db["total_count"]})

@studyplan_router.get("/plantasks/users/{studyplan_id}")
async def get_plantask_with_plantaskusers(studyplan_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tasks = await studyplan_service.get_plantasks_and_plantasksusers(studyplan_id=studyplan_id,db_session=db.session)
    results = [{**item._asdict()} for item in tasks]
    return results
    return tasks


@studyplan_router.delete("/plantasks/{id}")
async def softdelete_plantask(*,id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    plantask = await plantask_crud.update(db=db.session,id=id,object={"is_deleted":True})
    return ResponseSchema(msg="Deleted successfully", success=True,data=plantask)

#studyplan users

@studyplan_router.post("/students", response_model=ResponseSchema[StudyPlanUserResponse])
async def create_studyplanuser(*,studyplanuser_in:StudyPlanUserCreate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    plan_db = await studyplanuser_crud.create(db=db.session,object=studyplanuser_in)
    return ResponseSchema(data=plan_db, success=True)

@studyplan_router.post("/purchases", response_model=ResponseListSchema[StudyPlanUserResponse])

async def create_studyplan_for_purchases(*,studyplanuser_in:PurchaseStudyplanCreate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))): #when studyplan is created assign them to all purchases which bought studyplan's product
    
    purchases = await studyplan_service.get_purchases_enrollments_for_product(product_id=studyplanuser_in.product_id,db_session=db.session)
    results = [{**item._asdict()} for item in purchases]
    print("results>>>>", results)
    studyplan_users = [
        {
            "enrollment_id": studyplan["enrollment_id"],
            "studyplan_id": studyplanuser_in.studyplan_id,
            "purchase_id": studyplan["id"],
            "student_id": studyplan["student_id"],
            "product_id": studyplanuser_in.product_id,
            "status": "ACTIVE"
        }
        for studyplan in results
        ]

    # Perform efficient bulk insert
    studyplan_users_db = await studyplanuser_crud.bulk_create(db=db.session, objects=studyplan_users)

    return ResponseListSchema(data=studyplan_users_db,success=True)

    return results


@studyplan_router.put("/students/{id}",response_model=ResponseSchema[StudyPlanUserResponse])
async def update_studyplan(*,id:int, studyplanuser_in:StudyPlanUserUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    plantask_update = await studyplanuser_crud.update(db=db.session,id=id,object=studyplanuser_in)
    plantask_db = await studyplanuser_crud.get(id=id, db=db.session)
    return ResponseSchema(data=plantask_db, success=True)

@studyplan_router.get("/students", response_model=ResponseListSchema[StudyPlanUserResponse])
async def get_studyplanusers(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    if filters:
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    plan_db = await studyplanuser_crud.get_multi(db=db.session,**filter_data)
    return ResponseListSchema(data=plan_db["data"], success=True, meta={"count": plan_db["total_count"]})

#plantask users

@studyplan_router.post("/plantask/students", response_model=ResponseSchema[PlanTaskUserResponse])
async def create_plantaskusers(*,plantask_in:PlanTaskUserCreate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    plan_db = await plantaskuser_crud.create(db=db.session,object=plantask_in)
    return ResponseSchema(data=plan_db, success=True)

@studyplan_router.post("/plantask/purchases", response_model=ResponseListSchema[PlanTaskUserResponse]) # when purchase happens call create studyplanuser to assign purchase to study plan and call this api to assign all tasks related to tat studyplan to user
async def assign_plantasks_for_purchase(*,plantask_in:PurchasePlantaskCreate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    plantasks = await plantask_crud.get_by_filters_multi(filters={"studyplan_id":plantask_in.studyplan_id,"is_deleted" : False},db=db.session)
    if not plantasks:
        raise HTTPException(status_code=404, detail="No PlanTasks found for the given studyplan_id")
    
    plantask_users = [
        {
            "plantask_id": plantask.id,
            "studyplan_id": plantask.studyplan_id,
            "purchase_id": plantask_in.purchase_id,
            "student_id": plantask_in.student_id,
            "status": TASK_STATUS.open
        }
        for plantask in plantasks
        ]

    # Perform efficient bulk insert
    plantaskusers_db = await plantaskuser_crud.bulk_create(db=db.session, objects=plantask_users)

    return ResponseListSchema(data=plantaskusers_db,success=True)

@studyplan_router.post("/plantask/assign", response_model=ResponseListSchema[PlanTaskUserResponse])# this api is when task is created for studyplan, assign each task to purchases who have same product as studyplan
async def assign_plantask_to_purchases(*, plantask_in:AssignPlantaskUser,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    studyplan_db = await studyplan_crud.get(id=plantask_in.studyplan_id, db=db.session)
    purchases = await purchase_crud.get_by_filters_multi(filters={"product_id":studyplan_db.product_id},db=db.session)
    plantask_users = [
        {
            "plantask_id": plantask_in.plantask_id,
            "studyplan_id": plantask_in.studyplan_id,
            "purchase_id": purchase.id,
            "student_id": purchase.student_id,
            "status": TASK_STATUS.open
        }
        for purchase in purchases
        ]

    # Perform efficient bulk insert
    plantaskusers_db = await plantaskuser_crud.bulk_create(db=db.session, objects=plantask_users)

    return ResponseListSchema(data=plantaskusers_db,success=True)

@studyplan_router.post("/plantask/assign/students", response_model=ResponseListSchema[PlanTaskUserResponse])# this api is when task is created for studyplan, assign each task to purchases who have same product as studyplan
async def assign_plantask_to_purchases(*, plantask_in:AssigntasktoSelectStudents,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    filtered_student_purchases = []
    for item in plantask_in.student_purchases:
        tasks = await plantaskuser_crud.get_by_filters_multi(filters={"plantask_id": plantask_in.plantask_id,
                                                        "studyplan_id": plantask_in.studyplan_id,
                                                        "student_id": item.student_id,
                                                        "purchase_id": item.purchase_id},db=db.session)
        if not tasks:  # Keep only if no matching task exists
            filtered_student_purchases.append(item)
        else:
            await studyplan_service.update_plantaskusers_purids(session=db.session,pur_ids=[item.purchase_id],plantask_id=plantask_in.plantask_id,is_deleted = False) 
    plantask_in.student_purchases = filtered_student_purchases
    plantask_users = [
        {
            "plantask_id": plantask_in.plantask_id,
            "studyplan_id": plantask_in.studyplan_id,
            "purchase_id": purchase.purchase_id,
            "student_id": purchase.student_id,
            "status": TASK_STATUS.open

        }
        for purchase in plantask_in.student_purchases
        ]

    # Perform efficient bulk insert
    plantaskusers_db = await plantaskuser_crud.bulk_create(db=db.session, objects=plantask_users)

    return ResponseListSchema(data=plantaskusers_db,success=True)

@studyplan_router.put("/plantask/students/unassign")
async def unassign_plantaskusers(*,purchase_ids:list[int],plantask_id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.teacher,USER_ROLE.mentor],apps=[APP.admin_app]))):
    await studyplan_service.update_plantaskusers_purids(session=db.session,pur_ids=purchase_ids,plantask_id=plantask_id,is_deleted = True)
    return ResponseSchema(msg="Deleted successfully", success=True)

@studyplan_router.put("/plantask/students/{id}",response_model=ResponseSchema[PlanTaskUserResponse])
async def update_plantaskusers(*,id:int, plantask_in:PlanTaskUserUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    update_data = plantask_in.model_dump(exclude_unset=True)
    for field in ["planned_completion_date", "actual_completion_date"]:
        if field in update_data:
            val = update_data[field]
            if isinstance(val, date) and not isinstance(val, datetime):
                update_data[field] = datetime.combine(val, datetime.min.time(), tzinfo=timezone.utc)
            elif isinstance(val, datetime):
                update_data[field] = val.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    plantask_update = await plantaskuser_crud.update(db=db.session,id=id,object=update_data)
    plantask_db = await plantaskuser_crud.get(id=id, db=db.session)
    return ResponseSchema(data=plantask_db, success=True)

# @studyplan_router.put("/plantask/students/status/{plantask_id}",response_model=ResponseSchema[PlanTaskUserResponse]) # this is when plantask status, update all plantask user status esp when close
# async def update_plantaskusers_status(*,plantask_id:int, status: TASK_STATUS, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
#     plantask_update = await plantaskuser_crud.update({'status': status},db=db.session, plantask_id = plantask_id,allow_multiple=True)
    
#     plantask_db = await plantaskuser_crud.get_by_filters_multi(filters={"plantask_id":plantask_id}, db=db.session)
#     return ResponseSchema(data=plantask_db, success=True)

@studyplan_router.get("/plantask/students", response_model=ResponseListSchema[PlanTaskUserResponse])
async def get_plantaskusers(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    if filters:
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    plan_db = await plantaskuser_crud.get_multi(db=db.session,**filter_data)
    return ResponseListSchema(data=plan_db["data"], success=True, meta={"count": plan_db["total_count"]})

@studyplan_router.post("/plantasks/date")
async def get_plantasks_by_date( plantask: PlanTaskDate,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tasks = await studyplan_service.get_plantasks_by_date(from_date=plantask.from_date, till_date=plantask.till_date, studyplan_id=plantask.studyplan_id,db_session=db.session)
    results = [{**item._asdict()} for item in tasks]
    return results

@studyplan_router.post("/plantasks/products")
async def get_plantasks_by_products( plantask: PlanTaskByProd,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tasks = await studyplan_service.get_plantasks_by_prodids(from_date=plantask.from_date, till_date=plantask.till_date, prod_ids=plantask.prod_ids,db_session=db.session)
    # results = [{**item._asdict()} for item in tasks]
    return tasks

@studyplan_router.post("/plantasks/products/{user_id}/user")
async def get_plantasks_by_purchases( user_id:int,plantask: PlanTaskByPur,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tasks = await studyplan_service.get_user_plantasks_by_purids(user_id=user_id,from_date=plantask.from_date, till_date=plantask.till_date, pur_ids=plantask.pur_ids,db_session=db.session)
    # results = [{**item._asdict()} for item in tasks]
    return tasks

@studyplan_router.get("/plantasks/student/status")
async def get_plantasks_userstatus(status: TASK_STATUS,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    students = await studyplan_service.get_students_by_plantaskstatus(status = status, db_session=db.session)
    results = [{**item._asdict()} for item in students]
    return results

@studyplan_router.delete("/plantask/students/{plantask_id}")
async def softdelete_plantaskusers(*,plantask_id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin],apps=[APP.admin_app]))):
    plantaskusers_delete = await plantaskuser_crud.update(db=db.session,plantask_id=plantask_id,object={"is_deleted":True},allow_multiple=True)
    return ResponseSchema(msg="Deleted successfully", success=True)

# student app 

@studentprod_router.put("/plantask/tests", response_model=ResponseListSchema[PlanTestResp])
async def get_plantask_student_tests(task_test:StudentTasksTests,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student])) ):
    tests = await studyplan_service.get_tests_for_student(student_id=task_test.student_id,exam_id=task_test.exam_id,stage_ids=task_test.stage_ids,paper_ids=task_test.paper_ids,subject_ids=task_test.subject_ids,topic_ids=task_test.topic_ids,offset=task_test.offset,limit=task_test.limit , status = task_test.task_status,db_session=db.session)
    return ResponseListSchema(data=tests, success=True)

@studentprod_router.put("/plantask/tests/prelims/new", response_model=ResponseListSchema[PlanTestResp])
@studentprod_router.put("/plantask/tests/mains/new", response_model=ResponseListSchema[PlanTestResp])
async def get_new_tasks_tests(task_test:TasksNewTests,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tests = await studyplan_service.get_student_new_tasks_tests(user_id=task_test.student_id,exam_id=task_test.exam_id,stage_ids=task_test.stage_ids,paper_ids=task_test.paper_ids,subject_ids=task_test.subject_ids,topic_ids=task_test.topic_ids,offset=task_test.offset,limit=task_test.limit ,db_session=db.session)
    return ResponseListSchema(data=tests, success=True)

@studentprod_router.put("/plantask/tests/prelims/attempted/status", response_model=ResponseListSchema[PlanTestTAResp])
@studentprod_router.put("/plantask/tests/mains/attempted/status", response_model=ResponseListSchema[PlanTestTAResp])
async def get_tasks_tests_by_attempt_status(task_test:TasksAttemptTests,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tests = await studyplan_service.get_tasks_tests_by_attempt_status(user_id=task_test.student_id,test_attempt_mode=task_test.test_attempt_mode,exam_id=task_test.exam_id,stage_ids=task_test.stage_ids,paper_ids=task_test.paper_ids,subject_ids=task_test.subject_ids,topic_ids=task_test.topic_ids,is_evaluated=task_test.is_evaluated,offset=task_test.offset,limit=task_test.limit , status = task_test.attempt_status,db_session=db.session)
    return ResponseListSchema(data=tests, success=True)


@studentprod_router.get("/plantask/tests/taken",response_model=ResponseListSchema[dict])
async def get_plantask_student_tests(student_id:int,product_id:int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    tests = await studyplan_service.get_tests_taken_for_student(student_id=student_id, product_id = product_id ,db_session=db.session)
    return ResponseListSchema(data=tests, success=True)

@studentprod_router.get("/products")
async def get_student_products(student_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    prods = await studyplan_service.get_user_products_with_studyplans(student_id=student_id, db_session=db.session)
    print("len>>>", len(prods))
    return prods

@studentprod_router.get("/purchase/{purchase_id}") # by purchase_id
async def get_student_product(student_id:int,purchase_id:int,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    prods = await studyplan_service.get_user_product_with_studyplans(student_id=student_id,purchase_id=purchase_id, db_session=db.session)
    print("len>>>", len(prods))
    return prods


@studentprod_router.get("/products/upcoming")
async def get_upcoming_products(student_id:int,prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    prods = await studyplan_service.get_user_products_with_studyplans_upcoming(student_id=student_id,
                                                                               prod_name=prod_name,prod_code=prod_code,
                                                                                offering_name=offering_name,
                                                                                offering_category=offering_category,
                                                                                offering_id=offering_id,branch_id=branch_id,
                                                                                  db_session=db.session)
    print("len>>>", len(prods))
    return prods

@studentprod_router.get("/products/inprogress")
async def get_inprogress_products(student_id:int,prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    prods = await studyplan_service.get_user_products_with_studyplans_inprogress(student_id=student_id,
                                                                                 prod_name=prod_name,prod_code=prod_code,
                                                                                offering_name=offering_name,
                                                                                offering_category=offering_category,
                                                                                offering_id=offering_id,branch_id=branch_id, db_session=db.session)
    print("len>>>", len(prods))
    return prods

@studentprod_router.get("/products/completed")
async def get_completed_products(student_id:int,prod_name: str | None = None,prod_code: str | None = None,offering_name:str| None = None,offering_category: str| None = None,branch_id:int| None = None,offering_id:int | None = None,current_user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce, USER_TYPE.student]))):
    prods = await studyplan_service.get_user_products_with_studyplans_completed(student_id=student_id,
                                                                                prod_name=prod_name,prod_code=prod_code,
                                                                                offering_name=offering_name,
                                                                                offering_category=offering_category,
                                                                                offering_id=offering_id,branch_id=branch_id, db_session=db.session)
    print("len>>>", len(prods))
    return prods

# @studentprod_router.get("/products/count/student")
# async def get_products_count_for_student(student_id:int):
#     count = await studyplan_service.get_count_by_filters()




                        


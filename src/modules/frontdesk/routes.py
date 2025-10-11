from datetime import time, timedelta
from io import BytesIO
import json
from typing import Any
from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi_async_sqlalchemy import db
from pypdf import PdfReader, PdfWriter
import requests
from sqlalchemy import cast, update
from src.base.schemas import ResponseSchema,ResponseListSchema,ResponsePaginatedSchema
from src.base.service import BaseCRUD
from fastcrud import JoinConfig, FilterConfig
from src.constants import APP
from src.modules.products.models import Purchase
from src.tenants.models import Branch

from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE, UserEnrolledResponse
from .models import *
from .schemas import *
from src.users.routesv2 import user_role_service, user_service
from src.users.models import User
from fastapi.responses import JSONResponse
import base64
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from .deps import colleges_and_universities_list
from src.users.routesv2 import user_service
import pytz

frontdesk_router = APIRouter(tags=["FrontDesk V2"])

walkin_crud = BaseCRUD(model= Walkin)
admission_crud = BaseCRUD(model= Admission)
purchase_crud = BaseCRUD(model= Purchase)
masterdata_crud = BaseCRUD(model=MasterData)


@frontdesk_router.post("/walkins")
async def create_walkin(*, walkin: WalkinCreate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.student], apps=[APP.front_desk_app]))):
    walkin_db = await walkin_crud.create(db=db.session,object=WalkinUpdate(**walkin.model_dump(exclude_unset=True),user_id=user.id))
    return ResponseSchema(data=jsonable_encoder(walkin_db), success=True)

@frontdesk_router.put("/walkins", response_model=ResponseListSchema[WalkinResponse])
async def update_walkin_masterdata(*, walkin: WalkinMasterDataUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.org_admin,USER_ROLE.branch_admin,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor] ,apps=[APP.front_desk_app]))):
    if walkin.is_college:
        walkins = await user_service.get_walkins_by_college_university(old_name=walkin.old_name,new_name=walkin.new_name,is_college = True, db=db.session)
    else:
        walkins = await user_service.get_walkins_by_college_university(old_name=walkin.old_name,new_name=walkin.new_name,is_college = False, db=db.session)
    return ResponseListSchema(data=walkins, success=True)

@frontdesk_router.put("/walkins/{id}", response_model=ResponseSchema[WalkinResponse])
async def update_walkin(*, id:int, walkin: WalkinUpdate, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.admission_manager,USER_ROLE.admission_counsellor] ,apps=[APP.front_desk_app]))):
    walkin_in: WalkinResponse = await walkin_crud.get(db=db.session,id=id)
    if user.user_type == USER_TYPE.student:
        if  walkin_in.user_id != user.id:
            return ResponseSchema(msg = "user doesn't have access to update other's walkin")
    walkin_update_db = await walkin_crud.update(db=db.session,id=id,object=walkin)
    walkin_db = await walkin_crud.get(db=db.session,id=id)
    return ResponseSchema(data=walkin_db, success=True)

@frontdesk_router.get("/walkins/search", response_model=ResponseListSchema[WalkinResponse])
async def get_walkins_by_name_phno(*,name:str|None = None , phno:str|None = None):
    walkins = await user_service.get_walkins_by_user_name_phno(name=name,phno=phno,db_session=db.session)
    return ResponseListSchema(data=walkins, success=True)

@frontdesk_router.get("/walkins/by/count")
async def get_walkins_by_count(*,is_repeat: bool,limit: int | None = None, 
                                offset: int | None = None,phone_number: str | None = None,user_name:str | None = None,email:str | None = None):
    walkins = await user_service.get_walkins_by_count(is_repeat=is_repeat,offset=offset,limit=limit,phone_number=phone_number,user_name=user_name,email=email,db_session=db.session)
    return walkins
  
@frontdesk_router.get("/walkins/{id}", response_model=ResponseSchema[WalkinResponse])
async def get_walkin(*,id:int, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app]))):
    walkin_db = await walkin_crud.get(db=db.session,id=id)
    return ResponseSchema(data=walkin_db, success=True)

@frontdesk_router.get("/walkins", response_model=ResponseListSchema[WalkinResponse])
async def get_walkins_with_filters(*, filters: Any | None = None,limit:int|None = None, offset:int | None = None,start_date:date| None = None, end_date:date|None = None,status: str | None = None,
                                   user_name: str| None = None, phone_number: str| None = None,email: str| None = None,user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator,
                                                                                                                                             USER_ROLE.mentor,USER_ROLE.teacher,USER_ROLE.evaluation_evaluator,
                                                                                                                                             USER_ROLE.evaluation_coordinator,USER_ROLE.evaluation_reviewer],apps=[APP.front_desk_app,APP.teaching_app]))):
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 

    clause = []

    if start_date and end_date:
            ist = pytz.timezone("Asia/Kolkata")
            # Convert UTC date to IST date
            start_ist_date = datetime.combine(start_date, time.min).replace(tzinfo=pytz.utc).astimezone(ist).date()
            end_ist_date = datetime.combine(end_date, time.min).replace(tzinfo=pytz.utc).astimezone(ist).date()

            # Full IST day range
            start_ist = ist.localize(datetime.combine(start_ist_date, time.min))
            end_ist = ist.localize(datetime.combine(end_ist_date + timedelta(days=1), time.min))

            # Convert back to UTC for DB comparison
            start_utc = start_ist.astimezone(pytz.utc)
            end_utc = end_ist.astimezone(pytz.utc)
            clause.append(Walkin.created_at.between(start_utc, end_utc))
    if status:
            clause.append(Walkin.status == status)
    if user_name:
        clause.append(
            cast(Walkin.profile_details.op("->>")("name"), String).ilike(f"%{user_name}%")
        )
    if phone_number:
        clause.append(
            cast(Walkin.profile_details.op("->>")("phone_number"), String) == phone_number
        )
    if email:
        clause.append(
            cast(Walkin.profile_details.op("->>")("email"), String).ilike(f"%{email}%")
        )
    if user.user_type == USER_TYPE.student:
        walkins = await walkin_crud.get_by_filters_multi_desc(db=db.session, filters=filter_data,clause_statements=clause if clause else None, attr="user_id", ids=[user.id],skip=offset,limit=limit)
        # walkin_count = await walkin_crud.get_count_by_filters(db=db.session, filters=filter_data)
    else:
        walkins = await walkin_crud.get_by_filters_multi_desc(db=db.session, filters=filter_data,clause_statements=clause if clause else None,skip=offset,limit=limit)
        # walkin_count = await walkin_crud.get_count_by_filters(db=db.session, filters=filter_data)
    return ResponseListSchema(data=walkins, success=True)
   

@frontdesk_router.get("/institutions")
async def get_colleges_and_universities(institution_type:INSTITUTION_TYPE, user: User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce,USER_TYPE.student],roles=[USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app]))):
    return ResponseSchema(data=colleges_and_universities_list[institution_type],success=True)

@frontdesk_router.post("/masterdata")
async def add_masterdata(master_data_in:MasterDataSchema):
    masterdata_db = await masterdata_crud.create(object=master_data_in, db=db.session)
    return masterdata_db

@frontdesk_router.put("/masterdata/{id}")
async def update_masterdata(id:int,master_data_update:MasterDataUpdateSchema):
    # masterdata = MasterData(category= master_data_update.category, value = master_data_update.value)
    masterdata_db = await masterdata_crud.update(object=master_data_update,id=id, db=db.session)
    masterdata_updated = await masterdata_crud.get(id=id,db=db.session)
    # return ResponseSchema(data=masterdata_db,success=True)
    return masterdata_updated

@frontdesk_router.get("/masterdata/filters")
async def get_masterdata_by_filters(filters:Any | None = None ):
    if filters:
        filter_data = json.loads(filters)
    else:
        filter_data = {} 
    masterdata_db = await masterdata_crud.get_multi(db=db.session,**filter_data)

    return ResponseListSchema(data=masterdata_db["data"], success=True, meta={"count": masterdata_db["total_count"]})


@frontdesk_router.get("/masterdata/{category}")
async def get_masterdata_by_category(category:str):
    masterdata_db = await masterdata_crud.get_by_filters_multi(filters={"category":category},db=db.session)
    # masterdata_db=  await user_service.get_values_masterdata(category=category,db_session=db.session)
    return masterdata_db
    # return ResponseListSchema(data=masterdata_db,success=True)


@frontdesk_router.delete("/masterdata/{id}")
async def delete_masterdata(id:int):
    
    masterdata = await  masterdata_crud.get_by_filters_multi(ids=[id], attr="sub_category", db=db.session)
    if masterdata:
        await db.session.execute(
                update(MasterData)
                .where(MasterData.sub_category == id)
                .values(sub_category=None)
            )
        await db.session.commit() 
        #  return ResponseSchema(msg="Data value is linked to subcategory", success=False)
    delete_in_db = await masterdata_crud.delete(id=id, db=db.session)
    return ResponseSchema(data=delete_in_db, success=True)

@frontdesk_router.get("/walkins/masterdata/count")
async def get_walkins_masterdata_count(category: str,name: str | None = None, verified:bool | None = None,offset:int | None = None, limit: int | None = None):
    walkins = await user_service.get_walkins_masterdata_count(category=category,name=name,verified=verified,offset=offset,limit=limit,db_session=db.session)
    return walkins

@frontdesk_router.post("/admissions", response_model=ResponseSchema[AdmissionResponse])
async def create_admission(*, admission: AdmissionCreate, user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app,APP.student_app]))):
    admission_db = await admission_crud.create(db=db.session,object=admission)
    return ResponseSchema(data=admission_db, success=True)
     
@frontdesk_router.put("/admissions/{id}", response_model=ResponseSchema[AdmissionResponse])
async def update_admission(*, id:int, admission: AdmissionUpdate, user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app]))):
    admission_update_db = await admission_crud.update(db=db.session,id=id,object=admission)
    admission_db = await admission_crud.get(db=db.session,id=id)
    return ResponseSchema(data=admission_db, success=True)
     
@frontdesk_router.get("/admissions/{id}", response_model=ResponseSchema[AdmissionResponse])
async def get_admission(*,id:int, user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor,USER_ROLE.student_administrator],apps=[APP.front_desk_app]))):
    admission_db = await admission_crud.get(db=db.session,id=id)
    return ResponseSchema(data=admission_db, success=True)

@frontdesk_router.put("/admissions/{id}/cancel", response_model=ResponseSchema[AdmissionResponse])
async def cancel_admission(*, id:int,  user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app]))):
    admission_db = await admission_crud.get(db=db.session,id=id)
    if admission_db.status not in {
    WALKIN_STATUS.closed_w_admission,
    WALKIN_STATUS.closed_w_booking,
    WALKIN_STATUS.closed_w_provisional_admission, WALKIN_STATUS.closed_w_admission_signed }:
        return ResponseSchema(msg="Student not admitted ")
    admission_update = await admission_crud.update(db=db.session,id=id,object={"status":WALKIN_STATUS.cancelled})
    admission_update_db = await admission_crud.get(db=db.session,id=id)
    return ResponseSchema(data=admission_update_db, success=True)

@frontdesk_router.get("/admissions", response_model=ResponseListSchema[AdmissionResponse])
async def get_admissions_with_filters(*, filters: Any | None = None, user: User = Depends(CheckV2UserAccess(roles=[USER_ROLE.front_desk_executive,USER_ROLE.admission_manager,USER_ROLE.admission_counsellor],apps=[APP.front_desk_app]))):
    if filters:
            filter_data = json.loads(filters)
    else:
            filter_data = {} 
        
    admissions = await admission_crud.get_by_filters_multi(db=db.session, filters=filter_data)
    admission_count = await admission_crud.get_count_by_filters(db=db.session, filters=filter_data)
    return ResponseListSchema(data=admissions, success=True,meta={"count":admission_count})

@frontdesk_router.post("/forms/walkin")
async def get_walkin_form(*, walkin_id:int, walkin_type: WALKIN_TYPE):

    def format_date(date_str):
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime = date_str.astimezone(ist_timezone)
            formatted_date = ist_datetime.strftime("%Y-%m-%d")
            formatted_time = ist_datetime.strftime("%I:%M %p")
            return formatted_date,formatted_time
    walkin = await walkin_crud.get(id=walkin_id, db=db.session)
    walkin_category = walkin.walkin_category
    file_loader = FileSystemLoader('src/templates/frontdesk_templates')
    env = Environment(loader=file_loader)
    if walkin_category and walkin_category == WALKINFORM_TYPE.foundation_course:
         template = env.get_template('foundational_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.interview_guidance_program:
         template = env.get_template('interview_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.optional:
         template = env.get_template('optional_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.mentorship:
         template = env.get_template('mentorship_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.ias_or_degree:
         template = env.get_template('degree_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.value_addition_or_state_exams:
         template = env.get_template('value_addn_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.intermediate:
         template = env.get_template('intermediate_walkinform.html')
    elif walkin_category and walkin_category == WALKINFORM_TYPE.school:
         template = env.get_template('school_walkinform.html')
    elif walkin_type and walkin_type == WALKIN_TYPE.full :
        template = env.get_template('walkin_form.html')
    elif walkin_type and walkin_type == WALKIN_TYPE.quick:
        template = env.get_template('quick_walkin_form.html')
    else:
         return "Please enter correct walkin type"
         
    formatted_date, formatted_time = format_date(walkin.created_at)
    
    data = {"walkin":walkin, "walkin_date":formatted_date,"datetime":datetime, "walkin_time":formatted_time,"interested_offering_category": walkin.profile_details.get("interested_offering_category") or "N/A"}

    output = template.render(data)
    if walkin_category and walkin_category == WALKINFORM_TYPE.interview_guidance_program:
        urls = []

        daf1 = walkin.daf_details.get("daf1_file_url", {})
        if daf1.get("link"):
            urls.append(daf1["link"])

        daf2 = walkin.daf_details.get("daf2_file_url", {})
        if daf2.get("link"):
            urls.append(daf2["link"])

        others = walkin.daf_details.get("others", [])
        if isinstance(others, list):
            for url in others:
                if isinstance(url, dict) and url.get("link"):
                    urls.append(url["link"])
        prev_scripts = walkin.previous_transcripts
        if isinstance(prev_scripts, list):
            for item in prev_scripts:
                if isinstance(item, dict):
                    doc = item.get("document")
                    if isinstance(doc, dict) and doc.get("link"):
                        urls.append(doc["link"])
             

        generated_pdf = HTML(string=output, base_url='.').write_pdf()

        # 2. Load WeasyPrint PDF
        generated_reader = PdfReader(BytesIO(generated_pdf))
        writer = PdfWriter()

        # Step 4: Add pages from the generated PDF
        for page in generated_reader.pages:
            writer.add_page(page)

        for url in urls:
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    external_reader = PdfReader(BytesIO(response.content))
                    for page in external_reader.pages:
                        writer.add_page(page)
            except Exception as e:
                print(f"Failed to fetch or parse PDF from {url}: {e}")

        # 5. Write to memory
        merged_pdf_stream = BytesIO()
        writer.write(merged_pdf_stream)
        merged_pdf_stream.seek(0)

        # 6. Encode
        pdf_encoded = base64.b64encode(merged_pdf_stream.read()).decode("utf-8")

        return {"form_name": "Frontdesk Form", "data": pdf_encoded}
    else:
        pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

        pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

        return {"form_name":"Frontdesk Form","data": pdf_encoded}


@frontdesk_router.post("/forms/admission")
async def get_admission_form(*,admission_id:int):
    admission = await admission_crud.get(id=admission_id,db=db.session)
    if not admission:
        return ResponseSchema(msg="Admission with the admission id doesn't exist")
    walkin = await walkin_crud.get_by_field(value=admission.id,field="admission_id", db=db.session)
    if not walkin:
        return ResponseSchema(msg="Walkin with the admission id doesn't exist")
    purchases = await purchase_crud.get_by_filters_multi(filters={"admission_id":admission.id},db=db.session)
    pur = await user_service.get_purchases_with_product_data(admission_id=admission.id,db_session=db.session)
    total_purchase_amt = sum(purchase.amount for purchase in purchases)

    net_amt = sum(
    next((installment.installment_amount for installment in purchase.purchase_installments if installment.transaction_id), purchase.total_amount)
    for purchase in purchases
    )

    disc_amt1 = sum(
    purchase.discount_amount 
    for purchase in purchases
    )
    disc_amt2 = sum(
    purchase.additional_disc_amt 
    for purchase in purchases
    )
    status = {"NEW": "New",
            "SAVED": "Saved",
            "CREATED": "Created",
            "COUNSELLING_COMPLETED": "Counselling Completed",
            "CLOSED_WITH_ADMISSION": "Closed with Admission",
            "CLOSED_WITH_ADMISSION_SIGNED": "Closed with Admission Signed",
            "CLOSED_WITHOUT_ADMISSION": "Closed without Admission",
            "CLOSED_WITH_BOOKING": "Closed with Booking",
            "CLOSED_WITH_PROVISIONAL_ADMISSION": "Closed with Provisional Admission"
     }
    def format_date(date_str):
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime = date_str.astimezone(ist_timezone)
            formatted_date = ist_datetime.strftime("%Y-%m-%d")
            formatted_time = ist_datetime.strftime("%I:%M %p")
            return formatted_date,formatted_time
    file_loader = FileSystemLoader('src/templates/frontdesk_templates')
    env = Environment(loader=file_loader)
    template = env.get_template('admission_form.html')
    formatted_date, formatted_time = format_date(admission.created_at)
    data = {"admission":admission,"purchases":pur,"walkin":walkin,"status":status.get(admission.status),
            "total_purchase_amt":total_purchase_amt,"discount_amt":disc_amt1 + disc_amt2,"net_amt":net_amt,
              "admission_date":formatted_date, "admission_time":formatted_time}

    output = template.render(data)
    pdf_fileobj = HTML(string=output, base_url='.').write_pdf()

    pdf_encoded = base64.b64encode(pdf_fileobj).decode("utf-8")

    return {"form_name":"Admission Form","data": pdf_encoded}
    

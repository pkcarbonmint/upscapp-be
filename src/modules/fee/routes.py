from fastapi import APIRouter, Depends
from src.constants import APP
from src.modules.contentmgnt.schemas import CATEGORY
from src.modules.fee.schemas import *
from src.modules.products.models import Purchase,Offering
from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE
from .service import *
from fastapi_async_sqlalchemy import db
from src.external.cms.service import get_content_count_by_category


fee_router = APIRouter(prefix="/finance",tags=["Finance"])

purchase_service = PurchaseService(Purchase,db)

@fee_router.get("/fees/summary")
async def get_fee_by_date(*,from_date: date,
        till_date: date, branch_id:int | None = None, offering_id:int | None = None,batch_id:int| None = None,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director,USER_ROLE.finance_report_user,USER_ROLE.finance_manager],apps=[APP.dashboard_app]))):
        
     amounts = await purchase_service.get_all_fees(from_date=from_date,till_date=till_date,branch_id=branch_id,offering_id=offering_id,batch_id=batch_id,db_session=db.session)
     return amounts

@fee_router.get("/offerings/summary")
async def get_offerings_fees_by_date_window(*,from_date: date,
        till_date: date,branch_id:int | None = None,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app]))):
     offering_fees = await purchase_service.get_offerings_fee_by_date_window(from_date=from_date,till_date=till_date,branch_id=branch_id,db_session=db.session)
     return offering_fees

@fee_router.get("/branch/summary")
async def get_branches_fees_by_date_window(from_date: date,
        till_date: date,offering_id :int | None = None,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app]))):

    purchases = await purchase_service.get_branch_fee_by_date_window(from_date=from_date,till_date=till_date,offering_id=offering_id,db_session=db.session)

    return purchases
     

@fee_router.post("/day/report")
async def get_day_report(report_in:DayReportSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director,USER_ROLE.collection_done_report_user,USER_ROLE.finance_manager],apps=[APP.dashboard_app]))):
     reports = await purchase_service.get_day_report(from_date=report_in.from_date,till_date=report_in.till_date,branch_ids=report_in.branch_ids,offering_id=report_in.offering_id,batch_id=report_in.batch_id,legal_entity=report_in.legal_entity,payment_mode=report_in.payment_mode,include_incomplete_txs=report_in.include_incomplete_txs,is_online_branch=report_in.is_online_branch,plan_name=report_in.plan_name,limit = report_in.limit,offset = report_in.offset,db_session=db.session)
     results = [{**item._asdict()} for item in reports]
     # count = 0
     # if report_in.get_collection_count:
     #      count = await purchase_service.total_collection_day_report(from_date=report_in.from_date,till_date=report_in.till_date,branch_ids=report_in.branch_ids,offering_id=report_in.offering_id,batch_id=report_in.batch_id,is_online_branch=report_in.is_online_branch,legal_entity=report_in.legal_entity,payment_mode=report_in.payment_mode,db_session=db.session)

     return {"report": results}

@fee_router.post("/walkins/filter")
async def get_walkins_by_filter(*,walkin_filter: WalkinFilterSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app]))):
     
    walkins = await purchase_service.get_walkins_by_filter(by_branch=walkin_filter.by_branch, by_counsellor=walkin_filter.by_counsellor,
                                                           by_offering=walkin_filter.by_offering, by_probability=walkin_filter.by_probability,
                                                           by_college=walkin_filter.by_college, by_district=walkin_filter.by_district, by_parent_occ=walkin_filter.by_parent_occ, by_source=walkin_filter.by_source,
                                                           by_spec=walkin_filter.by_spec, by_uni=walkin_filter.by_uni,
                                                           from_date=walkin_filter.from_date,till_date=walkin_filter.till_date,by_date=walkin_filter.by_date,
                                                           branch_name=walkin_filter.branch_name,
                                                           offering_name=walkin_filter.offering_name,by_reason=walkin_filter.by_reason,by_competitor=walkin_filter.by_competitor,db_session=db.session)
    return walkins

@fee_router.post("/admissions/filter")
async def get_admissions_by_filter(*, admission_filter: AdmissionFilterSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app]))):
    
     
    admissions = await purchase_service.get_admissions_by_filter(by_branch=admission_filter.by_branch,by_batch=admission_filter.by_batch,
                                                                 by_counsellor=admission_filter.by_counsellor, by_college=admission_filter.by_college, by_district=admission_filter.by_district, by_parent_occ=admission_filter.by_parent_occ, by_source=admission_filter.by_source,
                                                           by_spec=admission_filter.by_spec, by_uni=admission_filter.by_uni,
                                                                 branch_id=admission_filter.branch_id,batch_id=admission_filter.batch_id,offering_id=admission_filter.offering_id,by_probability=admission_filter.by_probability,
                                                                 by_offering=admission_filter.by_offering,from_date=admission_filter.from_date,by_date=admission_filter.by_date,till_date=admission_filter.till_date,db_session=db.session)
    return admissions
     
@fee_router.post("/walkin/admission/avgdays")
async def get_avg_days_walkin_to_admission(walkin_admission_filter: AvgDaysFilterSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app])) ):
     avg_days = await purchase_service.get_avg_days_walkin_to_admission(from_date=walkin_admission_filter.from_date,till_date=walkin_admission_filter.till_date,
                                                                        branch_id=walkin_admission_filter.branch_id,batch_id=walkin_admission_filter.batch_id,
                                                                        offering_id=walkin_admission_filter.offering_id,db_session=db.session)
     return avg_days

     
@fee_router.post("/uncollected")
async def get_uncollected_amt(*,
        branch_id: int | None = None,
        batch_id: int | None = None,
        offering_id: int | None = None,
        from_date: date | None = None,
        till_date: date | None = None,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director,USER_ROLE.finance_manager,USER_ROLE.finance_report_user],apps=[APP.dashboard_app]))):
     
     # revised date is the running dates which has both is_original true and false, take from installment_date date and installment_amount to calc to be collected amount(by transaction_id NONE) and dates
     # unrevised date is from only is_original true, is_deleted false, and consider only original_installment_amount and original_installment_date to calc to be collected amount(by transaction_id NONE) and dates
     uncollected_amount = await purchase_service.get_uncollected_amt(batch_id=batch_id,branch_id= branch_id,offering_id=offering_id,from_date=from_date,till_date=till_date,db_session=db.session)
     return uncollected_amount

@fee_router.get("/content/count")
async def get_content_count(*,category: CATEGORY | None = None, is_external: bool | None = None,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director],apps=[APP.dashboard_app]))):
     count = await get_content_count_by_category(category = category, is_external = is_external)
     return count

@fee_router.post("/due/count")
async def get_due_report(due_count:DueCountSchema,user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director,USER_ROLE.fee_collection_incharge],apps=[APP.dashboard_app,APP.front_desk_app]))):
     count = await purchase_service.get_due_report(from_date=due_count.from_date,till_date=due_count.till_date,branch_id=due_count.branch_id,
                                                   offering_id=due_count.offering_id,batch_id=due_count.batch_id,legal_entity=due_count.legal_entity,
                                                   student_name=due_count.student_name,student_phoneno=due_count.student_phoneno,
                                                     installment_date=due_count.installment_date,db_session=db.session)
     return count

@fee_router.post("/fee/followup")
async def get_fee_followup(*,fee_followup:FeeFollowupSchema, user:User = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce],roles=[USER_ROLE.director,USER_ROLE.due_report_user,USER_ROLE.finance_manager, USER_ROLE.fee_collection_incharge],apps=[APP.dashboard_app,APP.front_desk_app]))):
     fees = await purchase_service.get_fee_follow_up(from_date=fee_followup.from_date,till_date=fee_followup.till_date,legal_entity=fee_followup.legal_entity,
                                                     branch_id=fee_followup.branch_id,offering_id=fee_followup.offering_id,
                                                     batch_id=fee_followup.batch_id,db_session=db.session,limit=fee_followup.limit,
                                                     offset=fee_followup.offset,student_name=fee_followup.student_name,student_phoneno=fee_followup.student_phoneno,
                                                     installment_date=fee_followup.installment_date)
     
     return fees

@fee_router.get("/student/upcoming/installments")
async def get_student_upcoming_installments(student_id:int,upto_date:date):
     upcoming = await purchase_service.get_upcoming_installments_by_student_id(student_id=student_id,upto_date=upto_date,db_session = db.session)
     return upcoming
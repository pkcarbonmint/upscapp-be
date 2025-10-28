from collections import defaultdict
import pytz
from src.base.service import BaseService
from src.modules.fee.deps import ist_range_to_utc
from src.modules.products.models import Offering, Product, Purchase, PurchaseInstallment,Batch
from src.tenants.models import Branch
from src.users.models import User, Transaction
from .models import *
from .schemas import *
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    ClauseElement, Date, Float, extract, literal, select,DECIMAL,
    or_,
    and_,
    desc,
    asc,
    func,
    literal_column,
    text,
    case,
    update,
    outerjoin,
    column,
    cast,
    join,
    Numeric,
    distinct,true
)
from datetime import timedelta, timezone
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import aliased


class WalkinService(BaseService[Walkin, WalkinCreate, WalkinUpdate]):

    async def get_counselling_details(
        self, 
        offset: int = 0,
        limit: int = 10,
        counsellor_name: str | None = None, 
        counselling_date: date | None = None,
        from_date: date | None = None,
        till_date: date | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session

        counsellor_expr = cast(Walkin.counselling.op("->>")("counsellor_name"), String)
        counsellor_expr_id = cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        counselling_date_expr = cast(Walkin.counselling.op("->>")("counselling_date"), Date)

        query = (
            select(
                func.count(Walkin.id).label("counselling_count"),
                func.count(Admission.walkin_id).label("admissions_count"),
                User.full_name.label("counsellor_name"),
                counselling_date_expr.label("counselling_date"),
            )
            .select_from(Walkin)
            .join(Admission, Admission.walkin_id == Walkin.id)
            .outerjoin(User,User.id == counsellor_expr_id)
            .where(Walkin.counselling.isnot(None), 
                   func.json_typeof(Walkin.counselling) != "null",
                   counselling_date_expr.between(from_date,till_date))
        )

        # add dynamic filters
        if counselling_date:
            query = query.where(counselling_date_expr == counselling_date)
        if counsellor_name:
            query = query.where(User.full_name == counsellor_name)

        query = query.group_by(counselling_date_expr,User.full_name)
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)

        walkins = await session.execute(query)
        return walkins.mappings().all()

    async def get_admission_summary(self,user_id:int | None = None,
                                        student_name: str | None = None,
                                        ph_no: str | None = None,
                                        branch_name: str | None = None,
                                        offering_category: str | None = None,
                                        offering_name: str | None = None,
                                        prod_name: str | None = None,
                                        prod_code: str | None = None,
                                        admission_id: int | None = None,
                                        from_date: date | None = None,
                                        till_date: date | None = None,
                                        limit: int | None = None, offset: int | None = None,db_session: AsyncSession | None = None):
        session = db_session
        sub_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED",
                                Purchase.student_id == user_id if user_id else True,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        query = (
        select(sub_query.c.due_amount,Purchase,Product,Admission)
        .select_from(Purchase)
        .join(Product, Purchase.product_id == Product.id)
        .join(Offering, Offering.id == Product.offering_id)
        .join(Admission,Admission.id == Purchase.admission_id)
        .join(User, User.id == Purchase.student_id)
        .outerjoin(Branch, Branch.id == Admission.branch_id )
        .outerjoin(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
        .outerjoin(sub_query, sub_query.c.purchase_id == Purchase.id)
        .where(Purchase.student_id == user_id if user_id else True,
                User.full_name.ilike(f"%{student_name}%") if student_name else True,
                User.phone_number == ph_no if ph_no else True,
                Branch.name == branch_name if branch_name else True,
                Offering.offering_category == offering_category if offering_category else True,
                Offering.name == offering_name if offering_name else True,
                Product.name.ilike(f"%{prod_name}%") if prod_name else True,
                Product.code.ilike(f"%{prod_code}%") if prod_code else True,
                Admission.id == admission_id if admission_id else True,
                func.date(Admission.admission_date).between(from_date,till_date),
                or_(PurchaseInstallment.is_deleted == False,
                PurchaseInstallment.is_deleted == None))
        
        .distinct(Purchase.id)
        .order_by(Purchase.id.desc()))
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        # .offset(offset).limit(limit))
        result = await session.execute(query)
        purchases = result.mappings().all()
        return purchases
    
    async def get_to_be_realized(self,
                                user_id:int | None = None,
                                student_name: str | None = None,
                                ph_no: str | None = None,
                                branch_name: str | None = None,
                                offering_category: str | None = None,
                                offering_name: str | None = None,
                                prod_name: str | None = None,
                                prod_code: str | None = None,
                                admission_id: int | None = None,
                                from_date: date | None = None,
                                till_date: date | None = None ,
                                filter_dropout: bool | None = None,
                                limit: int | None = None, offset: int | None = None,db_session: AsyncSession | None = None):
        session = db_session
        BranchForAdmission = aliased(Branch)
        present_yr = datetime.now().year
        current_fin_yr_start = date(present_yr, 4, 1)
        current_fin_yr_end = date(present_yr+1, 3, 31)
        last_fin_yr_start = date(present_yr-1, 4, 1)
        last_fin_yr_end = date(present_yr, 3, 31)
        next_fin_yr_start = date(present_yr+1, 4, 1)
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_date_with_tz = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_date_with_tz = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        
        unpaid_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED",
                                  PurchaseInstallment.installment_date.between(start_date_with_tz, end_date_with_tz),
                                Purchase.student_id == user_id if user_id else True,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        
        unpaid_lastyr_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount_lastyr")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED",
                                  PurchaseInstallment.installment_date.between(last_fin_yr_start, last_fin_yr_end),
                                Purchase.student_id == user_id if user_id else True,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        
        unpaid_presentyr_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount_presentyr")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED",
                                  PurchaseInstallment.installment_date.between(current_fin_yr_start, current_fin_yr_end),
                                Purchase.student_id == user_id if user_id else True,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        
        unpaid_remaining_query = (select(func.sum(PurchaseInstallment.installment_amount).label("due_amount_remaining")
                            ,PurchaseInstallment.purchase_id.label("purchase_id"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED",
                                  PurchaseInstallment.installment_date > next_fin_yr_start,
                                Purchase.student_id == user_id if user_id else True,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
                           .group_by(PurchaseInstallment.purchase_id)).subquery()
        
        paid_query = (select(func.sum(PurchaseInstallment.installment_amount).label("paid_amount")
                              ,PurchaseInstallment.purchase_id.label("purchase_id"))
                        .select_from(PurchaseInstallment)
                        .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Transaction, Transaction.id == PurchaseInstallment.transaction_id)
                        .where(Purchase.purchase_status == "COMPLETED",
                            #    and_(
                            #             Transaction.tx_at >= start_date_with_tz,
                            #             Transaction.tx_at <= end_date_with_tz
                            #         ),
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                            and_(PurchaseInstallment.transaction_id != None,PurchaseInstallment.installment_status == "COMPLETED"))
                        .group_by(PurchaseInstallment.purchase_id)).subquery()
        
                             
        query = (
            select(unpaid_query.c.due_amount,
                   unpaid_lastyr_query.c.due_amount_lastyr,
                   unpaid_presentyr_query.c.due_amount_presentyr,
                   unpaid_remaining_query.c.due_amount_remaining,
                   paid_query.c.paid_amount,
                     func.array_agg(func.json_build_object(
                                    'id', Transaction.id,
                                    'amount', Transaction.amount,
                                    'paid_to', Transaction.paid_to,
                                    'tx_at', Transaction.tx_at,
                                    "tx_status", Transaction.tx_status
                                )).label("installment_txs"),                   
                func.jsonb_build_object(
                "id", Purchase.id,
                "transaction_id", Purchase.transaction_id,
                "amount", Purchase.amount,
                "product_id", Purchase.product_id,
                "admission_id",Purchase.admission_id ,
                "student_id" ,Purchase.student_id,
                "amount",Purchase.amount,
                "ins_count", Purchase.intallments_count,
                "discount_id",Purchase.discount_id,
                "discount_amount" ,Purchase.discount_amount,
                "additional_discount_id" ,Purchase.additional_discount_id,
                "additional_disc_amt" ,Purchase.additional_disc_amt,
                "total_amount" ,Purchase.total_amount
            ).label("Purchase"),
            func.array_agg(func.json_build_object(
                                    'id', PurchaseInstallment.id,
                                    'ins_tx_id', PurchaseInstallment.transaction_id,
                                    "ins_amt", PurchaseInstallment.installment_amount,
                                    'inst_status', PurchaseInstallment.installment_status,
                                    'pur_id', PurchaseInstallment.purchase_id
                                )).label("pur_installments"),
                               
             func.jsonb_build_object(
                "id", Product.id,
                "name", Product.name,
                "code", Product.code,
                "branch", Product.branch_id,
                "branch_name", Branch.name
            ).label("Product"),
            func.jsonb_build_object(
                "id",Offering.id,
                "offering_category", Offering.offering_category,
                "name",Offering.name,
            ).label("Offering"),
                func.jsonb_build_object(
                    "id", Admission.id,
                    "user_id", Admission.user_id,
                    "admission_date", Admission.admission_date,
                    "branch_id" , Admission.branch_id,
                    "branch_name", BranchForAdmission.name,
                    "status" , Admission.status ,
                    "is_dropout", Admission.is_dropout
                    # "user" , Admission.user
                ).label("Admission"),
                    func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number,
                        "email", User.email,
                        "status", User.is_active,
                        "parent_name", func.max(cast(Walkin.parent_details.op("->>")("name"), String)),
                        "parent_mob_no", func.max(cast(Walkin.parent_details.op("->>")("phone_number"), String))
                    
                ).label("User"))
            .select_from(Purchase)
            .join(Product, Purchase.product_id == Product.id)
            .join(Offering, Offering.id == Product.offering_id)
            .join(Admission,Admission.id == Purchase.admission_id)
            .outerjoin(Walkin,Walkin.id == Admission.walkin_id )
            .join(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
            .outerjoin(Transaction, and_(
                                        Transaction.id == PurchaseInstallment.transaction_id,
                                        Transaction.tx_status == "COMPLETED"
                                    ))
            .join(User, User.id == Purchase.student_id)
            .outerjoin(Branch, Branch.id == Product.branch_id )
            .outerjoin(BranchForAdmission, BranchForAdmission.id == Admission.branch_id)
            .outerjoin(paid_query, paid_query.c.purchase_id == Purchase.id)
            .outerjoin(unpaid_query, unpaid_query.c.purchase_id == Purchase.id)
            .outerjoin(unpaid_presentyr_query, unpaid_presentyr_query.c.purchase_id == Purchase.id)
            .outerjoin(unpaid_remaining_query, unpaid_remaining_query.c.purchase_id == Purchase.id)
            .outerjoin(unpaid_lastyr_query, unpaid_lastyr_query.c.purchase_id == Purchase.id)
            .where(
                    Purchase.student_id == user_id if user_id else True,
                    User.full_name.ilike(f"%{student_name}%") if student_name else True,
                    User.phone_number == ph_no if ph_no else True,
                    Branch.name == branch_name if branch_name else True,
                    Offering.offering_category == offering_category if offering_category else True,
                    Offering.name == offering_name if offering_name else True,
                    Product.name.ilike(f"%{prod_name}%") if prod_name else True,
                    Product.code.ilike(f"%{prod_code}%") if prod_code else True,
                    Admission.id == admission_id if admission_id else True,
                    Purchase.purchase_status == "COMPLETED",
                    Purchase.total_amount != paid_query.c.paid_amount ,
                    # Transaction.tx_status == "COMPLETED",
                    PurchaseInstallment.installment_date.between(start_date_with_tz, end_date_with_tz),
                    or_(PurchaseInstallment.is_deleted == False,
                    PurchaseInstallment.is_deleted == None))
            
            .group_by(
                Purchase.id,
                Admission.id,
                User.id,
                Product.id,
                Offering.id,
                Branch.id,
                BranchForAdmission.id,
                unpaid_query.c.due_amount,
                paid_query.c.paid_amount,
                unpaid_lastyr_query.c.due_amount_lastyr,
                unpaid_presentyr_query.c.due_amount_presentyr,
                unpaid_remaining_query.c.due_amount_remaining,
            )
            # .group_by(unpaid_query.c.due_amount,paid_query.c.paid_amount)
            .order_by(Purchase.id.desc()))
            # .offset(offset).limit(limit))
        if filter_dropout:
            query = query.where(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)

        result = await session.execute(query)
        purchases = result.mappings().all()
        return purchases

    async def get_walkins_with_count(
        self,
        *,
        filters: dict[str, int | str] | None = None,  # Use a dict for filters
        attr: str | None = None ,
        ids: list[int] | None = None ,
        clause_statements: str | None = None,
        order_by: str | None = None,
        skip: int | None = None,
        limit: int | None = None,

        db: AsyncSession | None = None,
    ):
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
            
        seq_id = func.row_number().over(
                partition_by=self.model.user_id,
                order_by=self.model.created_at.asc()
            ).label("seq_id")
                        
        query = (select(seq_id,self.model) 
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(columns[order_by].desc()))
       
        response = await session.execute(query)
    
        return response.unique().mappings().all()

    async def get_offering_referrers(self, db: AsyncSession | None = None):

        session = db
        offering_expr = cast(Walkin.questionnaire.op("->>")("joining_offering"), String)
        refer_expr = cast(Walkin.questionnaire.op("->>")("referred_by"), String)
        query = (select(func.count(Walkin.id),offering_expr.label("offering"),refer_expr.label("referrer"))
                .where(refer_expr.isnot(None))
                .group_by(offering_expr,refer_expr))
        
        resp = await session.execute(query)

        return resp.mappings().all()

    async def counsellor_conversion_ratio(self,
                                        from_date: date | None = None,
                                        till_date: date | None = None, 
                                        offering_name: str | None = None, 
                                        counsellor_name: str | None = None, 
                                        db: AsyncSession | None = None):
        session = db
        if from_date and till_date:
            start_utc, end_utc = await ist_range_to_utc(from_date, till_date)
        councellor_expr =cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        offering_expr = cast(Walkin.questionnaire.op("->>")("joining_offering"), String)
        
        query = (select(func.count(Walkin.id).label("walkin_count"),func.count(distinct(case((Admission.id.isnot(None), Walkin.id)))).label("admission_count"),offering_expr.label("offering"),councellor_expr.label("councellor_id"),(User.full_name).label("councellor_name"),
                        extract("month", Walkin.created_at).label("month"),
                        extract("year", Walkin.created_at).label("year"))
                 .select_from(Walkin)
                 .join(User,User.id == councellor_expr)
                 .outerjoin(Admission, Admission.walkin_id == Walkin.id)
                 .where(Walkin.created_at.between(start_utc, end_utc) if from_date and till_date else [],
                        User.full_name == counsellor_name if counsellor_name else True,
                        offering_expr == offering_name if offering_name else True)
                 .group_by(offering_expr,councellor_expr,extract("month", Walkin.created_at), extract("year", Walkin.created_at),User.full_name))
        result = await session.execute(query)

        rows = result.mappings().all()

        # Build a dictionary keyed by financial month in the format "MM-YYYY"
        financial_data = defaultdict(list)
        for row in rows:
                month, year = int(row["month"]), int(row["year"])
                financial_year = year if month >= 4 else year
                key = f"{month}-{financial_year}"
                entry = {
                    "councellor_name": row["councellor_name"],
                    "councellor_id": row["councellor_id"],
                    "offering": row["offering"],
                    "walkin_count": float(row["walkin_count"]),
                    "admission_count": float(row["admission_count"])
                }
                financial_data[key].append(entry)

            # Sorting by financial year (April to March)
            # sorted_monthly_summary = {k: financial_data[k] for k in sorted(financial_data.keys(), key=lambda x: tuple(map(int, x.split('-'))))}
        sorted_monthly_summary = {
        k: financial_data[k]
        for k in sorted(financial_data.keys(), key=lambda x: (int(x.split('-')[1]), int(x.split('-')[0])))
    }
        
        return sorted_monthly_summary

    async def counsellor_performance(self, db: AsyncSession | None = None):
        session = db
        councellor_expr =cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        probability_expr =cast(Walkin.counselling.op("->>")("probability"), Integer)

        pred_query = (select(func.count(Walkin.id).label("total_pre_count"),councellor_expr.label("counsellor"))
                      .where(probability_expr.isnot(None))
                      .group_by(councellor_expr))
        
        admitted_query = (select(func.count(distinct(Walkin.id)).label("admitted_count"),councellor_expr.label("counsellor"))
                        .select_from(Admission)
                        .join(Walkin, Walkin.id == Admission.walkin_id)
                        .where(probability_expr.isnot(None))
                        .group_by(councellor_expr))
        
        conf_query = (select(func.count(Walkin.id).label("prob_confidence_count"),councellor_expr.label("counsellor"))
                      .where(probability_expr >= 75)
                      .group_by(councellor_expr))
        
        unconf_query = (select(func.count(Walkin.id).label("prob_not_confident_count"),councellor_expr.label("counsellor"))
                      .where(probability_expr <= 25)
                      .group_by(councellor_expr))
        
        conf_admitted_query = (select(func.count(distinct(Walkin.id)).label("conf_admitted_count"),councellor_expr.label("counsellor"))
                        .select_from(Admission)
                        .join(Walkin, Walkin.id == Admission.walkin_id)
                        .where(probability_expr >= 75)
                        .group_by(councellor_expr))
        
        un_conf_admitted_query = (select(func.count(distinct(Walkin.id)).label("not_conf_but_admitted_count"),councellor_expr.label("counsellor"))
                        .select_from(Admission)
                        .join(Walkin, Walkin.id == Admission.walkin_id)
                        .where(probability_expr <= 25)
                        .group_by(councellor_expr))
        pred_subq = pred_query.subquery()
        admitted_subq = admitted_query.subquery()
        conf_subq = conf_query.subquery()
        unconf_subq = unconf_query.subquery()
        conf_adm_subq = conf_admitted_query.subquery()
        unconf_adm_subq = un_conf_admitted_query.subquery()

        
        final_query = (
                    select(
                        pred_subq.c.counsellor,
                        User.full_name,
                        pred_subq.c.total_pre_count,
                        admitted_subq.c.admitted_count,
                        conf_subq.c.prob_confidence_count,
                        unconf_subq.c.prob_not_confident_count,
                        conf_adm_subq.c.conf_admitted_count,
                        unconf_adm_subq.c.not_conf_but_admitted_count,
                    )
                    .select_from(pred_subq)
                    .outerjoin(User,User.id == pred_subq.c.counsellor)
                    .outerjoin(admitted_subq, admitted_subq.c.counsellor == pred_subq.c.counsellor)
                    .outerjoin(conf_subq, conf_subq.c.counsellor == pred_subq.c.counsellor)
                    .outerjoin(unconf_subq, unconf_subq.c.counsellor == pred_subq.c.counsellor)
                    .outerjoin(conf_adm_subq, conf_adm_subq.c.counsellor == pred_subq.c.counsellor)
                    .outerjoin(unconf_adm_subq, unconf_adm_subq.c.counsellor == pred_subq.c.counsellor)
                )
        
        result = await session.execute(final_query)
        return result.mappings().all()
    
    async def counsellor_prediction_calibration(self,from_date: date | None = None,till_date: date | None = None,counsellor_id: int | None = None,db: AsyncSession | None = None ):
        session = db
        councellor_id_expr =cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        counselling_date = cast(Walkin.counselling.op("->>")("counselling_date"),Date)
        probability_expr =cast(Walkin.counselling.op("->>")("probability"), Integer)

        walkin_count_query = (select(func.count(Walkin.id).label("walkin_count"),councellor_id_expr.label("counsellor_id"),probability_expr.label("probability"))
                        .where(councellor_id_expr == counsellor_id,counselling_date.between(from_date,till_date) )
                        .group_by(councellor_id_expr,probability_expr).subquery())
        
        admission_count_query = (select(func.count(distinct(Walkin.id)).label("admission_count"),councellor_id_expr.label("counsellor_id"),probability_expr.label("probability"))
                        .select_from(Walkin)
                        .join(Admission,Admission.walkin_id == Walkin.id)
                        .where(councellor_id_expr == counsellor_id,counselling_date.between(from_date,till_date)
                               ,counselling_date != func.date(Admission.admission_date))
                        .group_by(councellor_id_expr,probability_expr).subquery())
        
        final_query = (
                    select(
                        walkin_count_query.c.walkin_count,
                        func.coalesce(admission_count_query.c.admission_count, 0).label("admission_count"),
                        walkin_count_query.c.counsellor_id,
                        User.id,
                        # User.full_name,
                        walkin_count_query.c.probability,
                        # admission_count_query.c.probability

                    )
                    .select_from(walkin_count_query)
                    .join(User,User.id == walkin_count_query.c.counsellor_id )
                    .outerjoin(admission_count_query, and_(walkin_count_query.c.counsellor_id == admission_count_query.c.counsellor_id,
                                                           walkin_count_query.c.probability == admission_count_query.c.probability))

                    
                )
        
        result = await session.execute(final_query)
        return result.mappings().all()

    async def get_admission_student_details(self,admission_id:int,db:AsyncSession | None = None):
        session = db
        query = (select(User.id.label("user_id"), Admission.id.label("admission_id"), User.phone_number, User.full_name, Offering.name.label("course_name"), Branch.name.label("branch_name"), Batch.actual_start_date, Batch.planned_start_date)
                 .select_from(Admission)
                 .join(User,User.id == Admission.user_id)
                 .join(Purchase,Purchase.admission_id == Admission.id)
                 .join(Product,Product.id == Purchase.product_id)
                 .join(Offering,Offering.id == Product.offering_id)
                 .outerjoin(Batch,Batch.id == Product.batch_id)
                 .outerjoin(Branch,Branch.id == Admission.branch_id)
                 .where(Admission.id == admission_id))
        
        resp = await session.execute(query)
        row = resp.mappings().first()
        if not row:
            return None 
        student_id = f"S-{str(row['user_id']).zfill(4)}" 
        return { "student_id": student_id,
                 "admission_id": row["admission_id"], 
                 "phone_number": row["phone_number"], 
                 "student_name": row["full_name"],
                   "course_name": row["course_name"],
                     "branch_name": row.get("branch_name") or "N/A", 
                     "start_date": ( str(row["actual_start_date"] or row["planned_start_date"]) if (row["actual_start_date"] or row["planned_start_date"]) else "N/A" ) }
    
    async def get_due_amount(self,purchase_id:int,db_session: AsyncSession | None = None):
        session = db_session
        query = (select(func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("due_amount"))
                           .select_from(PurchaseInstallment)
                           .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                           .where(Purchase.purchase_status == "COMPLETED", Purchase.id == purchase_id,
                                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                                or_(PurchaseInstallment.transaction_id == None, PurchaseInstallment.installment_status != "COMPLETED"))
        )
        
        result = await session.execute(query)
        row = result.mappings().first()
        return row["due_amount"] if row else 0
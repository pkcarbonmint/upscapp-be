from datetime import datetime, date, timedelta, timezone
import pytz
from src.base.service import BaseService
from src.modules.fee.deps import ist_range_to_utc
from src.modules.frontdesk.models import Admission, Walkin
from src.modules.products.models import Offering, Product, Purchase,PurchaseInstallment,Price,Batch
from src.modules.products.schemas import PurchaseCreate, PurchaseInstallmentBase,PurchaseUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Integer, String, case,  cast, distinct, literal_column, select,func,and_,or_
from sqlalchemy.sql.expression import text

from sqlalchemy.orm import aliased
from src.tenants.models import Branch
from src.users.models import Plan, Subscription, User,Transaction
from sqlalchemy.sql import extract
from collections import defaultdict
from sqlalchemy import Date


class PurchaseService(BaseService[Purchase, PurchaseCreate, PurchaseUpdate]):

    async def get_all_fees( self,from_date: date,
        till_date: date | None = None , branch_id:int | None = None, offering_id:int | None = None, batch_id:int | None = None,filter_dropout:bool | None = None, db_session: AsyncSession | None = None
    ):
        session = db_session 
        filters = []
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_date_with_tz = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_date_with_tz = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        # start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
        # end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)

        # Apply branch and offering filters dynamically
        if branch_id:
            filters.append(Admission.branch_id == branch_id)
        if offering_id:
            filters.append(Product.offering_id == offering_id)
        if batch_id:
            filters.append(Product.batch_id == batch_id)
        if filter_dropout:
            filters.append(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))
        # Query for total purchases grouped by purchase_date (month-wise)
        purchase_paid_query = (
            select(
                extract("month", Transaction.tx_at).label("month"),
                extract("year", Transaction.tx_at).label("year"),
                func.coalesce(func.sum(Purchase.total_amount), 0).label("pur_tot_amount")
            )
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Transaction, Transaction.id == Purchase.transaction_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters,  and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz,
            ),Transaction.tx_status == "COMPLETED" , Purchase.transaction_id != None))
            .group_by(extract("month", Transaction.tx_at), extract("year", Transaction.tx_at))
        ) # tx date 

        refunded_paid_purchase_query = (
            select(
                extract("month", Transaction.tx_at).label("month"),
                extract("year", Transaction.tx_at).label("year"),
                func.coalesce(func.sum(Purchase.refund_amount), 0).label("pur_refund_amount")
            )
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Transaction, Transaction.id == Purchase.refund_tx_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters,  and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz,
            ),Transaction.tx_status == "REFUNDED" , Purchase.refund_tx_id != None))
            .group_by(extract("month", Transaction.tx_at), extract("year", Transaction.tx_at))
        )

        paid_pur_inst_query = (
            select(
                extract("month", Transaction.tx_at).label("month"),
                extract("year", Transaction.tx_at).label("year"),
                func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("paid_pur_installment")
            )
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
            .join(Transaction, Transaction.id == PurchaseInstallment.transaction_id)
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters,  and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ),Transaction.tx_status == "COMPLETED", or_(PurchaseInstallment.is_deleted == False,
                                                        PurchaseInstallment.is_deleted == None), PurchaseInstallment.transaction_id != None))
            .group_by(extract("month", Transaction.tx_at), extract("year", Transaction.tx_at))
        )

        # Query for unpaid installments grouped by installment_date (month-wise)
        unpaid_pur_inst_query = (
            select(
                extract("month", PurchaseInstallment.installment_date).label("month"),
                extract("year", PurchaseInstallment.installment_date).label("year"),
                func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("unpaid_pur_installment")
            )
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters, PurchaseInstallment.installment_date.between(start_date_with_tz, end_date_with_tz),
                        or_(PurchaseInstallment.is_deleted == False,
              PurchaseInstallment.is_deleted == None), PurchaseInstallment.installment_status !=  "COMPLETED", Purchase.purchase_status == "COMPLETED"))
            .group_by(extract("month", PurchaseInstallment.installment_date), extract("year", PurchaseInstallment.installment_date))
        )

        unpaid_backlog_installments = (
            select(func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("unpaid_pur_installment"))
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters, func.date(PurchaseInstallment.installment_date) < from_date,or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None), PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status == "COMPLETED"))
        )

        # Execute queries
        purchase_results = await session.execute(purchase_paid_query)
        refunded_results = await session.execute(refunded_paid_purchase_query)
        paid_installment_results = await session.execute(paid_pur_inst_query)
        unpaid_installment_results = await session.execute(unpaid_pur_inst_query)
        unpaid_backlog_installments = await session.execute(unpaid_backlog_installments)

        # Initialize dictionary to store month-year wise summary
        monthly_summary = {}

        # Helper function to create the key as "month-year"
        def get_key(year, month):
            return f"{int(month)}-{int(year)}"
        
        refund_summary = {
            get_key(year, month): pur_refund_amount
            for year, month, pur_refund_amount in refunded_results.fetchall()
        }

        # Populate purchase data
        for year, month, pur_tot_amount in purchase_results.fetchall():
            key = get_key(year, month)
            refunded_amount = refund_summary.get(key, 0)  # Get refund amount for the same month-year
            net_received_amount = pur_tot_amount - refunded_amount
            monthly_summary.setdefault(key, {
                "total_direct_purchase_amount_received": 0,
                "total_paid_installments_amount": 0,
                "total_unpaid_installments_amount": 0
            })
            monthly_summary[key]["total_direct_purchase_amount_received"] = net_received_amount

        # Populate paid installment data
        for year, month, paid_pur_installment in paid_installment_results.fetchall():
            key = get_key(year, month)
            monthly_summary.setdefault(key, {
                "total_direct_purchase_amount_received": 0,
                "total_paid_installments_amount": 0,
                "total_unpaid_installments_amount": 0
            })
            monthly_summary[key]["total_paid_installments_amount"] = paid_pur_installment

        # Populate unpaid installment data
        for year, month, unpaid_pur_installment in unpaid_installment_results.fetchall():
            key = get_key(year, month)
            monthly_summary.setdefault(key, {
                 "total_direct_purchase_amount_received": 0,
                "total_paid_installments_amount": 0,
                "total_unpaid_installments_amount": 0
            })
            monthly_summary[key]["total_unpaid_installments_amount"] = unpaid_pur_installment

        return [{"unpaid_backlog_installments": unpaid_backlog_installments.scalar() or 0} ,{k: monthly_summary[k] for k in sorted(monthly_summary.keys(), key=lambda x: tuple(map(int, x.split('-'))))}]
                
        # tot_pur_query = (select(func.sum(Purchase.total_amount).label("pur_tot_amount"))
        #                 .join(Admission, Admission.id == Purchase.admission_id)
        #                 .join(Product, Product.id == Purchase.product_id)
        #                 .where(and_(*filters,Purchase.purchase_date.between(from_date, till_date), Purchase.transaction_id != None)))
        
        # tot_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("pur_inst_tot_amt"))
        #                     .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
        #                     .join(Admission, Admission.id == Purchase.admission_id)
        #                     .join(Product, Product.id == Purchase.product_id)
        #                     .where(and_(*filters,PurchaseInstallment.installment_date.between(from_date,till_date))))
        
        # paid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("paid_pur_installment"))
        #                         .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
        #                         .join(Admission, Admission.id == Purchase.admission_id)
        #                         .join(Product, Product.id == Purchase.product_id)
        #                        .where(and_(*filters,PurchaseInstallment.installment_date.between(from_date,till_date),PurchaseInstallment.transaction_id != None)))
        
        # unpaid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("unpaid_pur_installment"))
        #                         .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
        #                         .join(Admission, Admission.id == Purchase.admission_id)
        #                         .join(Product, Product.id == Purchase.product_id)
        #                        .where(and_(*filters,PurchaseInstallment.installment_date.between(from_date,till_date),PurchaseInstallment.transaction_id == None)))
        
        # total_purchases_amount = await session.scalar(tot_pur_query)
        # total_purchases_installments = await session.scalar(tot_pur_inst_query)
        # total_paid_installments = await session.scalar(paid_pur_inst_query)
        # total_unpaid_installments = await session.scalar(unpaid_pur_inst_query)

        # return {
        #     "total_amount_received": total_purchases_amount or 0,
        #     "total_purchase_installments": total_purchases_installments or 0,
        #     "total_paid_installments": total_paid_installments or 0,
        #     "total_unpaid_installments": total_unpaid_installments or 0
        # }


        # tot fee for fy is sum of installment_amount  for the installment_date in pur inst from start-date to end-date if there are inst otherwise sum of total_amount in purchases for given purchase_date period
        # revised will be same but for pur inst which has txs and for purchases w/o inst txs
        # to be revised, same but for no txs for pur ins
    
    async def get_offerings_fee_by_date_window(self,from_date: date,
    till_date: date | None = None , branch_id:int | None = None, db_session: AsyncSession | None = None
    ):
        session = db_session 
        filters = []
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_date_with_tz = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_date_with_tz = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        # start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
        # end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)

        if branch_id:
            filters.append(Admission.branch_id == branch_id)
            
        tot_pur_query = (select(func.sum(Purchase.total_amount).label("pur_tot_amount"),Product.offering_id.label("offering_id"))
                        .join(Admission, Admission.id == Purchase.admission_id)
                        .join(Transaction, Transaction.id == Purchase.transaction_id)
                        .join(Product, Product.id == Purchase.product_id)
                        .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ), Transaction.tx_status == "COMPLETED",Purchase.transaction_id != None))
                        .group_by(Product.offering_id))
        

        refunded_paid_purchase_query = (select(func.coalesce(func.sum(Purchase.refund_amount), 0).label("pur_refund_amount"),Product.offering_id.label("offering_id"))
                        .join(Admission, Admission.id == Purchase.admission_id)
                        .join(Transaction, Transaction.id == Purchase.refund_tx_id)
                        .join(Product, Product.id == Purchase.product_id)
                        .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ), Transaction.tx_status == "REFUNDED",Purchase.refund_tx_id != None))
                        .group_by(Product.offering_id))
        
        # tot_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("pur_inst_tot_amt"),Product.offering_id.label("offering_id"))
        #                     .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
        #                     .join(Admission, Admission.id == Purchase.admission_id)
        #                     .join(Product, Product.id == Purchase.product_id)
        #                     .where(and_(*filters,PurchaseInstallment.installment_date.between(from_date,till_date),or_(PurchaseInstallment.is_deleted == False,
        #                                                                           PurchaseInstallment.is_deleted == None)))
        #                      .group_by(Product.offering_id))
        
        paid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("paid_pur_installment"),Product.offering_id.label("offering_id"))
                                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                                .join(Admission, Admission.id == Purchase.admission_id)
                                .join(Transaction, Transaction.id == PurchaseInstallment.transaction_id)
                                .join(Product, Product.id == Purchase.product_id)
                               .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ),PurchaseInstallment.transaction_id != None,Transaction.tx_status == "COMPLETED",or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None)))
                                .group_by(Product.offering_id))
        
        unpaid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("unpaid_pur_installment"),Product.offering_id.label("offering_id"))
                                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                                .join(Admission, Admission.id == Purchase.admission_id)
                                .join(Product, Product.id == Purchase.product_id)
                               .where(and_(*filters,PurchaseInstallment.installment_date.between(start_date_with_tz, end_date_with_tz)
                                           ,PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status == "COMPLETED",or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None)))
                                .group_by(Product.offering_id))
        
        unpaid_backlog_installments = (
            select(func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("unpaid_backlog_installments"),Product.offering_id.label("offering_id"))
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters, func.date(PurchaseInstallment.installment_date) < from_date,or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None), PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status == "COMPLETED"))
            .group_by(Product.offering_id))
        
        
        total_purchases_amount = await session.execute(tot_pur_query)
        # total_purchases_installments = await session.execute(tot_pur_inst_query)
        total_refunded_purchases = await session.execute(refunded_paid_purchase_query)
        total_paid_installments = await session.execute(paid_pur_inst_query)
        total_unpaid_installments = await session.execute(unpaid_pur_inst_query)
        unpaid_backlog_installments = await session.execute(unpaid_backlog_installments)

        # return  total_purchases_amount.mappings().all()


        result = {}

        # Process all queries in a single pass
        for row in total_purchases_amount.mappings().all():
            offering_id = row["offering_id"]
            result.setdefault(offering_id, {})["total_purchases_amount"] = row["pur_tot_amount"]

        for row in total_refunded_purchases.mappings().all():
            offering_id = row["offering_id"]
            result.setdefault(offering_id, {})["total_refunded_purchases"] = row["pur_refund_amount"]


        # for row in total_purchases_installments.mappings().all():
        #     offering_id = row["offering_id"]
        #     result.setdefault(offering_id, {})["total_installment_amount"] = row["pur_inst_tot_amt"]

        for row in total_paid_installments.mappings().all():
            offering_id = row["offering_id"]
            result.setdefault(offering_id, {})["total_paid_installments"] = row["paid_pur_installment"]

        for row in total_unpaid_installments.mappings().all():
            offering_id = row["offering_id"]
            result.setdefault(offering_id, {})["total_unpaid_installments"] = row["unpaid_pur_installment"]

        for row in unpaid_backlog_installments.mappings().all():
            offering_id = row["offering_id"]
            result.setdefault(offering_id, {})["unpaid_backlog_installments"] = row["unpaid_backlog_installments"]

        # Fill missing values with 0
        for offering_id in result:
            total_purchases_amount = result.get(offering_id, {}).get("total_purchases_amount", 0)
            total_refunded_purchases = result.get(offering_id, {}).get("total_refunded_purchases", 0)

            result[offering_id] = {
                "total_direct_purchase_amount_received": total_purchases_amount - total_refunded_purchases,
                "total_paid_installments_amount": result[offering_id].get("total_paid_installments", 0),
                "total_unpaid_installments_amount": result[offering_id].get("total_unpaid_installments", 0),
                "unpaid_backlog_installments": result[offering_id].get("unpaid_backlog_installments" , 0),

            }

        return result
    
    async def get_branch_fee_by_date_window(self,from_date: date,
    till_date: date | None = None , offering_id:int | None = None, db_session: AsyncSession | None = None
    ):
        session = db_session 
        filters = []
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_date_with_tz = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_date_with_tz = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        # start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
        # end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)

        if offering_id:
            filters.append(Product.offering_id == offering_id)
            
        tot_pur_query = (select(func.sum(Purchase.total_amount).label("pur_tot_amount"),Admission.branch_id.label("branch_id"))
                        .join(Admission, Admission.id == Purchase.admission_id)
                        .join(Transaction, Transaction.id == Purchase.transaction_id)
                        .join(Product, Product.id == Purchase.product_id)
                        .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ),Transaction.tx_status == "COMPLETED", Purchase.transaction_id != None))
                        .group_by(Admission.branch_id))
        
        refunded_paid_purchase_query = (select(func.coalesce(func.sum(Purchase.refund_amount), 0).label("pur_refund_amount"),Admission.branch_id.label("branch_id"))
                        .join(Admission, Admission.id == Purchase.admission_id)
                        .join(Transaction, Transaction.id == Purchase.refund_tx_id)
                        .join(Product, Product.id == Purchase.product_id)
                        .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ), Transaction.tx_status == "REFUNDED",Purchase.refund_tx_id != None))
                        .group_by(Admission.branch_id))
        
        # tot_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("pur_inst_tot_amt"),Admission.branch_id.label("branch_id"))
        #                     .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
        #                     .join(Admission, Admission.id == Purchase.admission_id)
        #                     .join(Product, Product.id == Purchase.product_id)
        #                     .where(and_(*filters,PurchaseInstallment.installment_date.between(from_date,till_date),or_(PurchaseInstallment.is_deleted == False,
        #                                                                           PurchaseInstallment.is_deleted == None)))
        #                      .group_by(Admission.branch_id))
        
        paid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("paid_pur_installment"),Admission.branch_id.label("branch_id"))
                                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                                .join(Admission, Admission.id == Purchase.admission_id)
                                .join(Transaction, Transaction.id == PurchaseInstallment.transaction_id)
                                .join(Product, Product.id == Purchase.product_id)
                               .where(and_(*filters, and_(
                Transaction.tx_at >= start_date_with_tz,
                Transaction.tx_at <= end_date_with_tz
            ),or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
            Transaction.tx_status == "COMPLETED",
            PurchaseInstallment.transaction_id != None))
                                .group_by(Admission.branch_id))
        
        unpaid_pur_inst_query = (select(func.sum(PurchaseInstallment.installment_amount).label("unpaid_pur_installment"),Admission.branch_id.label("branch_id"))
                                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                                .join(Admission, Admission.id == Purchase.admission_id)
                                .join(Product, Product.id == Purchase.product_id)
                               .where(and_(*filters,PurchaseInstallment.installment_date.between(start_date_with_tz, end_date_with_tz)
                                           ,or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None),PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status == "COMPLETED"))
                                .group_by(Admission.branch_id))
        
        unpaid_backlog_installments = (
            select(func.coalesce(func.sum(PurchaseInstallment.installment_amount), 0).label("unpaid_backlog_installments"),Admission.branch_id.label("branch_id"))
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
            .join(Admission, Admission.id == Purchase.admission_id)
            .join(Product, Product.id == Purchase.product_id)
            .where(and_(*filters, func.date(PurchaseInstallment.installment_date) < from_date,or_(PurchaseInstallment.is_deleted == False,
                                                                                  PurchaseInstallment.is_deleted == None), PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status == "COMPLETED"))
            .group_by(Admission.branch_id))
        
        total_purchases_amount = await session.execute(tot_pur_query)
        # total_purchases_installments = await session.execute(tot_pur_inst_query)
        total_refunded_purchases = await session.execute(refunded_paid_purchase_query)
        total_paid_installments = await session.execute(paid_pur_inst_query)
        total_unpaid_installments = await session.execute(unpaid_pur_inst_query)
        unpaid_backlog_installments = await session.execute(unpaid_backlog_installments)

        # return  total_purchases_amount.mappings().all()


        result = {}

        # Process all queries in a single pass
        for row in total_purchases_amount.mappings().all():
            branch_id = row["branch_id"]
            result.setdefault(branch_id, {})["total_purchases_amount"] = row["pur_tot_amount"]
        
        for row in total_refunded_purchases.mappings().all():
            branch_id = row["branch_id"]
            result.setdefault(branch_id, {})["total_refunded_purchases"] = row["pur_refund_amount"]


        # for row in total_purchases_installments.mappings().all():
        #     branch_id = row["branch_id"]
        #     result.setdefault(branch_id, {})["total_installment_amount"] = row["pur_inst_tot_amt"]

        for row in total_paid_installments.mappings().all():
            branch_id = row["branch_id"]
            result.setdefault(branch_id, {})["total_paid_installments"] = row["paid_pur_installment"]

        for row in total_unpaid_installments.mappings().all():
            branch_id = row["branch_id"]
            result.setdefault(branch_id, {})["total_unpaid_installments"] = row["unpaid_pur_installment"]

        for row in unpaid_backlog_installments.mappings().all():
            branch_id = row["branch_id"]
            result.setdefault(branch_id, {})["unpaid_backlog_installments"] = row["unpaid_backlog_installments"]


        # Fill missing values with 0
        for branch_id in result:
            total_purchases_amount = result.get(branch_id, {}).get("total_purchases_amount", 0)
            total_refunded_purchases = result.get(branch_id, {}).get("total_refunded_purchases", 0)

            result[branch_id] = {
                "total_direct_purchase_amount_received": total_purchases_amount - total_refunded_purchases,
                "total_paid_installments_amount": result[branch_id].get("total_paid_installments", 0),
                "total_unpaid_installments_amount": result[branch_id].get("total_unpaid_installments", 0),
                 "unpaid_backlog_installments": result[branch_id].get("unpaid_backlog_installments" , 0),
            }

        return result

    
    async def get_day_report(self,from_date: date,
        till_date: date,plan_name: str | None = None, tx_id: int | None = None,
        branch_ids:list[int] | None = None, offering_id:int | None = None, is_online_branch: bool | None = None,
        limit: int | None = None, offset: int | None = None,include_incomplete_txs: bool | None = None,
        batch_id:int | None = None, legal_entity: str | None = None, payment_mode: str | None = None, db_session: AsyncSession | None = None
    ):
        session = db_session 
        installment_tx = aliased(Transaction)
        recorded_user = aliased(User)
        
        start_utc, end_utc = await ist_range_to_utc(from_date, till_date)

        
        
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
                'offering', Offering.name,
                "product_id", Purchase.product_id,
                'product_name', Product.name,
                'product_code', Product.code,
                # "price_id",  Purchase.price_id,
                # "tier_price_id", Purchase.tier_price_id,
                "admission_id",Purchase.admission_id ,
                # "purchase_type" , Purchase.purchase_type,
                "student_id" ,Purchase.student_id,
                # "quantity",Purchase.quantity,
                "intallments_count",Purchase.intallments_count,
                "purchase_date",Purchase.purchase_date,
                # "pricing_model",Purchase.pricing_model,
                # "amount",Purchase.amount,
                # "discount_id",Purchase.discount_id,
                # "discount_amount" ,Purchase.discount_amount,
                # "additional_discount_id" ,Purchase.additional_discount_id,
                # "additional_disc_amt" ,Purchase.additional_disc_amt,
                "total_amount" ,Purchase.total_amount,
                # "billing_frequency" ,Purchase.billing_frequency,
                # "recurring_count" ,Purchase.recurring_count,
                "purchase_status" ,Purchase.purchase_status,
                "refund_amount" ,Purchase.refund_amount,
                "purchase_details",Purchase.purchase_details,
                "purchase_legal_entities",Purchase.legal_entity_details
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
                    "installment_legal_entity", PurchaseInstallment.legal_entity_details
                ).distinct()).label("Purchase_Installment"),
                func.array_agg(
                func.jsonb_build_object(
                    "id", Admission.id,
                    "user_id", Admission.user_id,
                    "admission_date", Admission.admission_date,
                    "admission_branch_id" , Admission.branch_id,
                    "status" , Admission.status ,
                    "is_dropout",Admission.is_dropout,
                    "dropout_reason",Admission.dropout_reason,
                    'branch', Branch.name,
                    'branch_id', Branch.id,
                    # "user" , Admission.user
                ).distinct()).label("Admission"),
                func.array_agg(
                    func.jsonb_build_object(
                        "id", User.id,
                        "full_name", User.full_name,
                        "phone_number", User.phone_number,
                        "recorded_user", recorded_user.full_name,
                    
                ).distinct()).label("User"),
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
                    ).distinct()).label("Subscription"))
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
        .outerjoin(Product, Product.id == Purchase.product_id)
        .outerjoin(Branch, Branch.id == Admission.branch_id)
        .outerjoin(Offering, Offering.id == Product.offering_id)
        .outerjoin(recorded_user,or_(recorded_user.id == Transaction.paid_to))
        .where(
            or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),
            Transaction.tx_at.between(start_utc,end_utc)
            )
        .group_by(Transaction.id))

        # Apply branch and offering filters dynamically
        if is_online_branch:
            conditions = []
            if branch_ids:
                conditions.append(Admission.branch_id.in_(branch_ids))
            conditions.append(Subscription.id.isnot(None))
            query = query.where(or_(*conditions))
        elif branch_ids:
            query = query.where(Admission.branch_id.in_(branch_ids))
        if offering_id:
            query = query.where(Product.offering_id == offering_id)
        if batch_id:
            query = query.where(Product.batch_id == batch_id)
        if legal_entity:
            query = query.where(or_(
            cast(PurchaseInstallment.legal_entity_details["name"], String) == legal_entity,
            cast(Purchase.legal_entity_details["name"], String) == legal_entity
        ))
        if payment_mode:
            query = query.where(or_(Transaction.payment_mode == payment_mode))
        if not include_incomplete_txs:
            query = query.where(Transaction.tx_status == "COMPLETED")
        if plan_name:
            query = query.where(Plan.name == plan_name)
        if tx_id:
            query = query.where(Transaction.id == tx_id)
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        query = query.order_by(Transaction.id.asc())

        result = await session.execute(query)

        count_query = select(func.count(distinct(Purchase.id))).select_from(Transaction)\
            .outerjoin(Subscription, Subscription.id == Transaction.subscription_id)\
            .outerjoin(Plan, Subscription.plan_id == Plan.id)\
            .outerjoin(PurchaseInstallment, or_(PurchaseInstallment.transaction_id == Transaction.id))\
            .outerjoin(Purchase, or_(
                Purchase.transaction_id == Transaction.id,
                Purchase.refund_tx_id == Transaction.id,
                PurchaseInstallment.purchase_id == Purchase.id
            ))\
            .outerjoin(Admission, Admission.id == Purchase.admission_id)\
            .outerjoin(User, or_(User.id == Admission.user_id, User.id == Subscription.user_id))\
            .outerjoin(Product, Product.id == Purchase.product_id)\
            .outerjoin(Branch, Branch.id == Admission.branch_id)\
            .outerjoin(Offering, Offering.id == Product.offering_id)\
            .outerjoin(recorded_user, or_(recorded_user.id == Transaction.paid_to))\
            .where(
                or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                Transaction.tx_at.between(start_utc, end_utc)
            )
        if is_online_branch:
            conditions = []
            if branch_ids:
                conditions.append(Admission.branch_id.in_(branch_ids))
            conditions.append(Subscription.id.isnot(None))
            count_query = count_query.where(or_(*conditions))
        elif branch_ids:
            count_query = count_query.where(Admission.branch_id.in_(branch_ids))
        if offering_id:
            count_query = count_query.where(Product.offering_id == offering_id)
        if batch_id:
            count_query = count_query.where(Product.batch_id == batch_id)
        if legal_entity:
            count_query = count_query.where(or_(
            cast(PurchaseInstallment.legal_entity_details["name"], String) == legal_entity,
            cast(Purchase.legal_entity_details["name"], String) == legal_entity
        ))
        if payment_mode:
            count_query = count_query.where(or_(Transaction.payment_mode == payment_mode))
        if not include_incomplete_txs:
            count_query = count_query.where(Transaction.tx_status == "COMPLETED")
        if plan_name:
            count_query = query.where(Plan.name == plan_name)
        if tx_id:
            count_query = count_query.where(Transaction.id == tx_id)
        total_count = (await session.execute(count_query)).scalar()
        result = await session.execute(query)
        items = result.mappings().all()

        return {
            "total_count": total_count,
            "items": items
        }
       

    # async def total_collection_day_report(self,from_date: date,till_date: date,
    #      branch_ids:list[int] | None = None, offering_id:int | None = None, is_online_branch: bool | None = None,
    #      batch_id:int | None = None, legal_entity: str | None = None, payment_mode: str | None = None,db_session: AsyncSession | None = None
    # ):
    #     session = db_session 
    #     installment_tx = aliased(Transaction)
    #     start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
    #     end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)

    #     total_collection_query = (
    #         select(
    #             func.sum(
    #                 case(
    #                     (PurchaseInstallment.transaction_id.isnot(None), PurchaseInstallment.installment_amount),
    #                     else_=Purchase.total_amount  # Only use purchase_amount if installment_amount is None
    #                 )
    #             ).label("total_collection")
    #         )
    #         .select_from(Purchase)
    #         .join(Admission, Admission.id == Purchase.admission_id)
    #         .join(Product, Product.id == Purchase.product_id)
    #         .outerjoin(Branch, Branch.id == Admission.branch_id)
    #         .join(Offering, Offering.id == Product.offering_id)
    #         .join(User, Admission.user_id == User.id)             
    #         .outerjoin(PurchaseInstallment, PurchaseInstallment.purchase_id == Purchase.id)
    #         .outerjoin(Transaction, Transaction.id == Purchase.transaction_id)
    #         .outerjoin(installment_tx, installment_tx.id == PurchaseInstallment.transaction_id)
    #         .where(or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
    #                 or_(
    #             Transaction.tx_status == "COMPLETED",
    #             installment_tx.tx_status == "COMPLETED"
    #         ),
    #                func.date(func.coalesce(Transaction.tx_at, installment_tx.tx_at)).between(start_date_with_tz, end_date_with_tz))
    #     )
    #     if is_online_branch:
    #         conditions = []
    #         if branch_ids:
    #             conditions.append(Admission.branch_id.in_(branch_ids))
    #         conditions.append(Subscription.id.isnot(None))
    #         total_collection_query = total_collection_query.where(or_(*conditions))
        
    #     elif branch_ids:          
    #         total_collection_query = total_collection_query.where(Admission.branch_id.in_(branch_ids))

    #     if offering_id:       
    #         total_collection_query = total_collection_query.where(Product.offering_id == offering_id)

    #     if batch_id:      
    #         total_collection_query = total_collection_query.where(Product.batch_id == batch_id)

    #     if legal_entity:
    #         total_collection_query = total_collection_query.where(PurchaseInstallment.legal_entity_details["name"].as_string() == legal_entity)

    #     if payment_mode:
    #         total_collection_query = total_collection_query.where(or_(Transaction.payment_mode == payment_mode,installment_tx.payment_mode == payment_mode))
        

    #     # Execute queries
    #     result = await session.execute(total_collection_query)

    #     total_result = await session.execute(total_collection_query)
    #     total_collection = total_result.scalar() or 0 

    #     return total_collection

    async def get_walkins_by_filter(self,by_date:bool, by_reason: bool, by_competitor: bool,
                                    by_branch: bool, by_offering:bool, by_counsellor:bool, by_probability:bool,
                                    by_district:bool,by_parent_occ:bool,by_college:bool,by_uni:bool,by_spec:bool,
                                    by_source:bool,branch_name: str | None = None,
                                    offering_name:str| None = None,from_date: date| None = None,till_date: date | None = None,db_session:AsyncSession | None = None ):
        session = db_session
        filters = []
        if from_date and till_date:
            start_utc, end_utc = await ist_range_to_utc(from_date, till_date)
            filters = [Walkin.created_at.between(start_utc, end_utc)] if from_date and till_date else []

         # Extract JSON fields
        branch_expr = cast(Walkin.questionnaire.op("->>")("joining_branch"), String)
        offering_expr = cast(Walkin.questionnaire.op("->>")("joining_offering"), String)
        counsellor_expr = cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        probability_expr = cast(Walkin.counselling.op("->>")("probability"), String)
        district_expr = cast(Walkin.address_details.op("->>")("district"), String)
        parent_occ_expr = cast(Walkin.parent_details.op("->>")("occupation"), String)
        by_college_expr = cast(Walkin.education_details.op("->>")("college"), String)
        by_uni_expr = cast(Walkin.education_details.op("->>")("university"), String)
        by_spec_expr = cast(Walkin.education_details.op("->>")("specialisation"), String)
        by_source_expr = cast(Walkin.questionnaire.op("->>")("source_of_knowledge"), String)
        by_reason_expr = cast(Walkin.remarks.op("->>")("reason_for_no_admission"),String)
        by_competitor_expr = cast(Walkin.remarks.op("->>")("competitor"),String)

        # Base query
        query = select(func.count(Walkin.id).label("walkin_count"),
                       extract("month", Walkin.created_at).label("month"),
                       extract("year", Walkin.created_at).label("year"))

        # Add fields dynamically to SELECT & GROUP BY
        group_by_columns = [extract("month", Walkin.created_at), extract("year", Walkin.created_at)]
        if by_branch:
            query = query.add_columns(branch_expr.label("branch"))
            group_by_columns.append(branch_expr)
        if by_offering:
            query = query.add_columns(offering_expr.label("offering"))
            group_by_columns.append(offering_expr)
        if by_counsellor:
            query = query.outerjoin(User, User.id == counsellor_expr)
            query = query.add_columns(User.full_name.label("counsellor_name"))
            group_by_columns.append(User.full_name)
        if by_probability:
            query = query.add_columns(probability_expr.label("probability"))
            group_by_columns.append(probability_expr)
        if by_district:
            query = query.add_columns(district_expr.label("district"))
            group_by_columns.append(district_expr)
        if by_parent_occ:
            query = query.add_columns(parent_occ_expr.label("parent_occ"))
            group_by_columns.append(parent_occ_expr)
        if by_college:
            query = query.add_columns(by_college_expr.label("college"))
            group_by_columns.append(by_college_expr)
        if by_uni:
            query = query.add_columns(by_uni_expr.label("uni"))
            group_by_columns.append(by_uni_expr)
        if by_spec:
            query = query.add_columns(by_spec_expr.label("spec"))
            group_by_columns.append(by_spec_expr)
        if by_source:
            query = query.add_columns(by_source_expr.label("source"))
            group_by_columns.append(by_source_expr)
        if by_reason: 
            query = query.add_columns(by_reason_expr.label("reason"))
            group_by_columns.append(by_reason_expr)
            filters.append(Walkin.status == "CLOSED_WITHOUT_ADMISSION")
        if by_competitor: 
            query = query.add_columns(by_competitor_expr.label("competitor"))
            group_by_columns.append(by_competitor_expr)
            filters.append(Walkin.status == "CLOSED_WITHOUT_ADMISSION")
        # if by_date:
        #     group_by_columns.append(Walkin.id)

        if branch_name:
            filters.append(branch_expr == str(branch_name))
        if offering_name:
            filters.append(offering_expr == str(offering_name))

        # if batch_id or offering_id:
        #     query = query.join(Admission, Walkin.admission_id == Admission.id)
        #     query = query.join(Purchase, Purchase.admission_id == Admission.id)
        #     query = query.join(Product, Product.id == Purchase.product_id)

        # if batch_id:
        #     filters.append(Product.batch_id == batch_id)
        # if offering_id:
        #     filters.append(Product.offering_id == offering_id)

        # Apply filters
        query = query.where(*filters)

        # Only apply GROUP BY if there are grouping columns
        if group_by_columns:
            query = query.group_by(*group_by_columns)

        # Execute query
        walkin = await session.execute(query)
        walkin_data =  walkin.mappings().all()
        monthly_summary = defaultdict(list)
        for row in walkin_data:
            month, year = int(row["month"]), int(row["year"])
            financial_year = year if month >= 4 else year 
            key = f"{month}-{financial_year}"
            entry = {"walkin_count": row["walkin_count"]}
            if by_branch:
                entry["branch"] = row.get("branch")
            if by_offering:
                entry["offering"] = row.get("offering")
            if by_counsellor:
                entry["counsellor"] = row.get("counsellor_name")
            if by_probability:
                entry["probability"] = row.get("probability")
            if by_district:
                entry["district"] = row.get("district")
            if by_parent_occ:
                entry["parent_occ"] = row.get("parent_occ")
            if by_college:
                entry["college"] = row.get("college")
            if by_uni:
                entry["uni"] = row.get("uni")
            if by_spec:
                entry["spec"] = row.get("spec")
            if by_source:
                entry["source"] = row.get("source")
            if by_reason: 
                entry["reason"] = row.get("reason")
            if by_competitor: 
                entry["competitor"] = row.get("competitor")
                    
            monthly_summary[key].append(entry)

        # Sorting by financial year (April to March)
        sorted_monthly_summary = {
        k: monthly_summary[k]
        for k in sorted(monthly_summary.keys(), key=lambda x: (int(x.split('-')[1]), int(x.split('-')[0])))
    }
        return sorted_monthly_summary

    async def get_admissions_by_filter(self,by_date:bool,by_branch: bool,by_batch:bool, by_probability: bool, by_counsellor:bool ,
                                        by_offering:bool,by_district:bool,by_parent_occ:bool,by_college:bool,by_uni:bool,by_spec:bool,
                                    by_source:bool, branch_id: int | None = None,batch_id:int | None = None,offering_id:int| None = None,from_date: date| None = None,till_date: date | None = None,db_session:AsyncSession | None = None ):
        session = db_session
        filters = []
        if from_date and till_date:
            start_utc, end_utc = await ist_range_to_utc(from_date, till_date)
            filters = [Admission.admission_date.between(start_utc, end_utc)] if from_date and till_date else []

        month_year_expr = func.to_char(Admission.admission_date, 'MM-YYYY')
        district_expr = cast(Walkin.address_details.op("->>")("district"), String)
        parent_occ_expr = cast(Walkin.parent_details.op("->>")("occupation"), String)
        by_college_expr = cast(Walkin.education_details.op("->>")("college"), String)
        by_uni_expr = cast(Walkin.education_details.op("->>")("university"), String)
        by_spec_expr = cast(Walkin.education_details.op("->>")("specialisation"), String)
        by_source_expr = cast(Walkin.questionnaire.op("->>")("source_of_knowledge"), String)

        query = (select(func.count(Admission.id).label("admission_count"), month_year_expr.label("month_year"))
                            .select_from(Admission)
                            .join(Purchase,Admission.id == Purchase.admission_id)
                            .join(Product,Product.id == Purchase.product_id))
        group_by_columns = [month_year_expr]
        if by_branch:
            query = (query.add_columns(Admission.branch_id.label("branch_id"),Branch.name.label("branch_name"))
                    .select_from(Admission).join(Branch,Branch.id == Admission.branch_id))
            group_by_columns.append(Admission.branch_id)
            group_by_columns.append(Branch.name)
        if by_offering:
            query = (query.add_columns(Product.offering_id.label("offering_id"))
                            )
            group_by_columns.append(Product.offering_id)
    
        if by_batch:
            query = (query.add_columns(Product.batch_id.label("batch_id"))
                           
                            .where(Product.batch_id.isnot(None)))
            group_by_columns.append(Product.batch_id)

        if by_probability:
            probability_expr = cast(Walkin.counselling.op("->>")("probability"), String)
            query = (query.add_columns((probability_expr).label("probability"))
                     .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(probability_expr)
        if by_counsellor:
            counsellor_expr = cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
            query = (query.add_columns((User.full_name).label("counsellor"))
                    .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id).outerjoin(User,User.id == counsellor_expr ))
            group_by_columns.append(User.full_name)
        if by_district:
            query = (query.add_columns((district_expr).label("district"))
                        .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(district_expr)
        if by_parent_occ:
            query = (query.add_columns((parent_occ_expr).label("parent_occ"))
                         .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(parent_occ_expr)
        if by_college:
            query = (query.add_columns((by_college_expr).label("college"))
                         .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(by_college_expr)
        if by_uni:
            query = (query.add_columns((by_uni_expr).label("uni"))
                                       .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(by_uni_expr)
        if by_spec:
            query = (query.add_columns((by_spec_expr).label("spec"))
                                       .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(by_spec_expr)
        if by_source:
            query = (query.add_columns((by_source_expr).label("source"))
                                       .select_from(Admission).join(Walkin,Walkin.id == Admission.walkin_id))
            group_by_columns.append(by_source_expr)


        # if by_date:
        #     group_by_columns.append(Admission.id)

        # if batch_id or offering_id:
        #     query = query.join(Admission, Walkin.admission_id == Admission.id)
        #     query = query.join(Purchase, Purchase.admission_id == Admission.id)
        #     query = query.join(Product, Product.id == Purchase.product_id)

        if branch_id:
            filters.append(Admission.branch_id == branch_id)
        if batch_id:
            filters.append(Product.batch_id == batch_id)
        if offering_id:
            filters.append(Product.offering_id == offering_id)

                            
        query = query.where(*filters)

        # Only apply GROUP BY if there are grouping columns
        if group_by_columns:
            query = query.group_by(*group_by_columns)

        # Execute query
        results = await session.execute(query)
        rows = results.mappings().all()

        # Format results into the required JSON format
        financial_year_data = defaultdict(list)

        for row in rows:
            month_year = row["month_year"]
            admission_count = row["admission_count"]
            entry = {"admission_count": admission_count}

            if by_branch:
                entry["branch_id"] = row.get("branch_id", "Unknown")
                entry["branch_name"] = row.get("branch_name", "Unknown")  # Replace with actual branch name lookup
            if by_offering:
                entry["offering_id"] = row.get("offering_id", "Unknown")
            if by_batch:
                entry["batch_id"] = row.get("batch_id", "Unknown")
            if by_probability:
                entry["probability_id"] = row.get("probability", "Unknown")
            if by_counsellor:
                entry["counsellor_name"] = row.get("counsellor", "Unknown")
            if by_district:
                entry["district"] = row.get("district")
            if by_parent_occ:
                entry["parent_occ"] = row.get("parent_occ")
            if by_college:
                entry["college"] = row.get("college")
            if by_uni:
                entry["uni"] = row.get("uni")
            if by_spec:
                entry["spec"] = row.get("spec")
            if by_source:
                entry["source"] = row.get("source")

            financial_year_data[month_year].append(entry)

        financial_year_start = from_date.month if from_date else 4

        # Define a custom sort key function:
        def financial_sort_key(key):
            # key is in format "MM-YYYY"
            month, year = map(int, key.split('-'))
            # If the month is before the financial year start, adjust it by adding 12.
            adjusted_month = month if month >= financial_year_start else month + 12
            return adjusted_month

        # Sort the keys using the custom sort key:
        
        sorted_financial_year_data = {
        k: financial_year_data[k]
        for k in sorted(financial_year_data.keys(), key=lambda x: (int(x.split('-')[1]), int(x.split('-')[0])))
    }

        return sorted_financial_year_data

    async def get_avg_days_walkin_to_admission(self,branch_id: int | None = None,batch_id:int | None = None,
                                        offering_id:int| None = None,from_date:date| None = None,till_date:date| None = None,db_session:AsyncSession|None =None):
        session = db_session

         # Define filters
        filters = []
        
        if from_date and till_date:
            start_utc, end_utc = await ist_range_to_utc(from_date, till_date)
            filters.append(Walkin.created_at.between(start_utc, end_utc))

        if branch_id:
            filters.append(Admission.branch_id == branch_id)

        if batch_id:
            filters.append(Product.batch_id == batch_id)

        if offering_id:
            filters.append(Product.offering_id == offering_id)
        # counsellor_expr = cast(Walkin.counselling.op("->>")("counsellor_name"), String)
        councellor_expr =cast(Walkin.counselling.op("->>")("counsellor_id"), Integer)
        subquery = (
            select(
                (func.extract("epoch", func.age(Admission.admission_date, func.cast(func.timezone("Asia/Kolkata", Walkin.created_at),Date))) / 86400).label("days_diff"),
                # Walkin.admission_id,
                extract("month", func.timezone("Asia/Kolkata", Walkin.created_at)).label("month"),
                extract("year", func.timezone("Asia/Kolkata", Walkin.created_at)).label("year"),
                councellor_expr.label("counsellor_id")
            ).select_from(Walkin)
            .join(Admission,Walkin.id == Admission.walkin_id)
            .join(Purchase, Purchase.admission_id == Admission.id)  # Assuming purchases link to admissions
            .join(Product, Product.id == Purchase.product_id)
            .where(*filters)
            .subquery()
        )
        
        query = (
                select(
                    subquery.c.counsellor_id,
                    User.full_name.label("counsellor_name"),
                    subquery.c.month,
                    subquery.c.year,
            
                    func.avg(subquery.c.days_diff).label("avg_days")
                )
                .outerjoin(User,User.id == subquery.c.counsellor_id)
                .where(subquery.c.days_diff.isnot(None))  # Avoid null values
                .group_by(subquery.c.month, subquery.c.year, subquery.c.counsellor_id,User.full_name)
                .order_by(subquery.c.year, subquery.c.month, subquery.c.counsellor_id,User.full_name)
            )
        result = await session.execute(query)

        rows = result.mappings().all()

        # Build a dictionary keyed by financial month in the format "MM-YYYY"
        financial_data = defaultdict(list)
         
        for row in rows:
            month, year = int(row["month"]), int(row["year"])
            financial_year = year if month >= 4 else year
            key = f"{month}-{financial_year}"
            entry = {
                "counsellor_id": row["counsellor_id"],
                "counsellor_name": row["counsellor_name"],
                "avg_days": float(row["avg_days"])
            }
            financial_data[key].append(entry)

        # Sorting by financial year (April to March)
        # sorted_monthly_summary = {k: financial_data[k] for k in sorted(financial_data.keys(), key=lambda x: tuple(map(int, x.split('-'))))}
        sorted_monthly_summary = {
        k: financial_data[k]
        for k in sorted(financial_data.keys(), key=lambda x: (int(x.split('-')[1]), int(x.split('-')[0])))
    }
        
        return sorted_monthly_summary
    
    async def get_uncollected_amt(
        self,
        branch_id: int | None = None,
        batch_id: int | None = None,
        offering_id: int | None = None,
        from_date: date | None = None,
        till_date: date | None = None, filter_dropouts: bool | None = None,
        db_session: AsyncSession | None = None
    ):
        session = db_session

        # Build basic filters
        filters = []
       
        if branch_id:
            filters.append(Admission.branch_id == branch_id)  # Assuming branch filter comes via Product or Admission
        if batch_id:
            filters.append(Product.batch_id == batch_id)
        if offering_id:
            filters.append(Product.offering_id == offering_id)
        if filter_dropouts:
            filters.append(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))

        # Compute the date to use for grouping.
        # For original installments, use original_installment_date; for revised, use installment_date.
        group_date_expr = case(
            (PurchaseInstallment.is_original == True, PurchaseInstallment.original_installment_date),
            else_=PurchaseInstallment.installment_date
        ).label("group_date")

        # Extract month and year from the computed date
        month_expr = extract("month", group_date_expr).label("month")
        year_expr = extract("year", group_date_expr).label("year")

        revised_amount = func.sum(
            case(
                (and_(PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status != "CANCELLED",
                      or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None)),
                  PurchaseInstallment.installment_amount),
                else_=0
            )
        ).label("revised_amount")
        
        # Unrevised amount: sum original_installment_amount for rows where is_original is True, is_deleted is False, and transaction_id is NULL
        unrevised_amount = func.sum(
            case(           
                    (and_(
                        PurchaseInstallment.is_original == True,Purchase.purchase_status != "CANCELLED",
                        PurchaseInstallment.installment_status !=  "COMPLETED"
                    ), PurchaseInstallment.original_installment_amount)
                ,
                else_=0
            )
        ).label("unrevised_amount")

        # Build the query: filter for non-deleted installments and apply the date filter on group_date_expr
        query = (
            select(
                month_expr,
                year_expr,
                revised_amount,
                unrevised_amount
            )
            .select_from(PurchaseInstallment)
            .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)  # Ensure linking with purchases
            .join(Product, Product.id == Purchase.product_id)  # Link to Product
            .join(Admission, Admission.id == Purchase.admission_id)
            .where(
                and_(
                    #  or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted == None),
                    group_date_expr.between(from_date, till_date)  # Applies to both original & revised dates
                )
            )
        )
        # Add any additional filters if needed (e.g., branch, batch, offering)
        if filters:
            query = query.where(and_(*filters))

        query = query.group_by(month_expr, year_expr).order_by(year_expr, month_expr)

        result = await session.execute(query)
        rows = result.mappings().all()

       
        monthly_summary = defaultdict(dict)
        for row in rows:
            month = int(row["month"])
            year = int(row["year"])
            financial_year = year 
            key = f"{month:02d}-{financial_year}"
            monthly_summary[key] = {
                "revised_amount": int(row["revised_amount"]),
                "unrevised_amount": int(row["unrevised_amount"])
            }

        # sorted_monthly_summary = {k: monthly_summary[k] for k in sorted(monthly_summary.keys(), key=lambda x: tuple(map(int, x.split('-'))))}
        sorted_monthly_summary = {
                k: monthly_summary[k]
                for k in sorted(monthly_summary.keys(), key=lambda x: (int(x.split('-')[1]), int(x.split('-')[0])))
            }
        return sorted_monthly_summary
        
    async def get_due_report(self, from_date: date | None = None,till_date: date | None = None,branch_id: int | None = None,
                             batch_id:int | None = None,offering_id:int| None = None,legal_entity:str | None = None,
                             student_name: str | None = None,student_phoneno: str | None = None,installment_date: date | None = None, filter_dropouts: bool | None = None,db_session:AsyncSession | None = None):
        session = db_session
        # start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
        # end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_date_with_tz = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_date_with_tz = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        base_filters = []
        if branch_id:
            base_filters.append(Admission.branch_id == branch_id)  # Taken from Admission
        if batch_id:
            base_filters.append(Product.batch_id == batch_id)  # Taken from Product
        if offering_id:
            base_filters.append(Product.offering_id == offering_id)  # Taken from Product
        if student_name:
            base_filters.append(User.full_name.ilike(f"%{student_name}%") )
        if student_phoneno:
            base_filters.append(User.phone_number == student_phoneno) 
        if installment_date:
            base_filters.append(func.date(PurchaseInstallment.installment_date) == installment_date) 
        if legal_entity:
            base_filters.append(PurchaseInstallment.legal_entity_details["name"].as_string() == legal_entity)
        if filter_dropouts:
            base_filters.append(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))


        overdue_original_query = (select(func.count(PurchaseInstallment.id).label("overdue_org_installment_count"),
                                func.sum(PurchaseInstallment.original_installment_amount).label("overdue_org_installment_amt"))
                                .select_from(PurchaseInstallment)
                                .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                                .join(Admission,Admission.id == Purchase.admission_id)
                                .join(User,User.id == Purchase.student_id)
                                .join(Product, Product.id == PurchaseInstallment.product_id)
                                .where(
                                # (func.date(PurchaseInstallment.installment_date).between(start_date_with_tz,end_date_with_tz)),
                                    func.date(PurchaseInstallment.original_installment_date) < from_date,
                                PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status != "CANCELLED",PurchaseInstallment.is_original == True,*base_filters))
        
        overdue_revised_query = (select(func.count(PurchaseInstallment.id).label("overdue_rev_installment_count"),
                        func.sum(PurchaseInstallment.installment_amount).label("overdue_rev_installment_amt"),
                        ).select_from(PurchaseInstallment).join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Product, Product.id == PurchaseInstallment.product_id)
                         .join(User,User.id == Purchase.student_id)
                           .join(Admission,Admission.id == Purchase.admission_id)
                           .where(
                            #    (func.date(PurchaseInstallment.installment_date).between(start_date_with_tz,end_date_with_tz)),
                                func.date(PurchaseInstallment.installment_date) < from_date,
                                PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status != "CANCELLED",or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),*base_filters))
        
        due_datewindow_query = (select(func.count(PurchaseInstallment.id).label("due_rev_installment_count"),
                        func.sum(PurchaseInstallment.installment_amount).label("due_rev_installment_amt"),
                        ).select_from(PurchaseInstallment).join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Product, Product.id == PurchaseInstallment.product_id)
                         .join(User,User.id == Purchase.student_id)
                           .join(Admission,Admission.id == Purchase.admission_id)
                           .where((func.date(PurchaseInstallment.installment_date).between(start_date_with_tz,end_date_with_tz))
                                  ,PurchaseInstallment.installment_status !=  "COMPLETED",Purchase.purchase_status != "CANCELLED",or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),*base_filters))
        
        installment_collected = (select(func.count(PurchaseInstallment.id).label("due_rev_installment_count"),
                        func.sum(PurchaseInstallment.installment_amount).label("due_rev_installment_amt"))
                        .select_from(PurchaseInstallment).join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Transaction, Transaction.id == PurchaseInstallment.transaction_id)
                         .join(User,User.id == Purchase.student_id)
                           .join(Admission,Admission.id == Purchase.admission_id).join(Product, Product.id == PurchaseInstallment.product_id)
                        .where((Transaction.tx_at.between(start_date_with_tz,end_date_with_tz)),PurchaseInstallment.installment_status ==  "COMPLETED",or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),*base_filters))
        
        org_overdue = await session.execute(overdue_original_query)
        revised_overdue = await session.execute(overdue_revised_query)
        due_datewindow = await session.execute(due_datewindow_query)
        collected_installments = await session.execute(installment_collected)

        return {"org_overdue":org_overdue.mappings().all(),"revised_overdue":revised_overdue.mappings().all(),"due_datewindow":due_datewindow.mappings().all(),"collected_installments":collected_installments.mappings().all()}

        # calc overdue by checking inst date with the present date. if inst date is less then over due
        # for org over due,   org inst date should be less then today for conditions, is_original true and is_deleted false.
        # for rev over due, inst date should be less then today for condition, is_deleted false.

        #dues for given time frame(by instal date) calc by filtering is_deleted false, tx_id None

        # installemnt collected for given time frame, check for tx_id in installments and check transaction_date(should be in the time frame) of that installment

        #follow ups
            #table by installment date
        #a.	Today – means due today or before(tx_id none and is_deleted false)
        #b.	This week - means due this week or before(tx_id none and is_deleted false)

    async def get_fee_follow_up(self,from_date: date | None = None,till_date: date | None = None,branch_id: int | None = None,batch_id:int | None = None,
                                 legal_entity: str | None = None,offering_id:int| None = None,db_session:AsyncSession | None = None,limit: int | None = None, 
                                offset: int | None = None, student_name: str | None = None,student_phoneno: str | None = None,installment_date: date | None = None, filter_dropouts: bool | None = None):
        session = db_session

        start_date_with_tz = datetime.combine(from_date, datetime.min.time(), pytz.UTC)
        end_date_with_tz = datetime.combine(till_date, datetime.max.time(), pytz.UTC)
        base_filters = []
        if branch_id:
            base_filters.append(Admission.branch_id == branch_id) 
        if batch_id:
            base_filters.append(Product.batch_id == batch_id)  
        if offering_id:
            base_filters.append(Product.offering_id == offering_id) 
        if student_name:
            base_filters.append(User.full_name.ilike(f"%{student_name}%") )
        if student_phoneno:
            base_filters.append(User.phone_number == student_phoneno) 
        if installment_date:
            base_filters.append(func.date(PurchaseInstallment.installment_date) == installment_date) 
        if legal_entity:
            base_filters.append(PurchaseInstallment.legal_entity_details["name"].as_string() == legal_entity)
        if filter_dropouts:
            base_filters.append(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))
        #student id , student name, student email, student phone, offering id , offering name, product id , product name and product code
        
        subquery = (
                select(
                    PurchaseInstallment.id.label("installment_id"),
                    PurchaseInstallment.purchase_id,
                    PurchaseInstallment.installment_date,
                    PurchaseInstallment.installment_status,
                    PurchaseInstallment.installment_amount,
                    PurchaseInstallment.legal_entity_details,
                    PurchaseInstallment.product_id ,
                    PurchaseInstallment.transaction_id ,
                    PurchaseInstallment.is_original ,
                    PurchaseInstallment.is_deleted ,
                    PurchaseInstallment.original_installment_date ,
                    PurchaseInstallment.original_installment_amount ,
                    PurchaseInstallment.notes,
                    func.count().over(partition_by=PurchaseInstallment.purchase_id).label("total_installments"),
                    func.row_number().over(
                        partition_by=PurchaseInstallment.purchase_id,
                        order_by=PurchaseInstallment.installment_date
                    ).label("installment_number")
                )
                .where(or_(
                    PurchaseInstallment.is_deleted == False,
                    PurchaseInstallment.is_deleted.is_(None)
                ))
                .subquery()
            )

        query = (select(subquery, Purchase.purchase_status.label("purchase_status"), User.full_name.label("student_name"),User.id.label("user_id"),User.email.label("user_email"),User.phone_number.label("user_phno"),
                        Offering.name.label("offering_name"), Offering.id.label("offering_id"), Product.name.label("product_name"),Product.code.label("product_code"),
                        Product.batch_id.label("batch_id"),Admission.branch_id.label("branch_id"),Admission.id.label("admission_id"),Branch.name.label("admission_branch_name"))
                        .select_from(Purchase)
                        .join(subquery, subquery.c.purchase_id == Purchase.id)
                        # .join(PurchaseInstallment,PurchaseInstallment.purchase_id == Purchase.id)
                        .join(Admission,Admission.id == Purchase.admission_id)
                        .outerjoin(Branch,Admission.branch_id == Branch.id)
                        .join(User,User.id == Purchase.student_id)
                        .join(Product,Product.id == Purchase.product_id)
                        .join(Offering,Offering.id == Product.offering_id)
                        .where(
                            func.date(subquery.c.installment_date).between(start_date_with_tz, end_date_with_tz),
                            subquery.c.installment_status != "COMPLETED",
                            Purchase.purchase_status != "CANCELLED",

                            *base_filters
                        )
                        .limit(limit).offset(offset))
        result = await session.execute(query)
        count_query = (
                select(func.count(distinct(PurchaseInstallment.id)))
                .select_from(PurchaseInstallment)
                .join(Purchase, Purchase.id == PurchaseInstallment.purchase_id)
                .join(Admission, Admission.id == Purchase.admission_id)
                .join(User, User.id == Purchase.student_id)
                .join(Product, Product.id == Purchase.product_id)
                .join(Offering, Offering.id == Product.offering_id)
                .where(
                    func.date(PurchaseInstallment.installment_date).between(start_date_with_tz, end_date_with_tz),
                    PurchaseInstallment.installment_status != "COMPLETED",
                    Purchase.purchase_status != "CANCELLED",
                    or_(PurchaseInstallment.is_deleted == False, PurchaseInstallment.is_deleted.is_(None)),
                    *base_filters
                )
            )
        total_counts = (await session.execute(count_query)).scalar()
        items = result.mappings().all()
        return {
                "total_count": total_counts,
                "items": items
            }
    
    async def get_upcoming_installments_by_student_id(self,student_id:int,upto_date:date,filter_dropouts: bool | None = None,db_session:AsyncSession | None = None):
        session = db_session

        query = (select(PurchaseInstallment,Offering.name.label("offering_name"),
                         Purchase)
                        .select_from(PurchaseInstallment)
                        .join(Purchase,Purchase.id == PurchaseInstallment.purchase_id)
                        .join(Admission,Admission.id == Purchase.admission_id)
                        .join(User, User.id == Admission.user_id)
                        .join(Product,Product.id == Purchase.product_id)
                        .join(Offering,Offering.id == Product.offering_id)
                        .where(Purchase.purchase_status == "COMPLETED", User.id == student_id,
                                or_(PurchaseInstallment.is_deleted == False,PurchaseInstallment.is_deleted == None),
                               and_(PurchaseInstallment.installment_status != "COMPLETED", 
                                    func.date(PurchaseInstallment.installment_date) <= upto_date ))
                               .order_by(PurchaseInstallment.purchase_id.asc()))
        if filter_dropouts:
            query = query.where(or_(
            Admission.is_dropout.is_(None),
            Admission.is_dropout.is_(False)
        ))
        result = await session.execute(query)
        purchases = result.mappings().all()
        return purchases
    
    async def get_offering_batches_admission_count(self,offering_id:int| None = None,db_session:AsyncSession | None = None):
        session = db_session

        query = (select(func.count(Admission.id).label("admission_count"),(Offering.name).label("offering_name"),(Product.name).label("prod_name"),(Product.code).label("prod_code"),
                        extract("year", Admission.admission_date).label("year"))
                        .select_from(Admission)
                        .join(Purchase, Admission.id == Purchase.admission_id)
                        .join(Product, Product.id == Purchase.product_id)
                        .join(Offering, Offering.id == Product.offering_id)
                        .where(Product.offering_id == offering_id if offering_id else True,
                                Purchase.purchase_status == "COMPLETED")
                        .group_by(Offering.name,Product.name,Product.code,
                        
                        extract("year", Admission.admission_date).label("year")))
        
        resp = await session.execute(query)
        return resp.mappings().all()
    
    async def get_product_purchases_count(self,db_session:AsyncSession|None= None):
        session = db_session
        # today purchase counts
        today_purchase_count = (
            select(
                func.count(Purchase.id).label("today_count"),
                Product.id.label("product_id"),
                Product.name.label("prod_name"),
            )
            .join(Product, Product.id == Purchase.product_id)
            .where(
                func.date(Purchase.purchase_date) == datetime.today().date(),
                Purchase.purchase_status == "COMPLETED",
            )
            .group_by(Product.id, Product.name)
            .subquery()
        )

        # total purchase counts
        total_purchase_count = (
            select(
                func.count(Purchase.id).label("total_count"),
                Product.id.label("product_id"),
                Product.name.label("prod_name"),
            )
            .join(Product, Product.id == Purchase.product_id)
            .where(Purchase.purchase_status == "COMPLETED")
            .group_by(Product.id, Product.name)
            .subquery()
        )

        # target counts
        target_count = (
            select(
                Product.id.label("product_id"),
                Product.name.label("prod_name"),
                Product.target_count.label("prod_target_count"),
            )
            .where(Product.status == "PUBLISHED")
            .subquery()
        )

        # final join
        final_query = (
            select(
                target_count.c.prod_name,
                func.coalesce(target_count.c.prod_target_count, 0).label("prod_target_count"),
                func.coalesce(today_purchase_count.c.today_count, 0).label("today_count"),
                func.coalesce(total_purchase_count.c.total_count, 0).label("total_count"),
            )
            .select_from(target_count)
            .outerjoin(today_purchase_count, target_count.c.product_id == today_purchase_count.c.product_id)
            .outerjoin(total_purchase_count, target_count.c.product_id == total_purchase_count.c.product_id)
        )

        result = await session.execute(final_query)
        return result.mappings().all()
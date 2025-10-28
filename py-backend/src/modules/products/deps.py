import json
from typing import Any, List
from fastcrud import JoinConfig
from datetime import datetime, timedelta, timezone
from src.base.service import BaseCRUD
from src.modules.products.models import Product,Purchase,Price,Enrollment
from src.users.routes import service
# from .routes import product_crud, purchase_crud, price_crud
from fastapi_async_sqlalchemy import db
from sqlalchemy.ext.asyncio import AsyncSession

product_crud = BaseCRUD(model=Product)
price_crud = BaseCRUD(model = Price)
enrollment_crud = BaseCRUD(model= Enrollment)
purchase_crud = BaseCRUD(model=Purchase)

class DiscountPolicyCheck:
    def __init__(self) -> None:
        pass

    async def disc_check(self, product_ids:list[int], user_id:int, db_session: AsyncSession | None = None):
       
        foundation_purchases = await service.get_purchases_with_prod_filter(user_id=user_id,category="FOUNDATION_COURSES",db_session=db_session)
        value_addn_purchases = await service.get_purchases_with_prod_filter(user_id=user_id,category="VALUE_ADDITION_COURSES",db_session=db_session)
        
        if product_ids:
            prod_categories = []
            discounts_applied = []
            has_value_addition_course = False
            has_foundation_course = False

            # Step 1: Gather product categories for each prod_id
            for prod_id in product_ids:
                product_db: Product = await product_crud.get(id=prod_id, db=db_session)
                category = product_db.offering.offering_category
                name = product_db.offering.name
                prod_categories.append({"prod_id": prod_id, "category": category, "name": name})

                # Step 2: Check for required categories
                if category == "VALUE_ADDITION_COURSES":
                    has_value_addition_course = True
                elif category == "FOUNDATION_COURSES":
                    has_foundation_course = True

            # Step 3: Conditional checks based on categories
            if has_value_addition_course and has_foundation_course:
                for prod in prod_categories:
                    if prod["category"] in ["VALUE_ADDITION_COURSES"]:
                        if prod["name"].startswith("Rapid Revision Program"):
                            product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                            price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                            discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": "1",
                                "discount_applied":  price_db.selling_price
                            })
                        else:
                            product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                            price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                            discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": None,
                                "discount_applied": 0
                            })
                    else:
                        price_db =  await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                        discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": None,
                            "discount_applied":  0
                        }) 
            elif has_value_addition_course:
                for prod in prod_categories:
                    product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                    price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                    if foundation_purchases:
                        if prod["name"].startswith("Rapid Revision Program"):
                            if (
                                product_db.batch_id
                                and (
                                    product_db.batch.planned_end_date
                                ) >= datetime.now(timezone.utc) - timedelta(days=300)
                            ):
                                discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": "1",
                                "discount_applied":  price_db.selling_price,
                            })
                            elif foundation_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                                discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": "1",
                                "discount_applied":  price_db.selling_price,
                            })
                            else:
                                discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": None,
                                "discount_applied":  0,
                            })

                        elif value_addn_purchases and value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                            discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "4",
                            "discount_applied":  (price_db.selling_price/2)
                        })
                        else:
                            discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "2",
                            "discount_applied": 0.30 * price_db.selling_price
                        })
                            # return {"amount": price_db.selling_price, "discount_no": 1, "discount_amount": price_db.selling_price}
                    elif value_addn_purchases and value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                            discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "4",
                            "discount_applied":  (price_db.selling_price/2)
                        })
                        # return {"amount": price_db.selling_price, "discount_no": 6, "discount_amount":50%(price_db.selling_price)} 
                    elif  price_db.early_bird_price and  price_db.early_bird_valid_until >= datetime.now(timezone.utc):
                        discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "3",
                            "discount_applied":  0.20*(price_db.selling_price)
                        })
                    else:
                        discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": None,
                                "discount_applied":  0,
                            })

                        # return {"amount": price_db.selling_price, "discount_no": 3, "discount_amount": price_db.early_bird_price} 
            elif has_foundation_course:
                for prod in prod_categories:
                    product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                    price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
            
                    if  price_db.early_bird_price and  price_db.early_bird_valid_until >= datetime.now(timezone.utc):
                        discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "1",
                            "discount_applied":  price_db.early_bird_price
                        })
                    else:
                        discounts_applied.append({
                                "prod_id": prod["prod_id"],
                                "selling_price": price_db.selling_price,
                                "discount_no": None,
                                "discount_applied":  0,
                            })
            else:
                discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": None,
                        "discount_applied":  0,
                    })
        return discounts_applied

    async def fc_and_vac_check(self,prod_categories:List[Any],user_id:int, db_session: AsyncSession | None = None):
        discounts_applied = []
        for prod in prod_categories:
            if prod["category"] in ["VALUE_ADDITION_COURSES"]:
                if prod["name"].startswith("Rapid Revision Program") or prod["name"].startswith("Test Series") :
                    product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                    price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                    discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": "1",
                        "discount_applied":  price_db.selling_price
                    })
                else:
                    value_addn_purchases = await service.get_purchases_with_prod_filter(user_id=user_id,category="VALUE_ADDITION_COURSES",db_session=db_session)
                    product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                    price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                    if value_addn_purchases and value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                        discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "4",
                            "discount_applied":  (price_db.selling_price/2)
                        })
                    else:
                        discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "2",
                            "discount_applied":  0.30*(price_db.selling_price)
                        })
            else:
                product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
                price_db =  await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
                discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": None,
                    "discount_applied":  0
                }) 
        return discounts_applied
    
    async def fc_check(self,prod_categories:List[Any], db_session: AsyncSession | None = None):
        discounts_applied = []
        for prod in prod_categories:
            product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
            price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
    
            if  price_db.early_bird_price and  price_db.early_bird_valid_until >= datetime.now(timezone.utc):
                discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": "3",
                    "discount_applied":  0.20*(price_db.selling_price)
                })
            else:
                discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": None,
                        "discount_applied":  0,
                    })
        return discounts_applied
    
    async def vac_check(self,prod_categories:List[Any], user_id:int, db_session: AsyncSession | None = None):
        foundation_purchases = await service.get_purchases_with_prod_filter(user_id=user_id,category="FOUNDATION_COURSES",db_session=db_session)
        value_addn_purchases = await service.get_purchases_with_prod_filter(user_id=user_id,category="VALUE_ADDITION_COURSES",db_session=db_session)
        discounts_applied = []
        for prod in prod_categories:
            product_db : Product = await product_crud.get(id=prod["prod_id"],db=db_session)
            price_db = await price_crud.get_by_field(value=product_db.price_id, field="id", db = db_session)
            if foundation_purchases and prod["category"] in ["VALUE_ADDITION_COURSES"] :
                if prod["name"].startswith("Rapid Revision Program") or prod["name"].startswith("Test Series"):
                    if (
                        product_db.batch_id
                        and (
                            product_db.batch.planned_end_date
                            if product_db.batch.planned_end_date
                            else product_db.batch.planned_start_date + timedelta(days=product_db.batch.duration)
                        ) >= datetime.now(timezone.utc) - timedelta(days=300)
                    ):
                        print("FULL DISC")
                        discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": "1",
                        "discount_applied":  price_db.selling_price,
                    })
                    elif foundation_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                        print("FULL DISC")
                        discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": "1",
                        "discount_applied":  price_db.selling_price,
                    })
                    else:
                        if value_addn_purchases and value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                            discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "4",
                            "discount_applied":  (price_db.selling_price/2)
                            })
                        else:
                            discounts_applied.append({
                            "prod_id": prod["prod_id"],
                            "selling_price": price_db.selling_price,
                            "discount_no": "2",
                            "discount_applied": 0.30 * price_db.selling_price
                            })

                elif value_addn_purchases and value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                    discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": "4",
                    "discount_applied":  (price_db.selling_price/2)
                })
                else:
                    discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": "2",
                    "discount_applied": 0.30 * price_db.selling_price
                })
                    
            elif value_addn_purchases and prod["category"] in ["VALUE_ADDITION_COURSES"] and  value_addn_purchases[0].created_at >= datetime.now(timezone.utc) - timedelta(days=365):
                    discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": "4",
                    "discount_applied":  (price_db.selling_price/2)
                })
               
            elif  price_db.early_bird_price and  price_db.early_bird_valid_until >= datetime.now(timezone.utc):
                discounts_applied.append({
                    "prod_id": prod["prod_id"],
                    "selling_price": price_db.selling_price,
                    "discount_no": "3",
                    "discount_applied":  0.20*price_db.selling_price
                })
            else:
                discounts_applied.append({
                        "prod_id": prod["prod_id"],
                        "selling_price": price_db.selling_price,
                        "discount_no": None,
                        "discount_applied":  0,
                    })
        return discounts_applied

disc_check = DiscountPolicyCheck()
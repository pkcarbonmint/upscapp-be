from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, JSON, String, DateTime, Integer, Boolean
from src.base.models import BaseMixin
from src.database.database import Base
from sqlalchemy.dialects.postgresql import ARRAY
from src.users.models import User, DiscountCode
from src.modules.frontdesk.models import Admission

class Product(Base,BaseMixin):
    __tablename__ = "products"

    offering_id: Mapped[int] = mapped_column(ForeignKey("offerings.id"))
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=True)
    price_id: Mapped[int] = mapped_column(ForeignKey("prices.id"), nullable=True)
    branch_id = mapped_column(ForeignKey("branches.id"))	
    name = mapped_column(String, nullable=True)	
    code = mapped_column(String, nullable=True)
    allow_installments: Mapped[bool] = mapped_column(default=False)
    allow_booking: Mapped[bool] = mapped_column(default=False)
    allow_early_bird: Mapped[bool] = mapped_column(default=False)
    product_details = mapped_column(JSON) # will have meta data like material info if offering_sub_type is materials, q_bank if offering_sub_type is qbank
    status = mapped_column(String)
    offering = relationship("Offering", lazy="joined")
    batch = relationship("Batch",lazy="joined")
    price = relationship("Price", lazy="joined")
    branch = relationship("Branch",lazy="joined")


class Offering(Base,BaseMixin):
    __tablename__ = "offerings"	

    offering_type = mapped_column(String)#(program or standalone)
    offering_sub_type = mapped_column(String) #	(mentorship, test series,interview program,courses,materials,qbank) # product type
    is_batch_offering: Mapped[bool] = mapped_column(default=False)
    offering_category = mapped_column(String) # "FOUNDATION_COURSES","VALUE_ADDITION_COURSES","OTHERS"
    display_seq_id = mapped_column(Integer)	
    name = mapped_column(String)
    photo = mapped_column(String)
    exams = mapped_column(ARRAY(JSON))
    stages = mapped_column(ARRAY(JSON), nullable=True)		
    papers = mapped_column(ARRAY(JSON), nullable=True)		
    subjects = mapped_column(ARRAY(JSON), nullable=True)	
    walkin_category = mapped_column(String, nullable=True)
    offering_details = mapped_column(JSON) # (meta data like description,related courses)
    status = mapped_column(String)
    # batches	= relationship("Batch", back_populates=)
    # products = relationship("Product",back_populates=)

class Batch(Base,BaseMixin):
    __tablename__ = "batches"

    offering_id: Mapped[int] = mapped_column(ForeignKey("offerings.id"))
    # branch_id = mapped_column(ForeignKey("branches.id"))	
    # name = mapped_column(String, nullable=True)	
    # code = mapped_column(String, nullable=True)
    max_students = mapped_column(Integer)
    students_enrolled = mapped_column(Integer)	
    status = mapped_column(String)	# (draft,published)					
    batch_details = mapped_column(JSON) # (optonal_subject for optional subject batch, test_count for test series,allow_booking, allow_early_bird_price)	
    enrollment_close_date = mapped_column(DateTime(timezone=True), nullable=True)
    planned_start_date = mapped_column(DateTime(timezone=True), nullable=True)	
    planned_end_date = mapped_column(DateTime(timezone=True), nullable=True)		
    actual_start_date = mapped_column(DateTime(timezone=True), nullable=True)		
    actual_end_date = mapped_column(DateTime(timezone=True), nullable=True)	
    duration = mapped_column(Integer, nullable=True)
    batch_incharge = mapped_column(ForeignKey("users.id"))
    # branch = relationship("Branch",lazy="joined")

    # teachers = mapped_column()
    # mentors = mapped_column()

class Enrollment(Base,BaseMixin):
    __tablename__ = "enrollments"

    enrolled_as = mapped_column(String) # student, teacher, mentor, guide
    enrolled_user_id = mapped_column(ForeignKey("users.id"))
    batch_id = mapped_column(ForeignKey("batches.id"), nullable=True)
    offering_id = mapped_column(ForeignKey("offerings.id"))
    product_id = mapped_column(ForeignKey("products.id"))
    enrollment_status = mapped_column(String)
    assigned_mentor_id = mapped_column(Integer, nullable=True)#only for student enrollments - to assign a mentor from the batch mentors, id is id of user
    assigned_guide_id = mapped_column(Integer, nullable=True) # assigning guide for student enrollments in studyplans
    enrolled_user = relationship("User", lazy="joined")
    # purchase_id = mapped_column(ForeignKey("purchases.id")) #only for student enrollements - to map to a purchase


class Price(Base,BaseMixin):
    __tablename__ = "prices"	

    booking_price = mapped_column(Integer, nullable=True)	
    selling_price = mapped_column(Integer, nullable=True)	
    early_bird_price = mapped_column(Integer, nullable=True)	
    discounted_price = mapped_column(Integer, nullable=True)
    pricing_model = mapped_column(String) #(onetime or recurring)	
    effective_date = mapped_column(DateTime(timezone=True), nullable=True)	
    expiry_date = mapped_column(DateTime(timezone=True), nullable=True)	
    early_bird_valid_until = mapped_column(DateTime(timezone=True), nullable=True)	
    price_break_up= mapped_column(ARRAY(JSON))


class TierPrice(Base,BaseMixin):
    __tablename__ = "tierprices"

    price_id = mapped_column(Integer, ForeignKey("prices.id"))
    tier_level = mapped_column(String) #Enum("Basic", "Standard", "Premium")
    tier_price = mapped_column(Integer, nullable=True)
    billing_frequency = mapped_column(String) #Enum("One-Time", "Monthly", "Annually")
    recurring_amount = mapped_column(Integer)
    feature_set = mapped_column(ARRAY(JSON))
    quota_limit = mapped_column(Integer)


class Purchase(Base,BaseMixin):
    __tablename__ = "purchases"

    product_id = mapped_column(Integer, ForeignKey("products.id"))
    price_id = mapped_column(Integer, ForeignKey("prices.id"))
    tier_price_id = mapped_column(Integer, ForeignKey("tierprices.id"), nullable=True)
    admission_id = mapped_column(ForeignKey("admissions.id"), nullable = True)
    purchase_type = mapped_column(String, default=False) # booking or bought
    student_id = mapped_column(Integer, ForeignKey("users.id"))
    quantity = mapped_column(Integer)
    intallments_count = mapped_column(Integer)
    purchase_date = mapped_column(DateTime(timezone=True), nullable=True)
    pricing_model = mapped_column(String) #Enum("One-Time", "Recurring")
    amount = mapped_column(Integer)
    discount_id = mapped_column(ForeignKey("discountcodes.id"))
    discount_amount= mapped_column(Integer, default=0)
    additional_discount_id = mapped_column(ForeignKey("discountcodes.id"))
    additional_disc_amt = mapped_column(Integer, default=0)
    total_amount = mapped_column(Integer) 
    billing_frequency = mapped_column(String) #Enum("One-Time", "Monthly", "Annually")
    recurring_count = mapped_column(Integer, nullable=True) # for pricing model recurring
    purchase_status = mapped_column(String)
    transaction_id = mapped_column(Integer, ForeignKey("transactions.id"))
    refund_tx_id = mapped_column(Integer,ForeignKey("transactions.id"))
    refund_amount = mapped_column(Integer)
    purchase_details = mapped_column(JSON)
    # discount = relationship("DiscountCode", lazy="selectin")

    purchase_installments = relationship("PurchaseInstallment", lazy="selectin")
    # transactions = relationship("Transaction", lazy="selectin")
    legal_entity_details = mapped_column(JSON) # only when it is bought without installments
    

class PurchaseInstallment(Base,BaseMixin):
    __tablename__ = "purchaseinstallments"

    price_id = mapped_column(Integer, ForeignKey("prices.id"))
    product_id = mapped_column(Integer, ForeignKey("products.id"))
    tier_price_id = mapped_column(Integer, ForeignKey("tierprices.id"), nullable=True)
    purchase_id = mapped_column(Integer, ForeignKey("purchases.id"))
    transaction_id = mapped_column(Integer, ForeignKey("transactions.id"))

    is_original = mapped_column(Boolean, default= False) # for first time creation of installment it will be true, for subsequent revision of payments it will be false
    is_deleted = mapped_column(Boolean, default= False) # always soft delete when user deletes the installment and installment should not be deleted or modified when payment for installment is already made

    # both original_installment_date and installment_date will be populated for first time creation of installment, for subsequent changes only installment_date will change

    installment_date = mapped_column(DateTime(timezone=True))
    original_installment_date = mapped_column(DateTime(timezone=True)) #will be null for is_original false

    # both original_installment_amount and installment_amount will be populated for first time creation of installment, for subsequent changes only installment_date will change

    installment_amount = mapped_column(Integer)
    original_installment_amount = mapped_column(Integer) #will be null for is_original false

    installment_status = mapped_column(String)

    notes = mapped_column(ARRAY(JSON))

    legal_entity_details = mapped_column(JSON)
	
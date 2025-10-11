from typing import Annotated, Any, Optional
from src.base.schemas import BaseSchema, PhoneNumber
from pydantic import EmailStr, Field, PlainSerializer, field_serializer
from enum import Enum
from datetime import datetime, date

from src.modules.products.schemas import OFFERING_CATEGORY, WALKINFORM_TYPE
from src.tenants.schemas import BranchResponse
from src.users.schemas import UserResponse

class GENDER(str, Enum):
    male = "Male"
    female = "Female"

class STATUS(str,Enum):
    active = "ACTIVE"
    inactive = "INACTIVE"

class WALKIN_STATUS(str,Enum):
    new = "NEW"
    saved = "SAVED"
    created = "CREATED"
    counselling_completed = "COUNSELLING_COMPLETED"
    closed_w_admission = "CLOSED_WITH_ADMISSION"
    closed_w_admission_signed = "CLOSED_WITH_ADMISSION_SIGNED"
    closed_w_o_admission = "CLOSED_WITHOUT_ADMISSION"
    closed_w_booking = "CLOSED_WITH_BOOKING"
    closed_w_provisional_admission = "CLOSED_WITH_PROVISIONAL_ADMISSION" # if for cheque payment
    cancelled = "CANCELLED"

class COUNSELLING_STATUS(str,Enum):
    new = "NEW"
    saved = "SAVED"
    created = "CREATED"
    counselling_completed = "COUNSELLING_COMPLETED"
    closed_w_admission = "CLOSED_WITH_ADMISSION"
    closed_w_admission_signed = "CLOSED_WITH_ADMISSION_SIGNED"
    closed_w_o_admission = "CLOSED_WITHOUT_ADMISSION"
    closed_w_booking = "CLOSED_WITH_BOOKING"
    closed_w_provisional_admission = "CLOSED_WITH_PROVISIONAL_ADMISSION" # if for cheque payment

class INSTITUTION_TYPE(str,Enum):
    colleges = "colleges"
    universities = "universities"

class QUALIFICATION(str,Enum):
    intermediate = "INTERMEDIATE"
    graduation = "GRADUATION"
    post_graduation = "POST_GRADUATION"

class SPECIALISATION(str, Enum):
    cec = "CEC"
    mpc = "MPC"
    bipc = "BiPC"
    mec = "MEC"
    hec = "HEC"
    heg = "HEG"
    cbse_or_icse = "CBSE/ICSE"
    mlc = "MLC"
    inter_ias = "Inter+IAS"
    vocational_course = "Vocational course"

    ba = "Bachelor of Arts (B.A.)"
    bcom = "Bachelor of Commerce (B.Com)"
    bsc = "Bachelor of Science (B.Sc.)"
    btech = "Bachelor of Technology (B.Tech)"
    be = "Bachelor of Engineering (B.E)"
    bba = "Bachelor of Business Administration (BBA)"
    bms = "Bachelor of Management Studies (BMS)"
    llb = "Bachelor of Laws (LL.B) - 3 years"
    integrated_llb = "Integrated LL.B (B.A. LL.B/B.Com. LL.B) - 5 years"
    mbbs = "Bachelor of Medicine, Bachelor of Surgery (MBBS)"
    bds = "Bachelor of Dental Surgery (BDS)"
    bams = "Bachelor of Ayurvedic Medicine and Surgery (BAMS)"
    bhms = "Bachelor of Homeopathic Medicine and Surgery (BHMS)"
    bpt = "Bachelor of Physiotherapy (BPT)"
    bpharm = "Bachelor of Pharmacy (B.Pharm)"
    bvsc = "Bachelor of Veterinary Science (B.V.Sc.)"
    bca = "Bachelor of Computer Applications (BCA)"
    bfa = "Bachelor of Fine Arts (BFA)"
    bdes = "Bachelor of Design (B.Des)"
    barch = "Bachelor of Architecture (B.Arch)"
    bhm = "Bachelor of Hotel Management (BHM)"
    bttm = "Bachelor of Tourism and Travel Management (BTTM)"
    bed = "Bachelor of Education (B.Ed.)"
    bsc_agriculture = "Bachelor of Science in Agriculture (B.Sc. Agriculture)"
    bsw = "Bachelor of Social Work (BSW)"

    ma = "Master of Arts (M.A.)"
    mcom = "Master of Commerce (M.Com)"
    msc = "Master of Science (M.Sc.)"
    mtech = "Master of Technology (M.Tech)"
    me = "Master of Engineering (M.E)"
    mba = "Master of Business Administration (MBA)"
    mms = "Master of Management Studies (MMS)"
    llm = "Master of Laws (LL.M)"
    md = "Doctor of Medicine (M.D.)"
    ms = "Master of Surgery (M.S.)"
    mds = "Master of Dental Surgery (MDS)"
    mpharm = "Master of Pharmacy (M.Pharm)"
    mph = "Master of Public Health (MPH)"
    mvsc = "Master of Veterinary Science (M.V.Sc.)"
    mca = "Master of Computer Applications (MCA)"
    mfa = "Master of Fine Arts (MFA)"
    mdes = "Master of Design (M.Des)"
    march = "Master of Architecture (M.Arch)"
    mhm = "Master of Hotel Management (MHM)"
    mttm = "Master of Tourism and Travel Management (MTTM)"
    med = "Master of Education (M.Ed.)"
    msc_agriculture = "Master of Science in Agriculture (M.Sc. Agriculture)"
    msw = "Master of Social Work (MSW)"

class OCCUPATION(str, Enum):
    architect = "Architect"
    auditor = "Auditor"
    auto_rickshaw_driver = "Auto Rickshaw Driver"
    ayurvedic_homeopathic_practitioner = "Ayurvedic/Homeopathic Practitioner"
    bank_employee = "Bank Employee"
    carpenter = "Carpenter"
    chartered_accountant = "Chartered Accountant (CA)"
    chemical_engineer = "Chemical Engineer"
    civil_contractor = "Civil Contractor"
    civil_engineer = "Civil Engineer"
    college_professor = "College/University Professor"
    construction_manager = "Construction Manager"
    corporate_lawyer = "Corporate Lawyer"
    defence_services = "Defence Services (Army, Navy, Air Force)"
    delivery_executive = "Delivery Executive"
    dentist = "Dentist"
    digital_marketing_specialist = "Digital Marketing Specialist"
    doctor = "Doctor (General Practitioner, Surgeon, Specialist)"
    educational_consultant = "Educational Consultant"
    electrical_engineer = "Electrical Engineer"
    electrician = "Electrician"
    electronics_engineer = "Electronics Engineer"
    entrepreneur = "Entrepreneur"
    environmental_scientist = "Environmental Scientist"
    farmer = "Farmer"
    fashion_designer = "Fashion Designer"
    financial_analyst = "Financial Analyst"
    forest_officer = "Forest Officer"
    goldsmith = "Goldsmith"
    graphic_designer = "Graphic Designer"
    home_maker = "Home maker"
    ias_officer = "Indian Administrative Service (IAS) Officer"
    ifs_officer = "Indian Foreign Service (IFS) Officer"
    ips_officer = "Indian Police Service (IPS) Officer"
    insurance_agent = "Insurance Agent"
    investment_banker = "Investment Banker"
    judge = "Judge"
    lawyer_advocate = "Lawyer/Advocate"
    legal_consultant = "Legal Consultant"
    librarian = "Librarian"
    market_research_analyst = "Market Research Analyst"
    mechanic = "Mechanic"
    mechanical_engineer = "Mechanical Engineer"
    media_person = "Media person"
    medical_lab_technician = "Medical Lab Technician"
    municipal_worker = "Municipal Corporation Worker"
    nurse = "Nurse"
    others = "Others"
    pharmacist = "Pharmacist"
    photographer = "Photographer"
    physiotherapist = "Physiotherapist"
    plumber = "Plumber"
    police = "Police"
    politician = "Politician"
    psychologist_counselor = "Psychologist/Counselor"
    railway_emp = "Railway Employee"
    real_estate_agent = "Real Estate Agent"
    revenue_officer = "Revenue Officer"
    sales_manager = "Sales Executive/Manager"
    school_teacher = "School Teacher"
    small_business_owner = "Small Business Owner"
    social_media_manager = "Social Media Manager"
    software_developer = "Software Developer"
    tailor = "Tailor"
    truck_driver = "Truck Driver"
    rtc_department = "RTC Department"
    irrigation_department = "Irrigation Department"
    health_department = "Health department"

class SECTOR(str, Enum):
    central_govt = "Central Govt"
    state_govt = "State Govt"
    private_sector = "Private sector"
    business = "Business"
    contractor = "Contractor"
    ngo = "NGO"
    educational_institution = "Educational institution"
    cooperative_societies = "Cooperative Societies"
    mncs = "MNCs"
    industry_association = "Industry Association"
    startups_tech_hubs = "Startups & Tech Hubs"

class SOURCE_OF_KNOW(str, Enum):
    google_search = "Google Search"
    twitter = "Twitter"
    linkedin = "LinkedIn"
    instagram = "Instagram"
    facebook = "Facebook"
    radio = "Radio"
    friends_or_family = "Friends or Family"
    alumni = "Alumni"
    events = "Events"
    brochures = "Brochures"
    you_tube = "YouTube"
    direct_walkin = "Direct walk-in"

class HIGHEST_LEVEL(str, Enum):
    prelims = "PRELIMS"
    mains = "MAINS"
    interview = "INTERVIEW"

class WALKIN_TYPE(str, Enum):
    full = "FULL"
    quick = "QUICK"
    
class WalkinRemarks(BaseSchema):
    reason_for_no_admission: str
    competitor: str

class ProfileDetails(BaseSchema):
    name: str | None = None
    gender: GENDER | None = None
    birth_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    phone_number: PhoneNumber | None = None
    email: EmailStr | None = None
    interested_offering_category: str | None = None
    interested_offering: str | None = None
    reservation_category: str | None = None
    #for intermediate walkin
    aadhar_no: str | None = None
    religion: str | None = None

class EducationEntry(BaseSchema):
    institute_name: str # description="School or College name"
    board: str | None = None
    marks: float | None = None
    cgpa: float | None = None
    year_of_completion: int  | None = None

class EducationDetails(BaseSchema):
    qualification: str| None = None 
    is_ias_integrated_course: bool | None = None
    specialisation: str | None = None
    grad_year: int | None = None
    college: str | None = None #
    university: str | None = None #
    city: str | None = None
    district: str | None = None
    state: str | None = None
    zip_code: int | None = None
    tenth: EducationEntry | None = None
    twelfth: EducationEntry | None = None
    # school: EducationEntry | None = None


class SchoolEduDetails(BaseSchema):
    school_name: str | None = None
    class_num: str | None = None
    board: str | None = None
    marks: float | None = None
    cgpa: float | None = None
    completion_year: int | None = None
    
class FamilyDetails(BaseSchema):
    name: str
    relation: str  # e.g., Brother, Sister
    if_sibling: bool | None = None
    mobile_number: Optional[str] = None
    occupation: Optional[str] = None
    class_name: Optional[str] = None # e.g., 10th, Inter 1st Year
    institute_name: Optional[str] = None

class ParentDetails(BaseSchema):
    name: str | None = None
    relation: str | None = None
    phone_number: PhoneNumber | None = None
    occupation: str | None = None
    company: str | None = None

class AddressDetails(BaseSchema):
    # address: str | None = None
    h_no: str | None = None
    city: str | None = None
    street: str | None = None
    district: str | None = None
    state: str | None = None
    zipcode: int | None = None

class UpscDetails(BaseSchema):
    attempts_count: int | None = None
    highest_level: str | None = None

class EmploymentDetails(BaseSchema):
    company: str | None = None
    employment_type: str | None = None

class AccommodationDetails(BaseSchema):
    hostel_required: bool | None = None
    room_type: str | None = None
    sharing_count: int | None = None
    transport_required: bool | None = None

class AdmissionType(str, Enum):
    day_scholar = "Day scholar"
    semi_residential = "Semi-Residential"
    residential = "Residential"

class CourseDetails(BaseSchema):
    class_selection: str | None = None
    group_selection: str | None = None
    coaching_selection: str | None = None
    admission_type: AdmissionType


class Questionnaire(BaseSchema):
    joining_city: str | None = None
    joining_branch: str | None = None
    joining_offering: str | None = None
    is_optional_program: bool | None = None
    optional: str | None = None
    tentative_joining_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    source_of_knowledge: str | None = None
    referred_by: str | None = None
    Referrer_ph_no: PhoneNumber | None = None
    reason_for_choosing: str | None = None
    feedback: str | None = None

class Counselling(BaseSchema):
    counselling_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    probability: int | None = None
    counsellor_id: int | None = None
    counsellor_name: str | None = None
    tentative_joining_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    follow_up_date: Optional[Annotated[date, PlainSerializer(lambda dt: dt.isoformat())]]
    walkin_remark_form_url : str | None = None
    status: COUNSELLING_STATUS | None = None

class UPSCAttempt(BaseSchema):
    year: int | None = None
    roll_no: str | None = None
    stage: str | None = None
    marks_list: str | None = None  # Prelims / Mains / Interview / Marks list

class PreviousSelection(BaseSchema):
    service_post: str | None = None
    year: int | None = None
    roll_no: str | None = None

class ExamInfo(BaseSchema):
    has_appeared_upsc: bool | None = None
    upsc_attempts: Optional[list[UPSCAttempt]] = []
    upsc_optional_subject: Optional[str] = None
    has_previous_selection: bool | None = None
    previous_selections: Optional[list[PreviousSelection]] = []

class CoachingDetail(BaseSchema):
    taken: bool
    institute_name: Optional[str] = None

class CoachingInfo(BaseSchema):
    coached_at_laex: bool
    coached_laex_programs: list[str] = []
    coached_elsewhere: bool
    gs: Optional[CoachingDetail] = None
    optional: Optional[CoachingDetail] = None
    test_series: Optional[CoachingDetail] = None
    mentorship: Optional[CoachingDetail] = None

class DAFInfo(BaseSchema):
    filename: str
    link: str

class DafDetails(BaseSchema):
    daf1_file_url: Optional[DAFInfo] = None
    daf2_file_url: Optional[DAFInfo] = None
    others: Optional[list[DAFInfo]] = []

class PrevTranscript(BaseSchema):
    board_name: str
    document: Optional[DAFInfo] = None 

class WalkinBase(BaseSchema):
    pass

class WalkinCreate(WalkinBase): 
    profile_details: ProfileDetails | None = None
    education_details: EducationDetails | None = None
    school_edu_details: SchoolEduDetails | None = None  #added
    parent_details: ParentDetails | None = None
    family_details: list[FamilyDetails] | None = None  # ADDED
    address_details: AddressDetails | None = None
    upsc_details: UpscDetails | None = None
    employment_details: EmploymentDetails | None = None
    accommodation_details: AccommodationDetails | None = None
    course_details: CourseDetails | None = None
    questionnaire: Questionnaire | None = None
    counselling: Counselling | None = None
    exam_info: ExamInfo | None = None
    coaching_info: CoachingInfo  | None = None
    daf_details: DafDetails | None = None
    previous_transcripts: list[PrevTranscript] | None = None
    walkin_type: WALKIN_TYPE | None = None
    walkin_category: WALKINFORM_TYPE | None = None
    remarks: WalkinRemarks | None = None
    status: WALKIN_STATUS | None = None
    

class WalkinUpdate(WalkinCreate):
    user_id:int | None = None
    admission_id:int | None = None

class WalkinMasterDataUpdate(BaseSchema):
    is_college: bool  
    is_university: bool  
    old_name: str | None = None
    new_name: str | None = None

class AdmissionDetails(BaseSchema):
    admission_manager_name: str | None = None
    admission_manager_id: int | None = None
    deal_id: str | None = None


class AdmissionBase(BaseSchema):
    pass 

class AdmissionCreate(AdmissionBase):
    user_id: int | None = None
    admission_date: datetime | None = None
    branch_id: int | None = None
    status: WALKIN_STATUS | None = None
    signed_admission_form_url: str | None = None
    admission_details: AdmissionDetails | None = None

class AdmissionUpdate(AdmissionBase):
    admission_date: datetime | None = None
    branch_id: int | None = None
    status: WALKIN_STATUS | None = None
    signed_admission_form_url: str | None = None
    admission_details: AdmissionDetails | None = None

class AdmissionResponse(AdmissionCreate):
    id: int
    user: UserResponse
    Branch: BranchResponse | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

class WalkinAdmissionResponse(BaseSchema):
    user_id: int | None = None
    admission_date: datetime | None = None
    branch_id: int | None = None
    status: WALKIN_STATUS | None = None
    signed_admission_form_url: str | None = None
    admission_details: AdmissionDetails | None = None
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    
class WalkinResponse(WalkinUpdate):
    id:int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    admission: WalkinAdmissionResponse | None = None

class MasterDataSchema(BaseSchema):
    category:str
    sub_category: int | None = None
    value: str
    description: str | None = None
    is_verified: bool | None = None
    created_by: int | None = None

class MasterDataUpdateSchema(BaseSchema):
    category:str | None = None
    sub_category: int | None = None
    value: str | None = None
    description: str | None = None
    is_verified: bool | None = None
    created_by: int | None = None

class MasterDataResponse(MasterDataSchema):
    id: int
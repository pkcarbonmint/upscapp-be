from typing import Any
from pydantic import PostgresDsn, RedisDsn, root_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.users.schemas import USER_ROLE
from .constants import APP, Environment


class Config(BaseSettings):
    DATABASE_URL: PostgresDsn 
    REDIS_URL: RedisDsn
    CMS_BASE_URL: str
    CMS_API_KEY: str

    DB_POOL_SIZE: int = 32
    DB_POOL_MAX_OVERFLOW: int = 64

    SITE_DOMAIN: str = "myapp.com"

    ENVIRONMENT: Environment = Environment.PRODUCTION

    PUSH_NOTIFICATIONS_TOPIC: str 

    SENTRY_DSN: str | None = None

    CORS_ORIGINS: list[str]
    CORS_ORIGINS_REGEX: str | None = None
    CORS_HEADERS: list[str]

    REGION_NAME: str
    AWS_SECRET_ACCESS_ID: str
    AWS_SECRET_ACCESS_KEY: str
    BUCKET_NAME: str

    EMAIL_HOST: str
    EMAIL_PORT: int
    EMAIL_USER: str
    EMAIL_PASSWORD: str
    EMAIL_FROM: str
    EMAIL_FROM_NAME: str

    SUPER_ADMIN_EMAIL: str = "tech@laex.in"
    SUPER_ADMIN_PHONE_NO: str = "+919876543210"
    SUPER_ADMIN_NAME: str = "laex Super Admin"

    APP_VERSION: str = "1"

    MERCHANT_ID: str
    SALT_INDEX: int
    SALT_KEY: str
    PG_BASE_URL: str
    PG_PAY_BASE_URL: str
    API_BASE_URL: str
    PG_PHONEPE_CALLBACK_API_KEY: str

    ZOHO_CLIENT_ID: str
    ZOHO_CLIENT_SECRET: str
    ZOHO_REFRESH_TOKEN: str

    ZOOM_ACCOUNT_ID: str
    ZOOM_CLIENT_ID: str
    ZOOM_CLIENT_SECRET: str
    ZOOM_HOST_EMAIL:str = "laexmentorship@gmail.com"
    ZOOM_HOST_PWD: str = "Laex@2929"


    NOPAPERFORMS_URL: str =  "https://api.nopaperforms.io/lead/v1/createOrUpdate"
    SECRET_KEY: str = "d30c460283b04c3fbe9ae909af2d4d25"
    ACCESS_KEY: str = "406407a6d35a437fb18c1f06e87dae52"
    AUTH_KEY: str = "434372AH00IZVF68dbfe29P1"


    CMS_FETCH_QS_BATCH_SIZE: int = 1000

    # FIREBASE_CERT: dict[str, str]
    EXAM_ID: int = 3
    STAGE_ID: int = 3
    GS_FULL_LENGTH_SIZE: int = 100
    CSAT_FULL_LENGTH_SIZE: int = 80
    GS_PAPER_ID: int = 2
    GS_PAPER_NAME: str = "UPSC Prelims Paper I GS"
    CSAT_PAPER_ID: int = 3
    CSAT_PAPER_NAME: str = "UPSC Prelims Paper II GS (CSAT)"
    GS_Q_DIST: dict[str, dict] = {
        "G": {"dist": 11},
        "P": {"dist": 14},
        "E": {"dist": 19},
        "T": {"dist": 15},
        "B": {"dist": 15},
        "H01": { "dist": 4},
        "H02": { "dist": 2},
        "H03": { "dist": 7},
        "H04": { "dist": 1},
        "M": {"dist": 9},  # to be updated
    }  ## subject code, ids and no of qs to be included the  gs paper 1 test

    # CSAT_Q_DIST: dict[str, dict] = {
    #     "CSAT-RC": {"id": 168, "dist": 28},
    #     "CSAT-QA": {"id": 169, "dist": 4},
    #     "CSAT-QA01": {"id": 170, "dist": 4},
    #     "CSAT-QA02": {"id": 171, "dist": 4},
    #     "CSAT-QA03": {"id": 172, "dist": 4},
    #     "CSAT-QA04": {"id": 173, "dist": 4},
    #     "CSAT-QA05": {"id": 174, "dist": 4},
    #     "CSAT-QA06": {"id": 175, "dist": 4},
    #     "CSAT-QA07": {"id": 176, "dist": 4},
    #     "CSAT-QA08": {"id": 177, "dist": 4},  # to be updated
    #     "CSAT-QA09": {"id": 178, "dist": 4},  # to be updated
    #     "CSAT-QA10": {"id": 179, "dist": 4},  # to be updated
    #     "CSAT-QA11": {"id": 180, "dist": 4},  # to be updated
    #     "CSAT-R": {"id": 181, "dist": 4},
    # }  ## subject code, ids and no of qs to be included the  csat paper 2 test

    CSAT_Q_DIST: dict[str, dict] ={     
        "CSATQA" :{ "dist": 5},
        "CSATR" :{ "dist": 5},
        "CSATRC" :{ "dist": 1},
        "CSATDI" :{ "dist": 5},
        "CSAT01" :{ "dist": 1},
        "CSAT02" :{ "dist": 1},
        "CSAT03" :{ "dist": 1},
        "CSAT04" :{ "dist": 1},
        "CSAT05" :{ "dist": 1},
        "CSAT06" :{ "dist": 1},
        "CSAT07" :{ "dist": 1},
        "CSAT08" :{ "dist": 1},
        "CSAT09" :{ "dist": 1},
        "CSAT10" :{ "dist": 1},
        "CSAT11" :{ "dist": 1},
        "CSAT12" :{ "dist": 1},
        "CSAT13" :{ "dist": 1},
        "CSAT14" :{ "dist": 1},
        "CSAT15" :{ "dist": 1},
        "CSAT16" :{ "dist": 1},
        "CSAT17" :{ "dist": 1},
        "CSAT18" :{ "dist": 1},
        "CSAT19" :{ "dist": 1},
        "CSAT20" :{ "dist": 1},
        "CSAT21" :{ "dist": 1},
        "CSAT22" :{ "dist": 1},
        "CSAT23" :{ "dist": 1},
        "CSAT24" :{ "dist": 1},
        "CSAT25" :{ "dist": 1},
        "CSAT26" :{ "dist": 1},
        "CSAT27" :{ "dist": 1},
        "CSAT28" :{ "dist": 1},
        "CSAT29" :{ "dist": 1},
        "CSAT30" :{ "dist": 1},
        "CSAT31" :{ "dist": 1},
        "CSAT32" :{ "dist": 1},
        "CSAT33" :{ "dist": 1},
    }
  

    MAX_MIN_Q_DIST: dict[str, dict] = {
        "Geography": {"id": 3, "min": 15, "max": 17},
        "Polity": {"id": 9, "min": 6, "max": 22},
        "Economy": {"id": 10, "min": 12, "max": 30},
        "Science & Technology": {"id": 11, "min": 10, "max": 19},
        "Environment, Ecology and Disaster Management": {"id": 13, "min": 7, "max": 24},
        "History-Ancient": {"id": 164, "min": 2, "max": 9},
        "History-Medieval": {"id": 165, "min": 0, "max": 7},
        "History-Modern": {"id": 166, "min": 1, "max": 13},
        "History-Art and Culture": {"id": 167, "min": 0, "max": 8},
        "Miscellaneous": {"id": 12, "min": 0, "max": 17},
        ##paper 2 subjects
        "Quantitative Aptitude": {"min":2, "max":25},
        "Reasoning":{"min":2, "max":25},
        "Reading Comprehension":{"min":2, "max":25},
        "Data Interpretation":{"min": 3, "max": 10},
        "Number System":{"min": 0, "max": 2},
        "H.C.F. and L.C.M. of Numbers":{"min": 0, "max": 2},
        "Decimal Fractions and Simplification":{"min": 0, "max": 2},
        "Problems on Numbers":{"min": 0, "max": 2},
        "Percentage":{"min": 0, "max": 2},
        "Averages":{"min": 0, "max": 2},
        "Profit and Loss":{"min": 0, "max": 2},
        "Simple Interest and Compound Interest":{"min": 0, "max": 2},
        "Problems on Ages":{"min": 0, "max": 2},
        "Time and Work":{"min": 0, "max": 2},
        "Pipes and Cisterns":{"min": 0, "max": 2},
        "Time, Speed and Distance":{"min": 0, "max": 2},
        "Problems on Trains":{"min": 0, "max": 2},
        "Mixture and Alligations":{"min": 0, "max": 2},
        "Permutations and Combinations":{"min": 0, "max": 2},
        "Probability":{"min": 0, "max": 2},
        "Geometry":{"min": 0, "max": 2},
        "Syllogism":{"min": 0, "max": 3},
        "Direction":{"min": 0, "max": 2},
        "Seating Arrangement":{"min": 0, "max": 5},
        "Blood Relations":{"min": 0, "max": 3},
        "Cubes and Dices":{"min": 0, "max": 3},
        "Analogy":{"min": 0, "max": 3},
        "Insert the Missing Image or Character":{"min": 0, "max": 3},
        "Calendar and Clocks":{"min": 0, "max": 3},
        "Odd Man Out and Series":{"min": 0, "max": 2},
        "Coding and Decoding":{"min": 0, "max": 3},
        "Decision Making":{"min": 0, "max": 4},
        "Data Sufficiency":{"min": 0, "max": 5},
        "Interpersonal Skills":{"min": 0, "max": 3},
        "English Comprehension":{"min": 0, "max": 8}
    }
    

    GS_AVG_TIME_PER_Q:float = 72.00 # in sec
    CSAT_AVG_TIME_PER_Q:float = 90.00 # in seconds
    OTHERS_SCORE_PERCENT:float = 40.00
    OTHERS_AVG_ACCURACY:float = 70.00

    SCORE_LOW:int = 60
    SCORE_MED_MIN:int = 60
    SCORE_MED_MAX:int = 70
    SCORE_HIGH_MIN:int = 70
    SCORE_HIGH_MAX:int = 80
    SCORE_VERY_HIGH_MIN:int = 80
    SCORE_VERY_HIGH_MAX:int = 100

    PERF_TECH_LOW:int = 30
    PERF_TECH_MED_MIN:int = 30
    PERF_TECH_MED_MAX:int = 50
    PERF_TECH_HIGH_MIN:int = 50
    PERF_TECH_HIGH_MAX:int = 100

    SUBJECT_BENCHMARK_SCORE: int = 40
    SUBJECT_ACCURACY_BENCHMARK_SCORE: int = 70
    
    # APP_ROLE_ACCESS: dict[str, dict] = {
    #      "role":{"app": [], "features": []},
    # }

    ROLE_APP: dict[str, list] = {
        USER_ROLE.org_admin : [APP.admin_app,APP.account_mgnt_app],
        USER_ROLE.branch_admin: [APP.admin_app,APP.account_mgnt_app],
        USER_ROLE.mentor: [APP.account_mgnt_app],
        USER_ROLE.teacher: [APP.account_mgnt_app],
        USER_ROLE.senior_management:  [APP.account_mgnt_app],
        USER_ROLE.front_desk_executive: [APP.account_mgnt_app],
        USER_ROLE.admission_counsellor: [APP.account_mgnt_app],
        USER_ROLE.admission_manager:  [APP.account_mgnt_app],
        USER_ROLE.content_author: [APP.account_mgnt_app],
        USER_ROLE.content_editor: [APP.account_mgnt_app],
        USER_ROLE.content_viewer: [APP.account_mgnt_app],
        USER_ROLE.evaluation_coordinator: [APP.account_mgnt_app],
        USER_ROLE.evaluation_evaluator:[APP.account_mgnt_app],
        USER_ROLE.evaluation_reviewer:[APP.account_mgnt_app],
    }
    APP_ROLE_FEATURE: dict[str, dict] = {
        USER_ROLE.org_admin : {"app": [APP.admin_app,APP.account_mgnt_app], "features": []},
        USER_ROLE.branch_admin: {"app": [APP.admin_app,APP.account_mgnt_app], "features": []},
        USER_ROLE.mentor: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.teacher: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.senior_management: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.front_desk_executive: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.admission_counsellor: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.admission_manager: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.content_author: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.content_editor: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.content_viewer: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.evaluation_coordinator: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.evaluation_evaluator: {"app": [APP.account_mgnt_app], "features": []},
        USER_ROLE.evaluation_reviewer: {"app": [APP.account_mgnt_app], "features": []},
    }
    
    class Config:
        env_file = ".env"
        extra = "ignore"

    @root_validator(skip_on_failure=True)
    def validate_sentry_non_local(cls, data: dict[str, Any]) -> dict[str, Any]:
        if data["ENVIRONMENT"].is_deployed and not data["SENTRY_DSN"]:
            raise ValueError("Sentry is not set")

        return data


settings = Config()

app_configs: dict[str, Any] = {"title": "UPSC.PRO Backend: APIs", "swagger_ui_parameters": {"docExpansion":"none"}}
# if settings.ENVIRONMENT.is_deployed:
#     app_configs["root_path"] = f"/v{settings.APP_VERSION}"

if not settings.ENVIRONMENT.is_debug:
    app_configs["openapi_url"] = None  # hide docs

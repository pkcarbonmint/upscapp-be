from enum import Enum

class Environment(str, Enum):
    LOCAL = "LOCAL"
    STAGING = "STAGING"
    TESTING = "TESTING"
    PRODUCTION = "PRODUCTION"

    @property
    def is_debug(self):
        return self in (self.LOCAL, self.STAGING, self.TESTING)

    @property
    def is_testing(self):
        return self == self.TESTING

    @property
    def is_deployed(self) -> bool:
        return self in (self.STAGING, self.PRODUCTION)

class APP(str, Enum):
    front_desk_app = "FRONT_DESK_APP"
    content_mgnt_app = "CONTENT_MGNT_APP"
    admin_app = "ADMIN_APP"
    teaching_app = "TEACHING_APP"
    evaluation_app = "EVALUATION_APP"
    student_app = "STUDENT_APP"
    account_mgnt_app = "ACCOUNT_MGNT_APP"
    analytics_app = "ANALYTICS_APP"
    dashboard_app = "DASHBOARD_APP"


discount_policy = {
    "1": {
        "discount_given": "100%",
        "details": 
            "For Foundation Course students , Value Addition Courses(Rapid Revision Program of Prelims and Mains, Test Series of Prelims and Mains) within (expiry date of Foundation Course + 10months ) will be free of cost."
    },
    "2": {
        "discount_given": "30%",
        "details": "Value Addition Courses for previous La Ex students foundation course."
    },
    "3": {
        "discount_given": "20%",
        "details": "Early Bird Offer available for all students until a specific date."
    },
    "4": {
        "discount_given": "50%",
        "details": "Students enrolling for the same Value Addition Courses in consecutive years."
    }
}
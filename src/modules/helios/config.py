from pydantic import BaseModel, HttpUrl
from typing import Dict, List
import os
from enum import Enum

class HeliosIntegrationMode(str, Enum):
    HTTP = "http"
    FFI = "ffi"

class HeliosServerConfig(BaseModel):
    base_url: str
    timeout: float = 30.0

class HeliosFFIConfig(BaseModel):
    library_path: str = ""  # Empty means auto-detect

class TaskLinks(BaseModel):
    practice: HttpUrl
    test: HttpUrl

class SubjectLinks(BaseModel):
    default: TaskLinks
    # Optional: override links per subject
    by_subject: Dict[str, TaskLinks] = {}

class HeliosLinkConfig(BaseModel):
    subjects: SubjectLinks

# Static configuration for Helios links
HELIOS_LINKS = HeliosLinkConfig(
    subjects=SubjectLinks(
        default=TaskLinks(
            practice="https://pib.gov.in/practice",
            test="https://pib.gov.in/test",
        ),
        by_subject={
            "Polity": TaskLinks(
                practice="https://p.gov.in/polity-practice",
                test="https://pib.gov.in/polity-test",
            ),
            "Economy": TaskLinks(
                practice="https://pib.gov.in/economy-practice",
                test="https://pib.gov.in/economy-test",
            ),
        }
    )
)

def get_practice_link(subject: str = None) -> str:
    """Returns the practice link for a given subject, or the default if not specified."""
    if subject and subject in HELIOS_LINKS.subjects.by_subject:
        return str(HELIOS_LINKS.subjects.by_subject[subject].practice)
    return str(HELIOS_LINKS.subjects.default.practice)

def get_test_link(subject: str = None) -> str:
    """Returns the test link for a given subject, or the default if not specified."""
    if subject and subject in HELIOS_LINKS.subjects.by_subject:
        return str(HELIOS_LINKS.subjects.by_subject[subject].test)
    return str(HELIOS_LINKS.subjects.default.test)

# Helios integration configuration
HELIOS_INTEGRATION_MODE = HeliosIntegrationMode(
    os.getenv("HELIOS_INTEGRATION_MODE", "http")
)

# Haskell Helios server configuration (for HTTP mode)
HELIOS_SERVER_CONFIG = HeliosServerConfig(
    base_url=os.getenv("HELIOS_SERVER_URL", "http://localhost:8080"),
    timeout=float(os.getenv("HELIOS_SERVER_TIMEOUT", "30.0"))
)

# Haskell Helios FFI configuration (for FFI mode)
HELIOS_FFI_CONFIG = HeliosFFIConfig(
    library_path=os.getenv("HELIOS_FFI_LIBRARY_PATH", "")
)

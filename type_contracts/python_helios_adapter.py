#!/usr/bin/env python3
"""
Python-Helios Type Adapter
Converts Python onboarding data to Helios UIWizardData format
with static type validation using Pydantic models.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
import json

class UIPersonalDetails(BaseModel):
    """Matches Haskell UIPersonalDetails exactly"""
    full_name: str
    email: str
    phone_number: str
    present_location: str
    current_status: str = "Student"
    graduation_stream: str
    college_university: str
    year_of_passing: int

class UIPreparationBackground(BaseModel):
    """Matches Haskell UIPreparationBackground exactly"""
    preparing_since: str = "6 months"
    target_year: str
    number_of_attempts: str = "First attempt"
    highest_stage_per_attempt: str = "Not attempted"
    last_attempt_gs_prelims_score: int = 0
    last_attempt_csat_score: int = 0
    wrote_mains_in_last_attempt: str = "No"
    mains_paper_marks: str = "N/A"

class UICoachingDetails(BaseModel):
    """Matches Haskell UICoachingDetails exactly"""
    prior_coaching: str = "No"
    coaching_institute_name: str = ""
    prior_mentorship: str = "No"
    programme_mentor_name: str = ""
    place_of_preparation: str = "Home"

class UIOptionalDetails(BaseModel):
    """Matches Haskell UIOptionalDetails exactly"""
    optional_subject: str = "Not decided"
    optional_status: str = "Not started"
    optional_taken_from: str = ""

class UITestExperience(BaseModel):
    """Matches Haskell UITestExperience exactly"""
    test_series_attempted: List[str] = []
    csat_self_assessment: str = "Moderate"
    csat_weak_areas: List[str] = []

class UISyllabusAwareness(BaseModel):
    """Matches Haskell UISyllabusAwareness exactly"""
    gs_syllabus_understanding: str = "Moderate"
    optional_syllabus_understanding: str = "Weak"
    pyq_awareness_and_use: str = "Moderate"

class UIPrelimsConfidence(BaseModel):
    """Matches Haskell UIPrelimsConfidence exactly"""
    prelims_current_events: str = "Moderate"
    prelims_history_of_india: str = "Moderate"
    prelims_indian_world_geography: str = "Moderate"
    prelims_polity_governance: str = "Moderate"
    prelims_economy_social_development: str = "Moderate"
    prelims_environment_ecology: str = "Moderate"
    prelims_science_technology: str = "Moderate"
    prelims_csat: str = "Moderate"

class UIMainsGS1Confidence(BaseModel):
    """Matches Haskell UIMainsGS1Confidence exactly"""
    gs1_essay: str = "Moderate"
    gs1_indian_culture: str = "Moderate"
    gs1_modern_history: str = "Moderate"
    gs1_world_history: str = "Moderate"
    gs1_post_independence_india: str = "Moderate"
    gs1_indian_society: str = "Moderate"
    gs1_indian_world_geography: str = "Moderate"

class UIMainsGS2Confidence(BaseModel):
    """Matches Haskell UIMainsGS2Confidence exactly"""
    gs2_constitution: str = "Moderate"
    gs2_polity: str = "Moderate"
    gs2_governance: str = "Moderate"
    gs2_social_justice: str = "Moderate"
    gs2_international_relations: str = "Moderate"

class UIMainsGS3Confidence(BaseModel):
    """Matches Haskell UIMainsGS3Confidence exactly"""
    gs3_economy: str = "Moderate"
    gs3_agriculture: str = "Moderate"
    gs3_environment: str = "Moderate"
    gs3_science_technology: str = "Moderate"
    gs3_disaster_management: str = "Moderate"
    gs3_internal_security: str = "Moderate"

class UIMainsGS4Confidence(BaseModel):
    """Matches Haskell UIMainsGS4Confidence exactly"""
    gs4_ethics_integrity_aptitude: str = "Moderate"
    gs4_optional_subject_paper1: str = "Moderate"
    gs4_optional_subject_paper2: str = "Moderate"

class UISubjectConfidence(BaseModel):
    """Matches Haskell UISubjectConfidence exactly"""
    prelims_confidence: UIPrelimsConfidence = UIPrelimsConfidence()
    mains_gs1_confidence: UIMainsGS1Confidence = UIMainsGS1Confidence()
    mains_gs2_confidence: UIMainsGS2Confidence = UIMainsGS2Confidence()
    mains_gs3_confidence: UIMainsGS3Confidence = UIMainsGS3Confidence()
    mains_gs4_optional_confidence: UIMainsGS4Confidence = UIMainsGS4Confidence()

class UIStudyStrategy(BaseModel):
    """Matches Haskell UIStudyStrategy exactly"""
    study_focus_combo: str = "GS + Optional"
    weekly_study_hours: str = "40"
    time_distribution: str = "Balanced"
    study_approach: str = "Balanced (macro subject + micro subject in rotation)"
    revision_strategy: str = "Weekly revision"
    test_frequency: str = "Weekly"
    seasonal_windows: List[str] = []
    catch_up_day_preference: str = "Sunday"

class UIWizardData(BaseModel):
    """Matches Haskell UIWizardData exactly - this is the root type Helios expects"""
    personal_and_academic_details: UIPersonalDetails
    preparation_background: UIPreparationBackground
    coaching_and_mentorship: UICoachingDetails
    optional_subject_details: UIOptionalDetails
    test_series_and_csat: UITestExperience
    syllabus_and_pyq_awareness: UISyllabusAwareness
    subject_confidence: UISubjectConfidence
    study_strategy: UIStudyStrategy

    @validator('personal_and_academic_details', 'preparation_background', pre=True)
    def validate_required_sections(cls, v):
        if not v:
            raise ValueError("Required section cannot be empty")
        return v

class PythonToHeliosAdapter:
    """Adapter to convert Python onboarding data to Helios UIWizardData format"""
    
    @staticmethod
    def convert_student_data(student_data: Dict[str, Any]) -> UIWizardData:
        """Convert Python student data dict to Helios UIWizardData"""
        
        background = student_data.get("background", {})
        target = student_data.get("target", {})
        commitment = student_data.get("commitment", {})
        confidence = student_data.get("confidence", {})
        
        # Map Python background to Helios personal details
        personal_details = UIPersonalDetails(
            full_name=background.get("name", ""),
            email=background.get("email", ""),
            phone_number=background.get("phone", ""),
            present_location=background.get("city", ""),
            current_status="Student",
            graduation_stream=background.get("graduation_stream", ""),
            college_university=background.get("college", ""),
            year_of_passing=background.get("graduation_year", 2024)
        )
        
        # Map Python target to Helios preparation background
        preparation_bg = UIPreparationBackground(
            target_year=str(target.get("target_year", 2025)),
            preparing_since="6 months",
            number_of_attempts=str(target.get("attempt_number", 1)) + " attempt"
        )
        
        # Map Python commitment to Helios study strategy
        study_strategy = UIStudyStrategy(
            weekly_study_hours=str(commitment.get("weekly_hours", 40)),
            study_approach="Balanced (macro subject + micro subject in rotation)"
        )
        
        # Map Python confidence to Helios subject confidence
        confidence_level = PythonToHeliosAdapter._map_confidence_level(
            confidence.get("confidence", 70)
        )
        
        subject_confidence = UISubjectConfidence(
            prelims_confidence=UIPrelimsConfidence(
                prelims_current_events=confidence_level,
                prelims_history_of_india=confidence_level,
                prelims_polity_governance=confidence_level,
                prelims_economy_social_development=confidence_level
            ),
            mains_gs1_confidence=UIMainsGS1Confidence(
                gs1_essay=confidence_level,
                gs1_modern_history=confidence_level
            ),
            mains_gs2_confidence=UIMainsGS2Confidence(
                gs2_polity=confidence_level,
                gs2_governance=confidence_level
            ),
            mains_gs3_confidence=UIMainsGS3Confidence(
                gs3_economy=confidence_level,
                gs3_environment=confidence_level
            )
        )
        
        return UIWizardData(
            personal_and_academic_details=personal_details,
            preparation_background=preparation_bg,
            coaching_and_mentorship=UICoachingDetails(),
            optional_subject_details=UIOptionalDetails(),
            test_series_and_csat=UITestExperience(),
            syllabus_and_pyq_awareness=UISyllabusAwareness(),
            subject_confidence=subject_confidence,
            study_strategy=study_strategy
        )
    
    @staticmethod
    def _map_confidence_level(confidence_score: int) -> str:
        """Map numeric confidence (0-100) to Helios confidence strings"""
        if confidence_score >= 90:
            return "Very Strong"
        elif confidence_score >= 70:
            return "Strong"
        elif confidence_score >= 50:
            return "Moderate"
        elif confidence_score >= 30:
            return "Weak"
        elif confidence_score >= 10:
            return "Very Weak"
        else:
            return "Not Started"
    
    @staticmethod
    def validate_helios_payload(data: Dict[str, Any]) -> UIWizardData:
        """Validate that data matches Helios expected format"""
        try:
            return UIWizardData(**data)
        except Exception as e:
            raise ValueError(f"Data does not match Helios UIWizardData format: {e}")

# Type validation function for runtime checking
def validate_python_to_helios_compatibility():
    """Runtime validation that our adapter produces valid Helios data"""
    
    # Sample Python data
    sample_python_data = {
        "background": {
            "name": "Test Student",
            "email": "test@example.com",
            "phone": "+91-9876543210",
            "city": "Delhi",
            "graduation_stream": "Engineering",
            "college": "Test University",
            "graduation_year": 2023
        },
        "target": {
            "target_year": 2025,
            "attempt_number": 1
        },
        "commitment": {
            "weekly_hours": 40
        },
        "confidence": {
            "confidence": 75
        }
    }
    
    try:
        # Convert using adapter
        helios_data = PythonToHeliosAdapter.convert_student_data(sample_python_data)
        
        # Validate structure
        assert isinstance(helios_data, UIWizardData)
        assert helios_data.personal_and_academic_details.full_name == "Test Student"
        assert helios_data.preparation_background.target_year == "2025"
        assert helios_data.study_strategy.weekly_study_hours == "40"
        
        print("✅ Python-Helios type compatibility validated successfully")
        return True
        
    except Exception as e:
        print(f"❌ Python-Helios type compatibility validation failed: {e}")
        return False

if __name__ == "__main__":
    validate_python_to_helios_compatibility()

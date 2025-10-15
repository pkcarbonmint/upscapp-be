"""
Helios Data Mapper - Transform onboarding data to UIWizardData format
Maps flat Python onboarding data to nested Haskell UIWizardData structure
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class HeliosDataMapper:
    """Maps Python onboarding data to Helios UIWizardData format"""
    
    def __init__(self):
        # Confidence level mapping
        self.confidence_mapping = {
            "very_low": "Very Low",
            "low": "Low", 
            "medium": "Medium",
            "high": "High",
            "very_high": "Very High"
        }
        
        # Default values for missing fields
        self.defaults = {
            "preparing_since": "2024",
            "number_of_attempts": "0",
            "highest_stage_per_attempt": "Not attempted",
            "last_attempt_gs_prelims_score": 0,
            "last_attempt_csat_score": 0,
            "wrote_mains_in_last_attempt": "No",
            "mains_paper_marks": "Not applicable"
        }
    
    def map_onboarding_to_uiwizard(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform complete student onboarding data to UIWizardData format
        
        Args:
            student_data: Complete student data from onboarding service
            
        Returns:
            Dict matching Haskell UIWizardData structure
        """
        
        try:
            # Extract individual sections
            background = student_data.get("background", {})
            target = student_data.get("target", {})
            commitment = student_data.get("commitment", {})
            confidence = student_data.get("confidence", {})
            
            uiwizard_data = {
                "personal_and_academic_details": self._map_personal_details(background),
                "preparation_background": self._map_preparation_background(target, background),
                "coaching_and_mentorship": self._map_coaching_details(background),
                "optional_subject_details": self._map_optional_details(target, commitment),
                "test_series_and_csat": self._map_test_experience(confidence),
                "syllabus_and_pyq_awareness": self._map_syllabus_awareness(),
                "subject_confidence": self._map_subject_confidence(confidence),
                "study_strategy": self._map_study_strategy(commitment),
                "target_year": str(target.get("target_year", "2026")),
                "start_date": target.get("start_date")  # Pass start date to Helios
            }
            
            logger.info(f"Successfully mapped onboarding data to UIWizardData for student")
            return uiwizard_data
            
        except Exception as e:
            logger.error(f"Error mapping onboarding data: {e}")
            raise ValueError(f"Failed to map onboarding data: {e}")
    
    def _map_personal_details(self, background: Dict[str, Any]) -> Dict[str, Any]:
        """Map background data to UIPersonalDetails"""
        return {
            "full_name": background.get("name", ""),
            "email": background.get("email", ""),
            "phone_number": background.get("phone", ""),
            "present_location": f"{background.get('city', '')}, {background.get('state', '')}",
            "current_status": "Student",  # Default assumption
            "graduation_stream": background.get("graduation_stream", ""),
            "college_university": background.get("college", ""),
            "year_of_passing": background.get("graduation_year", datetime.now().year)
        }
    
    def _map_preparation_background(self, target: Dict[str, Any], background: Dict[str, Any]) -> Dict[str, Any]:
        """Map target data to UIPreparationBackground"""
        return {
            "preparing_since": str(target.get("preparing_since", self.defaults["preparing_since"])),
            "target_year": str(target.get("target_year", "2026")),  # Use actual target year from database
            "number_of_attempts": str(target.get("attempt_number", self.defaults["number_of_attempts"])),
            "highest_stage_per_attempt": self.defaults["highest_stage_per_attempt"],
            "last_attempt_gs_prelims_score": self.defaults["last_attempt_gs_prelims_score"],
            "last_attempt_csat_score": self.defaults["last_attempt_csat_score"],
            "wrote_mains_in_last_attempt": self.defaults["wrote_mains_in_last_attempt"],
            "mains_paper_marks": self.defaults["mains_paper_marks"]
        }
    
    def _map_coaching_details(self, background: Dict[str, Any]) -> Dict[str, Any]:
        """Map to UICoachingDetails with defaults"""
        return {
            "prior_coaching": "No",  # Default assumption
            "coaching_institute_name": "",
            "prior_mentorship": "No",
            "programme_mentor_name": "",
            "place_of_preparation": f"{background.get('city', 'Home')}"
        }
    
    def _map_optional_details(self, target: Dict[str, Any], commitment: Dict[str, Any] = None) -> Dict[str, Any]:
        """Map target and commitment data to UIOptionalDetails"""
        # Get optional subject from either target or commitment (new field)
        optional_subject = target.get("optional_subject", "")
        if not optional_subject and commitment:
            optional_subject = commitment.get("upscOptionalSubject", "")
            
        return {
            "optional_subject": optional_subject,
            "optional_status": "Decided" if optional_subject else "Not decided",
            "optional_taken_from": "Self study"  # Default assumption
        }
    
    def _map_test_experience(self, confidence: Dict[str, Any]) -> Dict[str, Any]:
        """Map confidence data to UITestExperience"""
        csat_confidence = confidence.get("csat", "medium")
        
        # Map CSAT weak areas based on confidence level
        weak_areas = []
        if csat_confidence in ["very_low", "low"]:
            weak_areas = ["Quantitative Aptitude", "Logical Reasoning"]
        
        return {
            "test_series_attempted": [],  # Will be populated later
            "csat_self_assessment": self.confidence_mapping.get(csat_confidence, "Medium"),
            "csat_weak_areas": weak_areas
        }
    
    def _map_syllabus_awareness(self) -> Dict[str, Any]:
        """Map to UISyllabusAwareness with defaults"""
        return {
            "gs_syllabus_understanding": "Moderate",
            "optional_syllabus_understanding": "Moderate", 
            "pyq_awareness_and_use": "Moderate"
        }
    
    def _map_subject_confidence(self, confidence: Dict[str, Any]) -> Dict[str, Any]:
        """Map confidence data to nested UISubjectConfidence structure"""
        
        # Get confidence levels with defaults
        gs1_conf = self.confidence_mapping.get(confidence.get("general_studies_1", "medium"), "Medium")
        gs2_conf = self.confidence_mapping.get(confidence.get("general_studies_2", "medium"), "Medium")
        gs3_conf = self.confidence_mapping.get(confidence.get("general_studies_3", "medium"), "Medium")
        gs4_conf = self.confidence_mapping.get(confidence.get("general_studies_4", "medium"), "Medium")
        optional_conf = self.confidence_mapping.get(confidence.get("optional_subject", "medium"), "Medium")
        csat_conf = self.confidence_mapping.get(confidence.get("csat", "medium"), "Medium")
        essay_conf = self.confidence_mapping.get(confidence.get("essay", "medium"), "Medium")
        
        return {
            "prelims_confidence": {
                "prelims_current_events": gs1_conf,
                "prelims_history_of_india": gs1_conf,
                "prelims_indian_world_geography": gs1_conf,
                "prelims_polity_governance": gs2_conf,
                "prelims_economy_social_development": gs3_conf,
                "prelims_environment_ecology": gs3_conf,
                "prelims_science_technology": gs3_conf,
                "prelims_csat": csat_conf
            },
            "mains_gs1_confidence": {
                "gs1_essay": essay_conf,
                "gs1_indian_culture": gs1_conf,
                "gs1_modern_history": gs1_conf,
                "gs1_world_history": gs1_conf,
                "gs1_post_independence_india": gs1_conf,
                "gs1_indian_society": gs1_conf,
                "gs1_indian_world_geography": gs1_conf
            },
            "mains_gs2_confidence": {
                "gs2_constitution": gs2_conf,
                "gs2_polity": gs2_conf,
                "gs2_governance": gs2_conf,
                "gs2_social_justice": gs2_conf,
                "gs2_international_relations": gs2_conf
            },
            "mains_gs3_confidence": {
                "gs3_economy": gs3_conf,
                "gs3_agriculture": gs3_conf,
                "gs3_environment": gs3_conf,
                "gs3_disaster_management": gs3_conf,
                "gs3_science_technology": gs3_conf,
                "gs3_internal_security": gs3_conf
            },
            "mains_gs4_optional_confidence": {
                "gs4_ethics_integrity_aptitude": gs4_conf,
                "gs4_optional_subject_paper1": optional_conf,
                "gs4_optional_subject_paper2": optional_conf
            }
        }
    
    def _map_study_strategy(self, commitment: Dict[str, Any]) -> Dict[str, Any]:
        """Map commitment data to UIStudyStrategy"""
        
        daily_hours = commitment.get("study_hours_per_day", 8)
        weekly_days = commitment.get("study_days_per_week", 6)
        flexibility = commitment.get("flexibility", "medium")
        
        # Map flexibility to strategy preference
        strategy_mapping = {
            "low": "Structured approach",
            "medium": "Balanced approach", 
            "high": "Flexible approach"
        }
        
        # Get weekly test day preference (default to Sunday)
        test_day_preference = commitment.get("weeklyTestDayPreference", "Sunday")
        
        return {
            "study_focus_combo": "GS + Optional",
            "weekly_study_hours": str(commitment.get("weekly_hours", 40)),
            "time_distribution": "Morning Heavy",
            "study_approach": commitment.get("study_approach", "comprehensive"),
            "revision_strategy": "Weekly",
            "test_frequency": "Bi-weekly",
            "seasonal_windows": ["Summer", "Winter"],
            "catch_up_day_preference": test_day_preference,
            # New UPSC fields
            "optional_first_preference": commitment.get("optionalFirst", False),
            "upsc_optional_subject": commitment.get("upscOptionalSubject", ""),
            "weekly_test_day_preference": test_day_preference
        }
    
    def validate_uiwizard_data(self, uiwizard_data: Dict[str, Any]) -> bool:
        """Validate that UIWizardData has all required fields"""
        
        required_top_level = [
            "personal_and_academic_details",
            "preparation_background", 
            "coaching_and_mentorship",
            "optional_subject_details",
            "test_series_and_csat",
            "syllabus_and_pyq_awareness",
            "subject_confidence",
            "study_strategy"
        ]
        
        for field in required_top_level:
            if field not in uiwizard_data:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate nested subject confidence structure
        subject_conf = uiwizard_data.get("subject_confidence", {})
        required_confidence_sections = [
            "prelims_confidence",
            "mains_gs1_confidence", 
            "mains_gs2_confidence",
            "mains_gs3_confidence",
            "mains_gs4_optional_confidence"
        ]
        
        for section in required_confidence_sections:
            if section not in subject_conf:
                logger.error(f"Missing confidence section: {section}")
                return False
        
        logger.info("UIWizardData validation passed")
        return True

# Convenience function for direct usage
def map_student_to_helios(student_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to map student data to Helios format
    
    Args:
        student_data: Complete student data from onboarding
        
    Returns:
        UIWizardData formatted dict
    """
    mapper = HeliosDataMapper()
    uiwizard_data = mapper.map_onboarding_to_uiwizard(student_data)
    
    if not mapper.validate_uiwizard_data(uiwizard_data):
        raise ValueError("Generated UIWizardData failed validation")
    
    return uiwizard_data

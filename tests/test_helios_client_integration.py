#!/usr/bin/env python3
"""
Integration tests for Helios client (src/modules/helios/client.py).

These tests verify that the Python HeliosHTTPClient can successfully 
communicate with the real Haskell Helios engine and that your print 
statements and logging work correctly.
"""

import pytest
import asyncio
import sys
import os
from typing import Dict, Any

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from modules.helios.client import HeliosHTTPClient, HeliosClientError


class TestHeliosClientIntegration:
    """Integration tests for HeliosHTTPClient."""
    
    HELIOS_URL = "http://localhost:8080"
    
    @pytest.fixture
    def helios_client(self):
        """Create HeliosHTTPClient instance."""
        return HeliosHTTPClient(base_url=self.HELIOS_URL)
    
    @pytest.fixture(autouse=True)
    def check_helios_running(self):
        """Check if Helios engine is running before each test."""
        import requests
        try:
            response = requests.get(f"{self.HELIOS_URL}/health", timeout=5)
            if response.status_code != 200:
                pytest.skip("Helios engine not responding to health check")
        except Exception:
            pytest.skip("Helios engine not running at localhost:8080")
    
    def get_valid_ui_wizard_data(self) -> Dict[str, Any]:
        """Create valid UIWizardData matching Haskell data structure."""
        return {
            "personal_and_academic_details": {
                "full_name": "John Doe",
                "email": "john.doe@example.com",
                "phone_number": "+91-9876543210",
                "present_location": "Delhi, India",
                "current_status": "Student",
                "graduation_stream": "Engineering",
                "college_university": "IIT Delhi",
                "year_of_passing": 2023
            },
            "preparation_background": {
                "preparing_since": "6 months",
                "target_year": "2025",
                "number_of_attempts": "0",
                "highest_stage_per_attempt": "None",
                "last_attempt_gs_prelims_score": 0,
                "last_attempt_csat_score": 0,
                "wrote_mains_in_last_attempt": "No",
                "mains_paper_marks": "N/A"
            },
            "coaching_and_mentorship": {
                "prior_coaching": "No",
                "coaching_institute_name": "",
                "prior_mentorship": "No",
                "programme_mentor_name": "",
                "place_of_preparation": "Home"
            },
            "optional_subject_details": {
                "optional_subject": "Public Administration",
                "optional_status": "Beginner",
                "optional_taken_from": "Self Study"
            },
            "test_series_and_csat": {
                "test_series_attempted": ["None"],
                "csat_self_assessment": "Good",
                "csat_weak_areas": ["Mathematics", "Data Interpretation"]
            },
            "syllabus_and_pyq_awareness": {
                "gs_syllabus_understanding": "Good",
                "optional_syllabus_understanding": "Moderate",
                "pyq_awareness_and_use": "Regular"
            },
            "subject_confidence": {
                "prelims_confidence": {
                    "prelims_current_events": "Medium",
                    "prelims_history_of_india": "High",
                    "prelims_indian_world_geography": "Medium",
                    "prelims_polity_governance": "High",
                    "prelims_economy_social_development": "Medium",
                    "prelims_environment_ecology": "Low",
                    "prelims_science_technology": "Medium",
                    "prelims_csat": "High"
                },
                "mains_gs1_confidence": {
                    "gs1_essay": "Medium",
                    "gs1_indian_culture": "High",
                    "gs1_modern_history": "High",
                    "gs1_world_history": "Medium",
                    "gs1_post_independence_india": "High",
                    "gs1_indian_society": "Medium",
                    "gs1_indian_world_geography": "Medium"
                },
                "mains_gs2_confidence": {
                    "gs2_constitution": "High",
                    "gs2_polity": "High",
                    "gs2_governance": "Medium",
                    "gs2_social_justice": "Medium",
                    "gs2_international_relations": "Low"
                },
                "mains_gs3_confidence": {
                    "gs3_economy": "Medium",
                    "gs3_agriculture": "Low",
                    "gs3_environment": "Low",
                    "gs3_science_technology": "Medium",
                    "gs3_disaster_management": "Low",
                    "gs3_internal_security": "Medium"
                },
                "mains_gs4_optional_confidence": {
                    "gs4_ethics_integrity_aptitude": "Medium",
                    "gs4_optional_subject_paper1": "Medium",
                    "gs4_optional_subject_paper2": "Medium"
                }
            },
            "study_strategy": {
                "study_focus_combo": "Balanced Approach",
                "weekly_study_hours": "40-50 hours",
                "time_distribution": "Equal Distribution",
                "study_approach": "Conceptual Learning",
                "revision_strategy": "Weekly Revision",
                "test_frequency": "Weekly Tests",
                "seasonal_windows": ["Summer Intensive", "Winter Revision"],
                "catch_up_day_preference": "Sunday"
            }
        }
    
    @pytest.mark.asyncio
    async def test_helios_client_generate_plan(self, helios_client):
        """Test plan generation using HeliosHTTPClient - should show your print statement."""
        data = self.get_valid_ui_wizard_data()
        
        print("\n🧪 Testing HeliosHTTPClient.generate_plan()")
        print("This should trigger your print statement in src/modules/helios/client.py")
        print("-" * 60)
        
        try:
            async with helios_client:
                plan = await helios_client.generate_plan(data)
                
                assert isinstance(plan, dict)
                assert len(plan) > 0
                
                print("✅ Plan generation successful!")
                print(f"Plan keys: {list(plan.keys())}")
                
        except HeliosClientError as e:
            print(f"❌ HeliosClientError: {e}")
            raise
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            raise
    
    @pytest.mark.asyncio
    async def test_helios_client_error_handling(self, helios_client):
        """Test error handling in HeliosHTTPClient."""
        print("\n🧪 Testing HeliosHTTPClient error handling")
        print("-" * 60)
        
        # Test with invalid data
        invalid_data = {"invalid": "data"}
        
        async with helios_client:
            with pytest.raises(HeliosClientError):
                await helios_client.generate_plan(invalid_data)
        
        print("✅ Error handling works correctly")
    
    @pytest.mark.asyncio
    async def test_helios_client_multiple_calls(self, helios_client):
        """Test multiple calls to see print statements multiple times."""
        data = self.get_valid_ui_wizard_data()
        
        print("\n🧪 Testing multiple calls to HeliosHTTPClient")
        print("You should see your print statement 3 times:")
        print("-" * 60)
        
        async with helios_client:
            for i in range(3):
                print(f"\n📞 Call {i+1}/3:")
                try:
                    plan = await helios_client.generate_plan(data)
                    assert isinstance(plan, dict)
                    print(f"✅ Call {i+1} successful")
                except Exception as e:
                    print(f"❌ Call {i+1} failed: {e}")
                    raise


class TestHeliosClientDirectUsage:
    """Test direct usage of HeliosHTTPClient (like CLI would use it)."""
    
    @pytest.mark.asyncio
    async def test_direct_client_usage(self):
        """Test using HeliosHTTPClient directly like the CLI does."""
        print("\n🧪 Testing direct HeliosHTTPClient usage")
        print("This simulates how your CLI would use the client:")
        print("-" * 60)
        
        # Check if Helios is running first
        import httpx
        try:
            async with httpx.AsyncClient() as test_client:
                response = await test_client.get("http://localhost:8080/health", timeout=5)
                if response.status_code != 200:
                    pytest.skip("Helios engine not running")
        except Exception:
            pytest.skip("Helios engine not running")
        
        # Create client and make request
        client = HeliosHTTPClient(base_url="http://localhost:8080")
        
        try:
            data = {
                "personal_and_academic_details": {
                    "full_name": "Test User",
                    "email": "test@example.com",
                    "phone_number": "+91-1234567890",
                    "present_location": "Test City",
                    "current_status": "Student",
                    "graduation_stream": "Test Stream",
                    "college_university": "Test University",
                    "year_of_passing": 2023
                },
                "preparation_background": {
                    "preparing_since": "1 year",
                    "target_year": "2025",
                    "number_of_attempts": "0",
                    "highest_stage_per_attempt": "None",
                    "last_attempt_gs_prelims_score": 0,
                    "last_attempt_csat_score": 0,
                    "wrote_mains_in_last_attempt": "No",
                    "mains_paper_marks": "N/A"
                },
                "coaching_and_mentorship": {
                    "prior_coaching": "No",
                    "coaching_institute_name": "",
                    "prior_mentorship": "No",
                    "programme_mentor_name": "",
                    "place_of_preparation": "Home"
                },
                "optional_subject_details": {
                    "optional_subject": "History",
                    "optional_status": "Beginner",
                    "optional_taken_from": "Self Study"
                },
                "test_series_and_csat": {
                    "test_series_attempted": ["None"],
                    "csat_self_assessment": "Average",
                    "csat_weak_areas": ["Mathematics"]
                },
                "syllabus_and_pyq_awareness": {
                    "gs_syllabus_understanding": "Good",
                    "optional_syllabus_understanding": "Moderate",
                    "pyq_awareness_and_use": "Regular"
                },
                "subject_confidence": {
                    "prelims_confidence": {
                        "prelims_current_events": "Medium",
                        "prelims_history_of_india": "High",
                        "prelims_indian_world_geography": "Medium",
                        "prelims_polity_governance": "High",
                        "prelims_economy_social_development": "Medium",
                        "prelims_environment_ecology": "Low",
                        "prelims_science_technology": "Medium",
                        "prelims_csat": "High"
                    },
                    "mains_gs1_confidence": {
                        "gs1_essay": "Medium",
                        "gs1_indian_culture": "High",
                        "gs1_modern_history": "High",
                        "gs1_world_history": "Medium",
                        "gs1_post_independence_india": "High",
                        "gs1_indian_society": "Medium",
                        "gs1_indian_world_geography": "Medium"
                    },
                    "mains_gs2_confidence": {
                        "gs2_constitution": "High",
                        "gs2_polity": "High",
                        "gs2_governance": "Medium",
                        "gs2_social_justice": "Medium",
                        "gs2_international_relations": "Low"
                    },
                    "mains_gs3_confidence": {
                        "gs3_economy": "Medium",
                        "gs3_agriculture": "Low",
                        "gs3_environment": "Low",
                        "gs3_science_technology": "Medium",
                        "gs3_disaster_management": "Low",
                        "gs3_internal_security": "Medium"
                    },
                    "mains_gs4_optional_confidence": {
                        "gs4_ethics_integrity_aptitude": "Medium",
                        "gs4_optional_subject_paper1": "Medium",
                        "gs4_optional_subject_paper2": "Medium"
                    }
                },
                "study_strategy": {
                    "study_focus_combo": "Prelims Focus",
                    "weekly_study_hours": "30-40 hours",
                    "time_distribution": "Weak Subjects Focus",
                    "study_approach": "Practice Heavy",
                    "revision_strategy": "Daily Revision",
                    "test_frequency": "Daily Tests",
                    "seasonal_windows": ["Winter Intensive"],
                    "catch_up_day_preference": "Saturday"
                }
            }
            
            print("📤 Sending request via HeliosHTTPClient...")
            plan = await client.generate_plan(data)
            
            print("✅ Direct client usage successful!")
            print(f"Received plan with keys: {list(plan.keys())}")
            
        finally:
            await client.__aexit__(None, None, None)


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "--tb=short", "-s"])  # -s shows print statements

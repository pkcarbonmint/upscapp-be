#!/usr/bin/env python3
"""
Integration tests for Helios engine running at port 8080.

These tests verify that the Python code can successfully communicate with
the real Haskell Helios engine via HTTP API and receive valid responses.
"""

import pytest
import requests
import json
import time
from typing import Dict, Any, Optional


class TestHeliosEngineIntegration:
    """Integration tests for Helios engine HTTP API."""
    
    HELIOS_URL = "http://localhost:8080"
    TIMEOUT = 30  # seconds
    
    @pytest.fixture(autouse=True)
    def check_helios_running(self):
        """Check if Helios engine is running before each test."""
        try:
            response = requests.get(f"{self.HELIOS_URL}/health", timeout=5)
            if response.status_code != 200:
                pytest.skip("Helios engine not responding to health check")
        except requests.exceptions.RequestException:
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
    
    def test_helios_health_endpoint(self):
        """Test that Helios engine health endpoint is accessible."""
        response = requests.get(f"{self.HELIOS_URL}/health", timeout=5)
        
        assert response.status_code == 200
        # Health endpoint might return simple text or JSON
        assert response.text is not None
    
    def test_helios_plan_generate_endpoint_structure(self):
        """Test that plan generation endpoint accepts requests and returns structured data."""
        data = self.get_valid_ui_wizard_data()
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Plan generation endpoint not found"
        
        # Should not return 500 (server error)
        if response.status_code == 500:
            print(f"Server error response: {response.text}")
        assert response.status_code != 500, "Server error in Helios engine"
        
        # Should return 200 for valid data
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_helios_plan_generate_response_format(self):
        """Test that plan generation returns valid JSON with expected structure."""
        data = self.get_valid_ui_wizard_data()
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        assert response.status_code == 200
        
        # Should return valid JSON
        try:
            plan_data = response.json()
        except json.JSONDecodeError:
            pytest.fail(f"Response is not valid JSON: {response.text}")
        
        # Check basic structure
        assert isinstance(plan_data, dict), "Response should be a JSON object"
        
        # Check for expected fields (adjust based on actual Helios response)
        expected_fields = ['blocks', 'total_weeks', 'success_probability']
        for field in expected_fields:
            if field in plan_data:
                print(f"✓ Found expected field: {field}")
        
        # At minimum, should have some kind of plan data
        assert len(plan_data) > 0, "Response should not be empty"
        
        print(f"Plan data keys: {list(plan_data.keys())}")
        print(f"Plan data sample: {json.dumps(plan_data, indent=2)[:500]}...")
    
    def test_helios_plan_generate_with_different_confidence_levels(self):
        """Test plan generation with different confidence levels."""
        base_data = self.get_valid_ui_wizard_data()
        
        # Test with all low confidence
        low_confidence_data = base_data.copy()
        low_confidence_data["subject_confidence"]["prelims_confidence"] = {
            key: "Low" for key in low_confidence_data["subject_confidence"]["prelims_confidence"]
        }
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=low_confidence_data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        assert response.status_code == 200
        low_plan = response.json()
        
        # Test with all high confidence
        high_confidence_data = base_data.copy()
        high_confidence_data["subject_confidence"]["prelims_confidence"] = {
            key: "High" for key in high_confidence_data["subject_confidence"]["prelims_confidence"]
        }
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=high_confidence_data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        assert response.status_code == 200
        high_plan = response.json()
        
        # Plans should be different (or at least both valid)
        assert isinstance(low_plan, dict)
        assert isinstance(high_plan, dict)
        assert len(low_plan) > 0
        assert len(high_plan) > 0
        
        print("✓ Successfully generated plans with different confidence levels")
    
    def test_helios_plan_generate_with_different_strategies(self):
        """Test plan generation with different study strategies."""
        base_data = self.get_valid_ui_wizard_data()
        
        strategies = [
            "Prelims Focus",
            "Mains Focus", 
            "Balanced Approach"
        ]
        
        plans = {}
        
        for strategy in strategies:
            strategy_data = base_data.copy()
            strategy_data["study_strategy"]["study_focus_combo"] = strategy
            
            response = requests.post(
                f"{self.HELIOS_URL}/plan/generate",
                json=strategy_data,
                headers={'Content-Type': 'application/json'},
                timeout=self.TIMEOUT
            )
            
            assert response.status_code == 200, f"Failed for strategy: {strategy}"
            plans[strategy] = response.json()
            
            assert isinstance(plans[strategy], dict)
            assert len(plans[strategy]) > 0
        
        print("✓ Successfully generated plans with different study strategies")
        print(f"Generated plans for: {list(plans.keys())}")
    
    def test_helios_plan_generate_error_handling(self):
        """Test error handling for invalid data."""
        # Test with empty data
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json={},
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        # Should return 400 for invalid data
        assert response.status_code == 400, "Should return 400 for empty data"
        
        # Test with malformed data
        malformed_data = {"invalid": "data", "structure": True}
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=malformed_data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        # Should return 400 for malformed data
        assert response.status_code == 400, "Should return 400 for malformed data"
        
        print("✓ Error handling works correctly")
    
    def test_helios_plan_generate_performance(self):
        """Test that plan generation completes within reasonable time."""
        data = self.get_valid_ui_wizard_data()
        
        start_time = time.time()
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=self.TIMEOUT
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        assert response.status_code == 200
        assert duration < 15.0, f"Plan generation took too long: {duration:.2f}s"
        
        print(f"✓ Plan generation completed in {duration:.2f} seconds")
    
    def test_helios_concurrent_requests(self):
        """Test that Helios can handle multiple concurrent requests."""
        import threading
        import queue
        
        data = self.get_valid_ui_wizard_data()
        results = queue.Queue()
        
        def make_request():
            try:
                response = requests.post(
                    f"{self.HELIOS_URL}/plan/generate",
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=self.TIMEOUT
                )
                results.put(('success', response.status_code, len(response.text)))
            except Exception as e:
                results.put(('error', str(e), 0))
        
        # Start 3 concurrent requests
        threads = []
        for i in range(3):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join(timeout=self.TIMEOUT + 5)
        
        # Check results
        success_count = 0
        while not results.empty():
            result_type, status_or_error, response_size = results.get()
            if result_type == 'success':
                assert status_or_error == 200, f"Request failed with status {status_or_error}"
                assert response_size > 0, "Response should not be empty"
                success_count += 1
            else:
                print(f"Request error: {status_or_error}")
        
        assert success_count >= 2, f"Expected at least 2 successful requests, got {success_count}"
        print(f"✓ Successfully handled {success_count}/3 concurrent requests")


class TestHeliosDataValidation:
    """Test data validation and transformation."""
    
    HELIOS_URL = "http://localhost:8080"
    
    @pytest.fixture(autouse=True)
    def check_helios_running(self):
        """Check if Helios engine is running before each test."""
        try:
            response = requests.get(f"{self.HELIOS_URL}/health", timeout=5)
            if response.status_code != 200:
                pytest.skip("Helios engine not responding to health check")
        except requests.exceptions.RequestException:
            pytest.skip("Helios engine not running at localhost:8080")
    
    def test_required_fields_validation(self):
        """Test that Helios validates required fields properly."""
        # Test missing personal_and_academic_details
        incomplete_data = {
            "preparation_background": {
                "preparing_since": "6 months",
                "target_year": "2025",
                "number_of_attempts": "0",
                "highest_stage_per_attempt": "None",
                "last_attempt_gs_prelims_score": 0,
                "last_attempt_csat_score": 0,
                "wrote_mains_in_last_attempt": "No",
                "mains_paper_marks": "N/A"
            }
        }
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=incomplete_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        # Should return 400 for missing required fields
        assert response.status_code == 400
        assert "personal_and_academic_details" in response.text or "parsing" in response.text
        
        print("✓ Required field validation works")
    
    def test_field_type_validation(self):
        """Test that Helios validates field types properly."""
        # Test with wrong type for year_of_passing (should be int)
        invalid_data = {
            "personal_and_academic_details": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "phone_number": "+91-9876543210",
                "present_location": "Delhi",
                "current_status": "Student",
                "graduation_stream": "Engineering",
                "college_university": "IIT Delhi",
                "year_of_passing": "invalid_year"  # Should be int
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
            }
        }
        
        response = requests.post(
            f"{self.HELIOS_URL}/plan/generate",
            json=invalid_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        # Should return 400 for invalid field types
        assert response.status_code == 400
        
        print("✓ Field type validation works")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "--tb=short"])

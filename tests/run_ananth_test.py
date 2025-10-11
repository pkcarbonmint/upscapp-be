#!/usr/bin/env python3
"""
Test runner for Ananth's scenario.

This script demonstrates how to run the Ananth test scenario and provides
a simple way to execute the test without using pytest directly.
"""

import asyncio
import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from test_ananth_scenario import TestAnanthScenario
from helios import HeliosEngine, MockCMSService


async def run_ananth_test():
    """Run Ananth's test scenario and report results."""
    print("Testing Ananth (The Working Professional) Test Scenario")
    print("=" * 60)
    
    # Create test instance
    test_instance = TestAnanthScenario()
    
    # Create services and data directly (not using pytest fixtures)
    mock_cms_service = MockCMSService()
    helios_engine = HeliosEngine(cms_service=mock_cms_service)
    
    # Ananth's wizard data from 05d-scenario-ananth-test-spec.md
    ananth_wizard_data = {
        "subject_confidence": {
            "prelims_confidence": {
                "current_events": "Moderate",
                "history_of_india": "Strong",
                "indian_world_geography": "Moderate",
                "polity_governance": "Moderate",
                "economy_social_development": "Average",
                "environment_ecology": "Average",
                "science_technology": "Average",
                "csat": "Strong"
            },
            "mains_gs1_confidence": {
                "essay": "Average",
                "indian_culture": "Average",
                "modern_history": "Strong",
                "world_history": "Moderate",
                "post_independence_india": "Average",
                "indian_society": "Average",
                "indian_world_geography": "Moderate"
            },
            "mains_gs2_confidence": {
                "constitution": "Moderate",
                "polity": "Moderate",
                "governance": "Average",
                "social_justice": "Average",
                "international_relations": "Average"
            },
            "mains_gs3_confidence": {
                "economy": "Average",
                "agriculture": "Average",
                "environment": "Average",
                "science_technology": "Average",
                "disaster_management": "Moderate",
                "internal_security": "Moderate"
            },
            "mains_gs4_optional_confidence": {
                "ethics_integrity_aptitude": "Average",
                "optional_subject_paper1": "Moderate",
                "optional_subject_paper2": "Moderate"
            }
        },
        "study_strategy": {
            "study_focus_combo": "One GS at a time",
            "weekly_study_hours": "22 hours",
            "time_distribution": "Equal time for all parts of syllabus",
            "study_approach": "Strong subjects first",
            "revision_strategy": "Regular revision",
            "test_frequency": "Weekly tests",
            "seasonal_windows": [],
            "catch_up_day_preference": "Weekends"
        }
    }
    
    try:
        print("Setting up test environment...")
        
        # Test 1: Main scenario test
        print("\nTest 1: Main Ananth Scenario")
        print("-" * 40)
        await test_instance.test_generate_plan_for_ananth(helios_engine, ananth_wizard_data)
        print("Main scenario test passed!")
        
        # Test 2: Calculations verification
        print("\nTest 2: Mathematical Calculations Verification")
        print("-" * 40)
        await test_instance.test_ananth_calculations_verification(helios_engine, ananth_wizard_data)
        print("Calculations verification test passed!")
        
        # Test 3: Mock service integration
        print("\nTest 3: Mock CMS Service Integration")
        print("-" * 40)
        await test_instance.test_ananth_mock_service_integration(helios_engine, ananth_wizard_data)
        print("Mock service integration test passed!")
        
        print("\nAll tests passed successfully!")
        print("=" * 60)
        print("Test Summary:")
        print("   • Main scenario test: PASSED")
        print("   • Calculations verification: PASSED")
        print("   • Mock service integration: PASSED")
        print("\nAnanth's Study Plan Generated Successfully:")
        print("   • First block: History (6 weeks)")
        print("   • Daily study time: 113 minutes")
        print("   • Daily revision time: 37 minutes")
        print("   • Daily practice time: 37 minutes")
        print("   • Curated resources: History (3)")
        
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        print("=" * 60)
        return False
    
    return True


def main():
    """Main function to run the test."""
    print("Starting Ananth Test Scenario Runner")
    print("This test verifies the Helios Engine generates correct study plans for Ananth")
    print("using the mock CMS service for consistent, deterministic testing.\n")
    
    # Run the async test
    success = asyncio.run(run_ananth_test())
    
    if success:
        print("\nTest execution completed successfully!")
        sys.exit(0)
    else:
        print("\nTest execution failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
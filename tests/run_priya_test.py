#!/usr/bin/env python3
"""
Test runner for Priya's scenario.

This script demonstrates how to run the Priya test scenario and provides
a simple way to execute the test without using pytest directly.
"""

import asyncio
import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from test_priya_scenario import TestPriyaScenario
from helios import HeliosEngine, MockCMSService


async def run_priya_test():
    """Run Priya's test scenario and report results."""
    print("🧪 Running Priya (The Ambitious Achiever) Test Scenario")
    print("=" * 60)
    
    # Create test instance
    test_instance = TestPriyaScenario()
    
    # Create services and data directly (not using pytest fixtures)
    mock_cms_service = MockCMSService()
    helios_engine = HeliosEngine(cms_service=mock_cms_service)
    
    # Priya's wizard data from 05c-scenario-priya-test-spec.md
    priya_wizard_data = {
        "subject_confidence": {
            "prelims_confidence": {
                "current_events": "Strong",
                "history_of_india": "Strong",
                "indian_world_geography": "Moderate",
                "polity_governance": "Strong",
                "economy_social_development": "Very Weak",
                "environment_ecology": "Moderate",
                "science_technology": "Moderate",
                "csat": "Strong"
            },
            "mains_gs1_confidence": {
                "essay": "Moderate",
                "indian_culture": "Moderate",
                "modern_history": "Strong",
                "world_history": "Moderate",
                "post_independence_india": "Strong",
                "indian_society": "Moderate",
                "indian_world_geography": "Moderate"
            },
            "mains_gs2_confidence": {
                "constitution": "Strong",
                "polity": "Strong",
                "governance": "Moderate",
                "social_justice": "Moderate",
                "international_relations": "Moderate"
            },
            "mains_gs3_confidence": {
                "economy": "Very Weak",
                "agriculture": "Moderate",
                "environment": "Moderate",
                "science_technology": "Moderate",
                "disaster_management": "Strong",
                "internal_security": "Strong"
            },
            "mains_gs4_optional_confidence": {
                "ethics_integrity_aptitude": "Very Weak",
                "optional_subject_paper1": "Strong",
                "optional_subject_paper2": "Strong"
            }
        },
        "study_strategy": {
            "study_focus_combo": "One GS + Optional",
            "weekly_study_hours": "55 hours",
            "time_distribution": "Equal time for all parts of syllabus",
            "study_approach": "Weak subjects first",
            "revision_strategy": "Regular revision",
            "test_frequency": "Weekly tests",
            "seasonal_windows": [],
            "catch_up_day_preference": "Weekends"
        }
    }
    
    try:
        print("✅ Setting up test environment...")
        
        # Test 1: Main scenario test
        print("\n📋 Test 1: Main Priya Scenario")
        print("-" * 40)
        await test_instance.test_generate_plan_for_priya(helios_engine, priya_wizard_data)
        print("✅ Main scenario test passed!")
        
        # Test 2: Calculations verification
        print("\n📋 Test 2: Mathematical Calculations Verification")
        print("-" * 40)
        await test_instance.test_priya_calculations_verification(helios_engine, priya_wizard_data)
        print("✅ Calculations verification test passed!")
        
        # Test 3: Mock service integration
        print("\n📋 Test 3: Mock CMS Service Integration")
        print("-" * 40)
        await test_instance.test_priya_mock_service_integration(helios_engine, priya_wizard_data)
        print("✅ Mock service integration test passed!")
        
        print("\n🎉 All tests passed successfully!")
        print("=" * 60)
        print("📊 Test Summary:")
        print("   • Main scenario test: ✅ PASSED")
        print("   • Calculations verification: ✅ PASSED")
        print("   • Mock service integration: ✅ PASSED")
        print("\n📝 Priya's Study Plan Generated Successfully:")
        print("   • First block: Ethics + Economy (5 weeks)")
        print("   • Daily study time: 282 minutes")
        print("   • Daily revision time: 94 minutes")
        print("   • Daily practice time: 94 minutes")
        print("   • Curated resources: Ethics (3), Economy (3)")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("=" * 60)
        return False
    
    return True


def main():
    """Main function to run the test."""
    print("🚀 Starting Priya Test Scenario Runner")
    print("This test verifies the Helios Engine generates correct study plans for Priya")
    print("using the mock CMS service for consistent, deterministic testing.\n")
    
    # Run the async test
    success = asyncio.run(run_priya_test())
    
    if success:
        print("\n🎯 Test execution completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Test execution failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()

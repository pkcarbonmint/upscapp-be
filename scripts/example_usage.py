#!/usr/bin/env python3
"""
Example usage of the ScenarioMarkdownGenerator

This script demonstrates how to use the ScenarioMarkdownGenerator class
programmatically for custom scenarios or batch processing.
"""

import asyncio
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from generate_scenario_markdown import ScenarioMarkdownGenerator


async def example_usage():
    """Example of how to use the ScenarioMarkdownGenerator programmatically."""
    
    # Initialize the generator
    generator = ScenarioMarkdownGenerator()
    
    # List available scenarios
    scenarios = generator.list_scenarios()
    print(f"Available scenarios: {scenarios}")
    
    # Process a specific scenario
    if scenarios:
        scenario_file = scenarios[0]  # Use the first available scenario
        print(f"\nProcessing scenario: {scenario_file}")
        
        success = await generator.generate_scenario_markdown(
            scenario_file=scenario_file,
            output_dir="example_outputs"
        )
        
        if success:
            print(f"✅ Successfully generated output for {scenario_file}")
        else:
            print(f"❌ Failed to generate output for {scenario_file}")
    
    # Example of custom wizard data (if you want to test with custom data)
    custom_wizard_data = {
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
            "weekly_study_hours": "40 hours",
            "time_distribution": "Equal time for all parts of syllabus",
            "study_approach": "Weak subjects first",
            "revision_strategy": "Regular revision",
            "test_frequency": "Weekly tests",
            "seasonal_windows": [],
            "catch_up_day_preference": "Weekends"
        }
    }
    
    print("\nExample of custom wizard data structure:")
    print("This shows the format expected by the helios engine")
    print("You can use this as a template for creating new scenarios")


if __name__ == "__main__":
    asyncio.run(example_usage())

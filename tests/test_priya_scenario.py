"""
Test implementation for Priya (The Ambitious Achiever) scenario.

This test file implements the test case specification from 05c-scenario-priya-test-spec.md
and verifies that the Helios Engine correctly generates a study plan for Priya using
the mock CMS service for consistent, deterministic testing.
"""

import pytest
import uuid
from typing import Dict, Any

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from helios import HeliosEngine, MockCMSService
from helios.models import StudentIntakeWizard


class TestPriyaScenario:
    """
    Test class for Priya (The Ambitious Achiever) scenario.
    
    This test verifies that the Helios Engine correctly generates a study plan
    for Priya with her specific characteristics:
    - Very weak in Economy and Ethics
    - 55 hours per week study time
    - Weak subjects first approach
    - One GS + Optional focus
    """

    @pytest.fixture
    def mock_cms_service(self):
        """Create a mock CMS service for consistent test data."""
        return MockCMSService()

    @pytest.fixture
    def helios_engine(self, mock_cms_service):
        """Create a Helios Engine instance with mock CMS service."""
        return HeliosEngine(cms_service=mock_cms_service)

    @pytest.fixture
    def priya_wizard_data(self) -> Dict[str, Any]:
        """
        Priya's wizard data from 05c-scenario-priya-test-spec.md
        
        This represents Priya's submission from the student intake wizard.
        """
        return {
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

    @pytest.mark.asyncio
    async def test_generate_plan_for_priya(self, helios_engine, priya_wizard_data):
        """
        Test Priya's scenario from 05c-scenario-priya-test-spec.md
        
        This test verifies that the engine correctly generates a study plan
        for Priya (The Ambitious Achiever) with her specific characteristics:
        - Very weak in Economy and Ethics
        - 55 hours per week study time
        - Weak subjects first approach
        - One GS + Optional focus
        """
        # Setup: Create wizard object from test data
        wizard = StudentIntakeWizard(**priya_wizard_data)
        
        # Execute: Generate plan using the engine
        study_plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="priya-123", 
            wizard=wizard
        )
        
        # Verify: All assertions from the specification
        
        # 1. Top-Level Plan Assertions
        self._verify_top_level_plan_assertions(study_plan)
        
        # 2. First Block Assertions
        first_block = study_plan.blocks[0]
        self._verify_first_block_assertions(first_block)
        
        # 3. Weekly Plan Assertions
        weekly_plan = first_block.weekly_plan
        self._verify_weekly_plan_assertions(weekly_plan)
        
        # 4. Daily Plan and Task Assertions
        self._verify_daily_plan_and_task_assertions(weekly_plan)
        
        # 5. Curated Resources Assertions
        self._verify_curated_resources_assertions(study_plan)

    def _verify_top_level_plan_assertions(self, study_plan):
        """
        Verify top-level plan assertions from the specification.
        
        Args:
            study_plan: The StudyPlan object returned by the engine
        """
        # The plan object should exist
        assert study_plan is not None, "Study plan should not be None"
        
        # The title should be the default title
        assert study_plan.title == "Helios Study Plan", f"Expected title 'Helios Study Plan', got '{study_plan.title}'"
        
        # The plan should have curated resources
        assert study_plan.curated_resources is not None, "Study plan should have curated resources"
        
        # The resources should include the first block's subjects
        expected_subjects = {"Ethics", "Economy"}
        actual_subjects = set(study_plan.curated_resources.keys())
        for expected_subject in expected_subjects:
            assert expected_subject in actual_subjects, f"Expected curated resources to include '{expected_subject}', but got {actual_subjects}"
        
        # The plan must contain at least one study block
        assert len(study_plan.blocks) > 0, "Study plan should contain at least one block"

    def _verify_first_block_assertions(self, first_block):
        """
        Verify first block assertions from the specification.
        
        Args:
            first_block: The first StudyBlock in the study plan
        """
        # The subjects in the first block should be Priya's weakest subjects
        expected_subjects = {"Ethics", "Economy"}
        actual_subjects = set(first_block.subjects)
        assert actual_subjects == expected_subjects, f"Expected first block subjects {expected_subjects}, got {actual_subjects}"
        
        # The block duration should be calculated correctly
        # Calculation: (Ethics: 80*1.25) + (Economy: 110*1.25) = 237.5 hrs
        # 237.5 / 55 hrs/week = 4.31 -> ceil(4.31) = 5 weeks
        expected_duration = 5
        actual_duration = first_block.duration_weeks
        assert actual_duration == expected_duration, f"Expected duration {expected_duration} weeks, got {actual_duration}"
        
        # The first block must have a detailed weekly plan
        assert first_block.weekly_plan is not None, "First block should have a weekly plan"

    def _verify_weekly_plan_assertions(self, weekly_plan):
        """
        Verify weekly plan assertions from the specification.
        
        Args:
            weekly_plan: The WeeklyPlan object for the first block
        """
        # The plan should be for the first week
        expected_week = 1
        actual_week = weekly_plan.week
        assert actual_week == expected_week, f"Expected week {expected_week}, got {actual_week}"
        
        # The weekly plan should contain exactly 7 days
        expected_days = 7
        actual_days = len(weekly_plan.daily_plans)
        assert actual_days == expected_days, f"Expected {expected_days} daily plans, got {actual_days}"

    def _verify_daily_plan_and_task_assertions(self, weekly_plan):
        """
        Verify daily plan and task assertions from the specification.
        
        Args:
            weekly_plan: The WeeklyPlan object for the first block
        """
        # Check the details for each of the 7 daily plans
        for i, daily_plan in enumerate(weekly_plan.daily_plans):
            # Check that the day number is correct (1-indexed)
            expected_day = i + 1
            actual_day = daily_plan.day
            assert actual_day == expected_day, f"Expected day {expected_day}, got {actual_day}"
            
            # Each day should have exactly 3 tasks (Study, Revision, Practice)
            expected_tasks = 3
            actual_tasks = len(daily_plan.tasks)
            assert actual_tasks == expected_tasks, f"Expected {expected_tasks} tasks for day {expected_day}, got {actual_tasks}"
            
            # Verify the details of each task
            study_task = daily_plan.tasks[0]
            revision_task = daily_plan.tasks[1]
            practice_task = daily_plan.tasks[2]
            
            # Study task assertions
            actual_study_title = study_task.title
            assert actual_study_title.startswith("Study:"), f"Expected study task title to start with 'Study:', got '{actual_study_title}'"
            
            expected_study_duration = 282
            actual_study_duration = study_task.duration_minutes
            assert actual_study_duration == expected_study_duration, f"Expected study duration {expected_study_duration} minutes, got {actual_study_duration}"
            
            # Revision task assertions
            expected_revision_title = "Revision"
            actual_revision_title = revision_task.title
            assert actual_revision_title == expected_revision_title, f"Expected revision task title '{expected_revision_title}', got '{actual_revision_title}'"
            
            expected_revision_duration = 94
            actual_revision_duration = revision_task.duration_minutes
            assert actual_revision_duration == expected_revision_duration, f"Expected revision duration {expected_revision_duration} minutes, got {actual_revision_duration}"
            
            # Practice task assertions
            expected_practice_title = "Practice (PYQs/MCQs/Answers)"
            actual_practice_title = practice_task.title
            assert actual_practice_title == expected_practice_title, f"Expected practice task title '{expected_practice_title}', got '{actual_practice_title}'"
            
            expected_practice_duration = 94
            actual_practice_duration = practice_task.duration_minutes
            assert actual_practice_duration == expected_practice_duration, f"Expected practice duration {expected_practice_duration} minutes, got {actual_practice_duration}"

    def _verify_curated_resources_assertions(self, study_plan):
        """
        Verify curated resources assertions from the specification.
        
        Args:
            study_plan: The StudyPlan object returned by the engine
        """
        # Verify that curated resources include the first block's subjects
        expected_subjects = {"Ethics", "Economy"}
        actual_subjects = set(study_plan.curated_resources.keys())
        
        # Check that the expected subjects are present (but allow additional subjects)
        for expected_subject in expected_subjects:
            assert expected_subject in actual_subjects, f"Expected curated resources to include '{expected_subject}', but got {actual_subjects}"
        
        # Check Ethics resources from mock service
        ethics_resources = study_plan.curated_resources["Ethics"]
        expected_ethics_resources = ["Lexicon Ethics", "Case Studies", "PYKs (Ethics)"]
        
        for resource in expected_ethics_resources:
            assert resource in ethics_resources, f"Expected Ethics resource '{resource}' not found in {ethics_resources}"
        
        expected_ethics_count = 3
        actual_ethics_count = len(ethics_resources)
        assert actual_ethics_count == expected_ethics_count, f"Expected {expected_ethics_count} Ethics resources, got {actual_ethics_count}"
        
        # Check Economy resources from mock service
        economy_resources = study_plan.curated_resources["Economy"]
        expected_economy_resources = ["Sriram Economy Notes", "NCERT Economy", "PYQs (Economy)"]
        
        for resource in expected_economy_resources:
            assert resource in economy_resources, f"Expected Economy resource '{resource}' not found in {economy_resources}"
        
        expected_economy_count = 3
        actual_economy_count = len(economy_resources)
        assert actual_economy_count == expected_economy_count, f"Expected {expected_economy_count} Economy resources, got {actual_economy_count}"

    @pytest.mark.asyncio
    async def test_priya_calculations_verification(self, helios_engine, priya_wizard_data):
        """
        Additional test to verify the mathematical calculations for Priya's scenario.
        
        This test ensures that the duration and task time calculations are mathematically correct.
        """
        # Create wizard object and generate plan
        wizard = StudentIntakeWizard(**priya_wizard_data)
        study_plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="priya-123", 
            wizard=wizard
        )
        
        first_block = study_plan.blocks[0]
        weekly_plan = first_block.weekly_plan
        
        # Verify duration calculation
        # Ethics: 80 hours * 1.25 (very weak adjustment) = 100 hours
        # Economy: 110 hours * 1.25 (very weak adjustment) = 137.5 hours
        # Total: 237.5 hours
        # Duration: 237.5 / 55 hours/week = 4.31 weeks → ceil(4.31) = 5 weeks
        expected_duration = 5
        actual_duration = first_block.duration_weeks
        assert actual_duration == expected_duration, f"Duration calculation failed: expected {expected_duration}, got {actual_duration}"
        
        # Verify daily task duration calculations
        # Daily study: 55 hours/week * 60% study / 7 days * 60 minutes = 282 minutes
        # Daily revision: 55 hours/week * 20% revision / 7 days * 60 minutes = 94 minutes
        # Daily practice: 55 hours/week * 20% practice / 7 days * 60 minutes = 94 minutes
        
        daily_plan = weekly_plan.daily_plans[0]  # Use first day for verification
        
        study_task = daily_plan.tasks[0]
        expected_study_minutes = 282
        actual_study_minutes = study_task.duration_minutes
        assert actual_study_minutes == expected_study_minutes, f"Study duration calculation failed: expected {expected_study_minutes}, got {actual_study_minutes}"
        
        revision_task = daily_plan.tasks[1]
        expected_revision_minutes = 94
        actual_revision_minutes = revision_task.duration_minutes
        assert actual_revision_minutes == expected_revision_minutes, f"Revision duration calculation failed: expected {expected_revision_minutes}, got {actual_revision_minutes}"
        
        practice_task = daily_plan.tasks[2]
        expected_practice_minutes = 94
        actual_practice_minutes = practice_task.duration_minutes
        assert actual_practice_minutes == expected_practice_minutes, f"Practice duration calculation failed: expected {expected_practice_minutes}, got {actual_practice_minutes}"

    @pytest.mark.asyncio
    async def test_priya_mock_service_integration(self, helios_engine, priya_wizard_data):
        """
        Test that the mock CMS service is properly integrated for Priya's scenario.
        
        This test verifies that the engine can successfully fetch data from
        the mock service and use it to generate Priya's plan.
        """
        # Test that the engine can access CMS data
        subjects = await helios_engine.cms_service.get_list_of_subjects()
        assert len(subjects) > 0, "Mock service should return subjects"
        assert "Ethics" in subjects, "Mock service should include Ethics subject"
        assert "Economy" in subjects, "Mock service should include Economy subject"
        
        # Test that subject metadata is available
        ethics_metadata = await helios_engine.cms_service.get_metadata_for_subject("Ethics")
        assert ethics_metadata is not None, "Ethics metadata should be available"
        assert ethics_metadata.baseline_hours == 80, "Ethics should have 80 baseline hours"
        assert "Lexicon Ethics" in ethics_metadata.resources, "Ethics should include Lexicon Ethics resource"
        
        economy_metadata = await helios_engine.cms_service.get_metadata_for_subject("Economy")
        assert economy_metadata is not None, "Economy metadata should be available"
        assert economy_metadata.baseline_hours == 110, "Economy should have 110 baseline hours"
        assert "Sriram Economy Notes" in economy_metadata.resources, "Economy should include Sriram Economy Notes resource"
        
        # Test that the engine can generate Priya's plan
        wizard = StudentIntakeWizard(**priya_wizard_data)
        plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="priya-123", 
            wizard=wizard
        )
        
        # Basic plan validation
        assert plan is not None, "Plan should be generated successfully"
        assert len(plan.blocks) > 0, "Plan should contain blocks"
        assert plan.curated_resources is not None, "Plan should have curated resources"
        assert "Ethics" in plan.curated_resources, "Plan should include Ethics resources"
        assert "Economy" in plan.curated_resources, "Plan should include Economy resources"


if __name__ == "__main__":
    # This allows running the tests directly for demonstration
    pytest.main([__file__, "-v"])

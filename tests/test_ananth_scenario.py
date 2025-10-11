"""
Test implementation for Ananth (The Working Professional) scenario.

This test file implements the test case specification from 05d-scenario-ananth-test-spec.md
and verifies that the Helios Engine correctly generates a study plan for Ananth using
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


class TestAnanthScenario:
    """
    Test class for Ananth (The Working Professional) scenario.
    
    This test verifies that the Helios Engine correctly generates a study plan
    for Ananth with his specific characteristics:
    - Strong in History (his strongest subject)
    - 22 hours per week study time
    - Strong subjects first approach
    - One GS at a time focus
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
    def ananth_wizard_data(self) -> Dict[str, Any]:
        """
        Ananth's wizard data from 05d-scenario-ananth-test-spec.md
        
        This represents Ananth's submission from the student intake wizard.
        """
        return {
            "subject_confidence": {
                "prelims_confidence": {
                    "current_events": "Moderate",
                    "history_of_india": "Strong",
                    "indian_world_geography": "Moderate",
                    "polity_governance": "Moderate",
                    "economy_social_development": "Moderate",
                    "environment_ecology": "Moderate",
                    "science_technology": "Moderate",
                    "csat": "Strong"
                },
                "mains_gs1_confidence": {
                    "essay": "Moderate",
                    "indian_culture": "Moderate",
                    "modern_history": "Strong",
                    "world_history": "Moderate",
                    "post_independence_india": "Moderate",
                    "indian_society": "Moderate",
                    "indian_world_geography": "Moderate"
                },
                "mains_gs2_confidence": {
                    "constitution": "Moderate",
                    "polity": "Moderate",
                    "governance": "Moderate",
                    "social_justice": "Moderate",
                    "international_relations": "Moderate"
                },
                "mains_gs3_confidence": {
                    "economy": "Moderate",
                    "agriculture": "Moderate",
                    "environment": "Moderate",
                    "science_technology": "Moderate",
                    "disaster_management": "Moderate",
                    "internal_security": "Moderate"
                },
                "mains_gs4_optional_confidence": {
                    "ethics_integrity_aptitude": "Moderate",
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

    @pytest.mark.asyncio
    async def test_generate_plan_for_ananth(self, helios_engine, ananth_wizard_data):
        """
        Test Ananth's scenario from 05d-scenario-ananth-test-spec.md
        
        This test verifies that the engine correctly generates a study plan
        for Ananth (The Working Professional) with his specific characteristics:
        - Strong in History (his strongest subject)
        - 22 hours per week study time
        - Strong subjects first approach
        - One GS at a time focus
        """
        # Setup: Create wizard object from test data
        wizard = StudentIntakeWizard(**ananth_wizard_data)
        
        # Execute: Generate plan using the engine
        study_plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="ananth-456", 
            wizard=wizard
        )
        
        # Verify: All assertions from the specification
        
        # 1. Top-Level Plan Assertions
        self._verify_top_level_plan_assertions(study_plan)
        
        # 2. Block-by-Block Assertions
        self._verify_block_by_block_assertions(study_plan)
        
        # 3. Weekly Plan Assertions (First Block)
        first_block = study_plan.blocks[0]
        weekly_plan = first_block.weekly_plan
        self._verify_weekly_plan_assertions(weekly_plan)
        
        # 4. Daily Plan and Task Assertions (First Block)
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
        
        # The plan should have curated resources for all subjects in the plan
        assert study_plan.curated_resources is not None, "Study plan should have curated resources"
        assert "History" in study_plan.curated_resources, "Expected curated resources to include 'History'"
        assert len(study_plan.curated_resources) == len(study_plan.blocks), f"Expected curated resources for {len(study_plan.blocks)} subjects, got {len(study_plan.curated_resources)}"
        
        # The plan must contain at least one study block
        assert len(study_plan.blocks) > 0, "Study plan should contain at least one block"

    def _verify_block_by_block_assertions(self, study_plan):
        """
        Verify block-by-block assertions from the specification.
        
        Args:
            study_plan: The StudyPlan object returned by the engine
        """
        # Check the first block
        first_block = study_plan.blocks[0]
        assert set(first_block.subjects) == {"History"}, f"Expected first block subjects {{'History'}}, got {set(first_block.subjects)}"
        
        # The block duration should be calculated correctly
        # Calculation: (History: 120hrs, no adjustment for 'Strong') = 120 total hrs
        # 120 / 22 hrs/week = 5.45 weeks -> ceil(5.45) = 6
        # Clamped to 4-6 weeks, so result is 6
        expected_duration = 6
        actual_duration = first_block.duration_weeks
        assert actual_duration == expected_duration, f"Expected duration {expected_duration} weeks, got {actual_duration}"
        
        assert first_block.weekly_plan is not None, "First block should have a weekly plan"
        
        # Check that subsequent blocks also have a weekly plan
        if len(study_plan.blocks) > 1:
            for i, block in enumerate(study_plan.blocks[1:], 2):
                assert block.weekly_plan is not None, f"Block {i} should have a weekly plan"

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
        # Check the details for each of the 7 daily plans in the first block
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
            expected_study_title = "Study: New Topics"
            actual_study_title = study_task.title
            assert actual_study_title == expected_study_title, f"Expected study task title '{expected_study_title}', got '{actual_study_title}'"
            
            expected_study_duration = 113
            actual_study_duration = study_task.duration_minutes
            assert actual_study_duration == expected_study_duration, f"Expected study duration {expected_study_duration} minutes, got {actual_study_duration}"
            
            # Revision task assertions
            expected_revision_title = "Revision"
            actual_revision_title = revision_task.title
            assert actual_revision_title == expected_revision_title, f"Expected revision task title '{expected_revision_title}', got '{actual_revision_title}'"
            
            expected_revision_duration = 37
            actual_revision_duration = revision_task.duration_minutes
            assert actual_revision_duration == expected_revision_duration, f"Expected revision duration {expected_revision_duration} minutes, got {actual_revision_duration}"
            
            # Practice task assertions
            expected_practice_title = "Practice (PYQs/MCQs/Answers)"
            actual_practice_title = practice_task.title
            assert actual_practice_title == expected_practice_title, f"Expected practice task title '{expected_practice_title}', got '{actual_practice_title}'"
            
            expected_practice_duration = 37
            actual_practice_duration = practice_task.duration_minutes
            assert actual_practice_duration == expected_practice_duration, f"Expected practice duration {expected_practice_duration} minutes, got {actual_practice_duration}"

    def _verify_curated_resources_assertions(self, study_plan):
        """
        Verify curated resources assertions from the specification.
        
        Args:
            study_plan: The StudyPlan object returned by the engine
        """
        # Verify that curated resources match the mock CMS service data
        assert "History" in study_plan.curated_resources, "Expected curated resources to include 'History'"
        
        # Check History resources from mock service
        history_resources = study_plan.curated_resources["History"]
        expected_history_resources = ["Tamil Nadu History", "Spectrum", "PYQs (History)"]
        
        for resource in expected_history_resources:
            assert resource in history_resources, f"Expected History resource '{resource}' not found in {history_resources}"
        
        expected_history_count = 3
        actual_history_count = len(history_resources)
        assert actual_history_count == expected_history_count, f"Expected {expected_history_count} History resources, got {actual_history_count}"

    @pytest.mark.asyncio
    async def test_ananth_calculations_verification(self, helios_engine, ananth_wizard_data):
        """
        Additional test to verify the mathematical calculations for Ananth's scenario.
        
        This test ensures that the duration and task time calculations are mathematically correct.
        """
        # Create wizard object and generate plan
        wizard = StudentIntakeWizard(**ananth_wizard_data)
        study_plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="ananth-456", 
            wizard=wizard
        )
        
        first_block = study_plan.blocks[0]
        weekly_plan = first_block.weekly_plan
        
        # Verify duration calculation
        # History: 120 hours (no adjustment for 'Strong')
        # Duration: 120 / 22 hours/week = 5.45 weeks → ceil(5.45) = 6 weeks
        # Clamped to 4-6 weeks, so result is 6
        expected_duration = 6
        actual_duration = first_block.duration_weeks
        assert actual_duration == expected_duration, f"Duration calculation failed: expected {expected_duration}, got {actual_duration}"
        
        # Verify daily task duration calculations
        # Daily study: 22 hours/week * 60% study / 7 days * 60 minutes = 113 minutes
        # Daily revision: 22 hours/week * 20% revision / 7 days * 60 minutes = 37 minutes
        # Daily practice: 22 hours/week * 20% practice / 7 days * 60 minutes = 37 minutes
        
        daily_plan = weekly_plan.daily_plans[0]  # Use first day for verification
        
        study_task = daily_plan.tasks[0]
        expected_study_minutes = 113
        actual_study_minutes = study_task.duration_minutes
        assert actual_study_minutes == expected_study_minutes, f"Study duration calculation failed: expected {expected_study_minutes}, got {actual_study_minutes}"
        
        revision_task = daily_plan.tasks[1]
        expected_revision_minutes = 37
        actual_revision_minutes = revision_task.duration_minutes
        assert actual_revision_minutes == expected_revision_minutes, f"Revision duration calculation failed: expected {expected_revision_minutes}, got {actual_revision_minutes}"
        
        practice_task = daily_plan.tasks[2]
        expected_practice_minutes = 37
        actual_practice_minutes = practice_task.duration_minutes
        assert actual_practice_minutes == expected_practice_minutes, f"Practice duration calculation failed: expected {expected_practice_minutes}, got {actual_practice_minutes}"

    @pytest.mark.asyncio
    async def test_ananth_mock_service_integration(self, helios_engine, ananth_wizard_data):
        """
        Test that the mock CMS service is properly integrated for Ananth's scenario.
        
        This test verifies that the engine can successfully fetch data from
        the mock service and use it to generate Ananth's plan.
        """
        # Test that the engine can access CMS data
        subjects = await helios_engine.cms_service.get_list_of_subjects()
        assert len(subjects) > 0, "Mock service should return subjects"
        assert "History" in subjects, "Mock service should include History subject"
        
        # Test that subject metadata is available
        history_metadata = await helios_engine.cms_service.get_metadata_for_subject("History")
        assert history_metadata is not None, "History metadata should be available"
        assert history_metadata.baseline_hours == 120, "History should have 120 baseline hours"
        assert "Tamil Nadu History" in history_metadata.resources, "History should include Tamil Nadu History resource"
        assert "Spectrum" in history_metadata.resources, "History should include Spectrum resource"
        assert "PYQs (History)" in history_metadata.resources, "History should include PYQs (History) resource"
        
        # Test that the engine can generate Ananth's plan
        wizard = StudentIntakeWizard(**ananth_wizard_data)
        plan = await helios_engine.generate_initial_plan_from_wizard(
            user_id="ananth-456", 
            wizard=wizard
        )
        
        # Basic plan validation
        assert plan is not None, "Plan should be generated successfully"
        assert len(plan.blocks) > 0, "Plan should contain blocks"
        assert plan.curated_resources is not None, "Plan should have curated resources"
        assert "History" in plan.curated_resources, "Plan should include History resources"


if __name__ == "__main__":
    # This allows running the tests directly for demonstration
    pytest.main([__file__, "-v"])






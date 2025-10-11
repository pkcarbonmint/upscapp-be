"""
Data transformation utilities for converting between Python and Haskell Helios formats.

This module handles the mapping between:
- Python wizard data structures and Haskell UIWizardData format
- Haskell StudyPlan format and Python database models
"""

from typing import Dict, Any, List, Optional
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)


class HeliosDataMapper:
    """Handles data transformation between Python and Haskell formats."""
    
    @staticmethod
    def python_wizard_to_haskell_format(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Python wizard data to Haskell UIWizardData format.
        
        Args:
            wizard_data: Wizard data from Python frontend
            
        Returns:
            Data formatted for Haskell engine consumption
        """
        try:
            # Map the wizard data to match the Haskell UIWizardData structure
            haskell_format = {
                "personal_and_academic_details": {
                    "full_name": wizard_data.get("personal_details", {}).get("full_name", ""),
                    "email": wizard_data.get("personal_details", {}).get("email", ""),
                    "phone_number": wizard_data.get("personal_details", {}).get("phone_number", ""),
                    "present_location": wizard_data.get("personal_details", {}).get("present_location", ""),
                    "current_status": wizard_data.get("personal_details", {}).get("current_status", ""),
                    "graduation_stream": wizard_data.get("personal_details", {}).get("graduation_stream", ""),
                    "college_university": wizard_data.get("personal_details", {}).get("college_university", ""),
                    "year_of_passing": wizard_data.get("personal_details", {}).get("year_of_passing", 2024)
                },
                "preparation_background": {
                    "preparing_since": wizard_data.get("preparation_background", {}).get("preparing_since", ""),
                    "target_year": wizard_data.get("preparation_background", {}).get("target_year", "2025"),
                    "number_of_attempts": wizard_data.get("preparation_background", {}).get("number_of_attempts", "0"),
                    "highest_stage_per_attempt": wizard_data.get("preparation_background", {}).get("highest_stage_per_attempt", ""),
                    "last_attempt_gs_prelims_score": wizard_data.get("preparation_background", {}).get("last_attempt_gs_prelims_score", 0),
                    "last_attempt_csat_score": wizard_data.get("preparation_background", {}).get("last_attempt_csat_score", 0),
                    "wrote_mains_in_last_attempt": wizard_data.get("preparation_background", {}).get("wrote_mains_in_last_attempt", "No"),
                    "mains_paper_marks": wizard_data.get("preparation_background", {}).get("mains_paper_marks", "")
                },
                "coaching_and_mentorship": {
                    "prior_coaching": wizard_data.get("coaching_details", {}).get("prior_coaching", "No"),
                    "coaching_institute_name": wizard_data.get("coaching_details", {}).get("coaching_institute_name", ""),
                    "prior_mentorship": wizard_data.get("coaching_details", {}).get("prior_mentorship", "No"),
                    "programme_mentor_name": wizard_data.get("coaching_details", {}).get("programme_mentor_name", ""),
                    "place_of_preparation": wizard_data.get("coaching_details", {}).get("place_of_preparation", "")
                },
                "optional_subject_details": {
                    "optional_subject": wizard_data.get("optional_subject", {}).get("optional_subject", ""),
                    "optional_status": wizard_data.get("optional_subject", {}).get("optional_status", "Not Started"),
                    "optional_taken_from": wizard_data.get("optional_subject", {}).get("optional_taken_from", "")
                },
                "test_series_and_csat": {
                    "test_series_attempted": wizard_data.get("test_experience", {}).get("test_series_attempted", []),
                    "csat_self_assessment": wizard_data.get("test_experience", {}).get("csat_self_assessment", "Average"),
                    "csat_weak_areas": wizard_data.get("test_experience", {}).get("csat_weak_areas", [])
                },
                "syllabus_and_pyq_awareness": {
                    "gs_syllabus_understanding": wizard_data.get("syllabus_awareness", {}).get("gs_syllabus_understanding", "Basic"),
                    "optional_syllabus_understanding": wizard_data.get("syllabus_awareness", {}).get("optional_syllabus_understanding", "Basic"),
                    "pyq_awareness_and_use": wizard_data.get("syllabus_awareness", {}).get("pyq_awareness_and_use", "Basic")
                },
                "subject_confidence": HeliosDataMapper._map_subject_confidence(wizard_data.get("subject_confidence", {})),
                "study_strategy": {
                    "study_focus_combo": wizard_data.get("study_strategy", {}).get("study_focus_combo", "GS (Prelims + Mains) only"),
                    "weekly_study_hours": wizard_data.get("study_strategy", {}).get("weekly_study_hours", "40-50 hours"),
                    "time_distribution": wizard_data.get("study_strategy", {}).get("time_distribution", "Balanced"),
                    "study_approach": wizard_data.get("study_strategy", {}).get("study_approach", "Balanced (macro subject + micro subject in rotation)"),
                    "revision_strategy": wizard_data.get("study_strategy", {}).get("revision_strategy", "Regular"),
                    "test_frequency": wizard_data.get("study_strategy", {}).get("test_frequency", "Weekly"),
                    "seasonal_windows": wizard_data.get("study_strategy", {}).get("seasonal_windows", []),
                    "catch_up_day_preference": wizard_data.get("study_strategy", {}).get("catch_up_day_preference", "Saturday")
                }
            }
            
            logger.info("Successfully mapped Python wizard data to Haskell format")
            return haskell_format
            
        except Exception as e:
            logger.error(f"Error mapping wizard data to Haskell format: {e}")
            raise
    
    @staticmethod
    def _map_subject_confidence(confidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map subject confidence data to Haskell nested structure."""
        return {
            "prelims_confidence": {
                "prelims_current_events": confidence_data.get("current_events", "Moderate"),
                "prelims_history_of_india": confidence_data.get("history", "Moderate"),
                "prelims_indian_world_geography": confidence_data.get("geography", "Moderate"),
                "prelims_polity_governance": confidence_data.get("polity", "Moderate"),
                "prelims_economy_social_development": confidence_data.get("economy", "Moderate"),
                "prelims_environment_ecology": confidence_data.get("environment", "Moderate"),
                "prelims_science_technology": confidence_data.get("science_technology", "Moderate"),
                "prelims_csat": confidence_data.get("csat", "Moderate")
            },
            "mains_gs1_confidence": {
                "gs1_essay": confidence_data.get("essay", "Moderate"),
                "gs1_indian_culture": confidence_data.get("indian_culture", "Moderate"),
                "gs1_modern_history": confidence_data.get("modern_history", "Moderate"),
                "gs1_world_history": confidence_data.get("world_history", "Moderate"),
                "gs1_post_independence_india": confidence_data.get("post_independence", "Moderate"),
                "gs1_indian_society": confidence_data.get("indian_society", "Moderate"),
                "gs1_indian_world_geography": confidence_data.get("geography", "Moderate")
            },
            "mains_gs2_confidence": {
                "gs2_constitution": confidence_data.get("constitution", "Moderate"),
                "gs2_polity": confidence_data.get("polity", "Moderate"),
                "gs2_governance": confidence_data.get("governance", "Moderate"),
                "gs2_social_justice": confidence_data.get("social_justice", "Moderate"),
                "gs2_international_relations": confidence_data.get("international_relations", "Moderate")
            },
            "mains_gs3_confidence": {
                "gs3_economy": confidence_data.get("economy", "Moderate"),
                "gs3_agriculture": confidence_data.get("agriculture", "Moderate"),
                "gs3_environment": confidence_data.get("environment", "Moderate"),
                "gs3_science_technology": confidence_data.get("science_technology", "Moderate"),
                "gs3_disaster_management": confidence_data.get("disaster_management", "Moderate"),
                "gs3_internal_security": confidence_data.get("internal_security", "Moderate")
            },
            "mains_gs4_optional_confidence": {
                "gs4_ethics_integrity_aptitude": confidence_data.get("ethics", "Moderate"),
                "gs4_optional_subject_paper1": confidence_data.get("optional_paper1", "Moderate"),
                "gs4_optional_subject_paper2": confidence_data.get("optional_paper2", "Moderate")
            }
        }
    
    @staticmethod
    def haskell_plan_to_python_tasks(haskell_plan: Dict[str, Any], studyplan_id: int, created_by_id: int, created_by_name: str) -> List[Dict[str, Any]]:
        """
        Convert Haskell StudyPlan to Python PlanTask objects.
        
        Args:
            haskell_plan: Study plan from Haskell engine
            studyplan_id: ID of the study plan in the database
            created_by_id: ID of the user creating the plan
            created_by_name: Name of the user creating the plan
            
        Returns:
            List of PlanTask data dictionaries
        """
        try:
            tasks = []
            start_date = date.today()
            seq_id = 1
            week_offset = 0
            
            # Extract blocks from cycles (no more flat blocks list)
            blocks = HeliosDataMapper._extract_blocks_from_cycles(haskell_plan)
            
            for block in blocks:
                duration_weeks = block.get("duration_weeks", 1)
                subjects = block.get("subjects", [])
                weekly_plan = block.get("weekly_plan", {})
                
                # Extract cycle information from block
                cycle_id = block.get("cycle_id")
                cycle_type = block.get("cycle_type")
                cycle_order = block.get("cycle_order")
                cycle_name = block.get("cycle_name")
                
                if not weekly_plan:
                    continue
                
                daily_plans = weekly_plan.get("daily_plans", [])
                
                for week in range(duration_weeks):
                    week_start = start_date + timedelta(days=7 * (week_offset + week))
                    
                    # Process daily tasks
                    for daily_plan in daily_plans:
                        day = daily_plan.get("day", 1)
                        day_tasks = daily_plan.get("tasks", [])
                        day_date = week_start + timedelta(days=day - 1)
                        
                        for task in day_tasks:
                            task_type = HeliosDataMapper._determine_task_type(task.get("title", ""))
                            
                            task_data = {
                                "name": task.get("title", ""),
                                "task_type": task_type,
                                "task_seq_id": seq_id,
                                "studyplan_id": studyplan_id,
                                "papers": [],
                                "subjects": subjects[:1] if subjects else [],  # Take first subject
                                "topics": task.get("topics", []),
                                "subject_area": "gs_mains",  # Default subject area
                                "test_id": None,
                                "study_materials": [],
                                "planned_time": task.get("duration_minutes", 60),
                                "planned_completion_date": day_date.isoformat(),
                                "actual_completion_date": None,
                                "target_marks": None,
                                "links": HeliosDataMapper._generate_task_links(task, subjects),
                                "mentorship_meetings": [],
                                "reference_materials": task.get("resources", []),
                                "created_by_id": created_by_id,
                                "created_by": {"id": created_by_id, "name": created_by_name},
                                "status": "open",
                                "remarks": task.get("description", None),
                                # Add cycle information to tasks
                                "cycle_id": cycle_id,
                                "cycle_type": cycle_type,
                                "cycle_order": cycle_order,
                                "cycle_name": cycle_name
                            }
                            
                            tasks.append(task_data)
                            seq_id += 1
                    
                    # Add weekly envelope tasks
                    catchup_date = week_start + timedelta(days=5)
                    tasks.append({
                        "name": f"Catch-up Day (Week {week_offset + week + 1})",
                        "task_type": "catchup",
                        "task_seq_id": seq_id,
                        "studyplan_id": studyplan_id,
                        "papers": [],
                        "subjects": [],
                        "topics": [],
                        "subject_area": "gs_mains",
                        "test_id": None,
                        "study_materials": [],
                        "planned_time": 60,
                        "planned_completion_date": catchup_date.isoformat(),
                        "created_by_id": created_by_id,
                        "created_by": {"id": created_by_id, "name": created_by_name},
                        "status": "open",
                        "remarks": "Weekly catch-up buffer",
                        "cycle_id": cycle_id,
                        "cycle_type": cycle_type,
                        "cycle_order": cycle_order,
                        "cycle_name": cycle_name
                    })
                    seq_id += 1
                    
                    # Add weekly review tasks
                    review_date = week_start + timedelta(days=6)
                    tasks.append({
                        "name": f"Weekly Review (Week {week_offset + week + 1})",
                        "task_type": "mentor_meeting",
                        "task_seq_id": seq_id,
                        "studyplan_id": studyplan_id,
                        "papers": [],
                        "subjects": [],
                        "topics": [],
                        "subject_area": "gs_mains",
                        "test_id": None,
                        "study_materials": [],
                        "planned_time": 60,
                        "planned_completion_date": review_date.isoformat(),
                        "created_by_id": created_by_id,
                        "created_by": {"id": created_by_id, "name": created_by_name},
                        "status": "open",
                        "remarks": "Weekly mentor-student review",
                        "cycle_id": cycle_id,
                        "cycle_type": cycle_type,
                        "cycle_order": cycle_order,
                        "cycle_name": cycle_name
                    })
                    seq_id += 1
                
                week_offset += duration_weeks
            
            logger.info(f"Successfully converted Haskell plan to {len(tasks)} Python tasks")
            return tasks
            
        except Exception as e:
            logger.error(f"Error converting Haskell plan to Python tasks: {e}")
            raise
    
    @staticmethod
    def _determine_task_type(title: str) -> str:
        """Determine task type based on title."""
        title_lower = title.lower()
        if "study" in title_lower or "read" in title_lower:
            return "reading"
        elif "revision" in title_lower or "revise" in title_lower:
            return "revise"
        elif "practice" in title_lower:
            return "practice"
        elif "test" in title_lower:
            return "test"
        else:
            return "misc"
    
    @staticmethod
    def _generate_task_links(task: Dict[str, Any], subjects: List[str]) -> List[str]:
        """Generate appropriate links for a task based on its type and subjects."""
        from .config import get_practice_link, get_test_link
        
        links = []
        title = task.get("title", "").lower()
        subject = subjects[0] if subjects else None
        
        if "practice" in title:
            links.append(get_practice_link(subject))
        elif "test" in title:
            links.append(get_test_link(subject))
        
        return links
    
    @staticmethod
    def _extract_blocks_from_cycles(haskell_plan: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all blocks from cycles in a Haskell study plan."""
        cycles = haskell_plan.get("cycles", [])
        all_blocks = []
        
        if isinstance(cycles, list):
            for cycle in cycles:
                if isinstance(cycle, dict):
                    cycle_blocks = cycle.get("cycleBlocks", [])
                    if isinstance(cycle_blocks, list):
                        all_blocks.extend(cycle_blocks)
        
        return all_blocks

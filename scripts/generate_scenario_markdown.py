#!/usr/bin/env python3
"""
Helios Engine Scenario Markdown Generator

This script generates markdown documents with the output of the helios engine
for different test scenarios defined in the mentorship-notes folder.

Usage:
    python scripts/generate_scenario_markdown.py --scenario 05c-scenario-priya-test-spec.md
    python scripts/generate_scenario_markdown.py --all
    python scripts/generate_scenario_markdown.py --list
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from helios import HeliosEngine, MockCMSService
from helios.models import StudentIntakeWizard


class ScenarioMarkdownGenerator:
    """Generate markdown documents with helios engine output for test scenarios."""
    
    def __init__(self, mentorship_notes_dir: str = "mentorship-notes"):
        self.mentorship_notes_dir = Path(mentorship_notes_dir)
        self.engine = HeliosEngine(cms_service=MockCMSService())
        
    def list_scenarios(self) -> List[str]:
        """List all available scenario files."""
        scenarios = []
        for file_path in self.mentorship_notes_dir.glob("05*-scenario-*.md"):
            scenarios.append(file_path.name)
        return sorted(scenarios)
    
    def extract_scenario_description(self, scenario_file: str) -> Optional[str]:
        """Extract scenario description from the scenarios file."""
        scenarios_file = self.mentorship_notes_dir / "05b-scenarios.md"
        
        if not scenarios_file.exists():
            return None
            
        with open(scenarios_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract scenario name from filename
        scenario_name = scenario_file.replace('-scenario-', ' - ').replace('-test-spec.md', '').replace('05c-', '').replace('05d-', '')
        
        # Look for the scenario description in the scenarios file
        import re
        # Pattern to match numbered scenarios with names
        # For "05c - priya", we need to match "Priya (The Ambitious Achiever)"
        if scenario_name == "05c - priya":
            pattern = r'1\.\s*Priya\s*\([^)]+\)\s*-\s*(.*?)(?=\n\d+\.|\n\n|$)'
        elif scenario_name == "05d - ananth":
            pattern = r'2\.\s*Ananth\s*\([^)]+\)\s*-\s*(.*?)(?=\n\d+\.|\n\n|$)'
        else:
            # Generic pattern for other scenarios
            pattern = rf'\d+\.\s*{re.escape(scenario_name)}\s*\([^)]+\)\s*-\s*(.*?)(?=\n\d+\.|\n\n|$)'
        
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            return match.group(1).strip()
        return None

    def extract_wizard_data_from_markdown(self, scenario_file: str) -> Optional[Dict[str, Any]]:
        """Extract wizard data JSON from a scenario markdown file."""
        file_path = self.mentorship_notes_dir / scenario_file
        
        if not file_path.exists():
            print(f"Error: Scenario file {scenario_file} not found in {self.mentorship_notes_dir}")
            return None
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for JSON block in the markdown
        import re
        json_pattern = r'```json\s*\n(.*?)\n```'
        match = re.search(json_pattern, content, re.DOTALL)
        
        if not match:
            print(f"Error: No JSON block found in {scenario_file}")
            return None
            
        try:
            wizard_data = json.loads(match.group(1))
            
            # Normalize confidence values (some scenarios use "Average" instead of "Moderate")
            wizard_data = self._normalize_confidence_values(wizard_data)
            
            return wizard_data
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in {scenario_file}: {e}")
            return None
    
    def _normalize_confidence_values(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize confidence values to match the expected enum values."""
        if 'subject_confidence' not in data:
            return data
        
        confidence_sections = [
            'prelims_confidence',
            'mains_gs1_confidence', 
            'mains_gs2_confidence',
            'mains_gs3_confidence',
            'mains_gs4_optional_confidence'
        ]
        
        for section in confidence_sections:
            if section in data['subject_confidence']:
                for key, value in data['subject_confidence'][section].items():
                    # Convert "Average" to "Moderate" to match the enum
                    if value == "Average":
                        data['subject_confidence'][section][key] = "Moderate"
                    # Also handle any other variations that might exist
                    elif value == "average":
                        data['subject_confidence'][section][key] = "Moderate"
        
        return data

    def _calculate_block_dates(self, blocks) -> List[tuple]:
        """Calculate start and end dates for each block."""
        from datetime import datetime, timedelta
        
        # Start from today's date
        current_date = datetime.now()
        block_dates = []
        
        for block in blocks:
            start_date = current_date.strftime('%Y-%m-%d')
            
            # Calculate end date based on duration
            end_date = current_date + timedelta(weeks=block.duration_weeks, days=-1)  # -1 because we start on the first day
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            block_dates.append((start_date, end_date_str))
            
            # Move to next block start date
            current_date = end_date + timedelta(days=1)
        
        return block_dates

    def format_study_plan_as_markdown(self, study_plan, scenario_name: str) -> str:
        """Format the study plan as a markdown document."""
        
        # Extract scenario name for title
        scenario_display_name = scenario_name.replace('-scenario-', ' - ').replace('-test-spec.md', '').replace('05c-', '').replace('05d-', '')
        
        # Get scenario description
        scenario_description = self.extract_scenario_description(scenario_name)
        
        # Calculate block dates
        block_dates = self._calculate_block_dates(study_plan.blocks)
        
        markdown = f"""# Helios Engine Output: {scenario_display_name}

Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Study Plan ID: {study_plan.study_plan_id}
User ID: {study_plan.user_id}

"""
        
        if scenario_description:
            markdown += f"""## Scenario Description

{scenario_description}

"""
        
        # Add block summary with dates
        markdown += f"""## Study Plan Overview

**Title:** {study_plan.title}
**Total Blocks:** {len(study_plan.blocks)}
**Curated Resources:** {len(study_plan.curated_resources) if study_plan.curated_resources else 0} subjects

## Block Summary

"""
        
        for i, (block, dates) in enumerate(zip(study_plan.blocks, block_dates), 1):
            start_date, end_date = dates
            # Extract subject part from block title (remove "Block X:" prefix if present)
            subject_part = block.title
            if block.title.startswith(f"Block {i}:"):
                subject_part = block.title[len(f"Block {i}:"):].strip()
            elif ":" in block.title:
                subject_part = block.title.split(":", 1)[1].strip()
            
            markdown += f"""### Block {i}: {subject_part}
**Duration:** {start_date} to {end_date} ({block.duration_weeks} weeks)
**Subjects:** {', '.join(block.subjects)}

"""
        
        markdown += """## Detailed Blocks

"""
        
        for i, (block, dates) in enumerate(zip(study_plan.blocks, block_dates), 1):
            start_date, end_date = dates
            markdown += f"""### {block.title}

**Subjects:** {', '.join(block.subjects)}
**Duration:** {start_date} to {end_date} ({block.duration_weeks} weeks)
**Block ID:** {block.block_id}

"""
            # Block-level resources
            if getattr(block, 'resources', None):
                markdown += "#### Resources\n\n"
                for subject, resources in block.resources.items():
                    markdown += f"- {subject}:\n"
                    for r in resources:
                        markdown += f"  - {r}\n"
                markdown += "\n"
            
            if block.weekly_plan:
                # Calculate total study hours from daily plans
                total_weekly_minutes = 0
                for daily_plan in block.weekly_plan.daily_plans:
                    for task in daily_plan.tasks:
                        total_weekly_minutes += task.duration_minutes
                total_weekly_hours = total_weekly_minutes / 60
                
                markdown += f"""#### Weekly Plan (Week {block.weekly_plan.week})

**Total Study Hours:** {total_weekly_hours:.1f} hours
**Total Tasks:** {len(block.weekly_plan.daily_plans)} days

"""
                
                for j, daily_plan in enumerate(block.weekly_plan.daily_plans, 1):
                    day_name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][j-1]
                    
                    # Calculate daily total minutes
                    daily_total_minutes = sum(task.duration_minutes for task in daily_plan.tasks)
                    daily_total_hours = daily_total_minutes / 60
                    
                    markdown += f"""##### {day_name} (Day {j})

**Total Hours:** {daily_total_hours:.1f} hours
**Tasks:** {len(daily_plan.tasks)}

"""
                    
                    for task in daily_plan.tasks:
                        task_hours = task.duration_minutes / 60
                        markdown += f"""- **{task.title}** ({task_hours:.1f}h)
  - Description: {task.description or 'No description provided'}
  - Task ID: {task.task_id}
  - Topics: {', '.join(task.topics) if task.topics else 'No specific topics'}

"""
        
        markdown += """## Curated Resources

"""
        
        if study_plan.curated_resources:
            for subject, resources in study_plan.curated_resources.items():
                markdown += f"""### {subject}

"""
                for resource in resources:
                    markdown += f"- {resource}\n"
                markdown += "\n"
        else:
            markdown += "No curated resources available.\n\n"
        
        return markdown
    
    async def generate_scenario_markdown(self, scenario_file: str, output_dir: str = "generated_outputs") -> bool:
        """Generate markdown output for a specific scenario."""
        
        # Extract wizard data
        wizard_data = self.extract_wizard_data_from_markdown(scenario_file)
        if not wizard_data:
            return False
        
        try:
            # Create wizard object
            wizard = StudentIntakeWizard(**wizard_data)
            
            # Generate study plan
            user_id = f"user-{uuid.uuid4().hex[:8]}"
            
            # Convert wizard to persona (this would normally be done by the service layer)
            from helios.persona import Persona, PersonaParameters, StudyStrategy as PersonaStudyStrategy
            
            # Extract weekly hours from study strategy string
            weekly_hours_str = wizard.study_strategy.weekly_study_hours
            weekly_hours = int(weekly_hours_str.split()[0]) if weekly_hours_str.split()[0].isdigit() else 40
            
            # Map study approach to our enum values
            approach_mapping = {
                "single": "single",
                "pair": "pair", 
                "trio": "trio",
                "dual": "pair",
                "triple": "trio"
            }
            study_approach = "pair"  # default
            for key, value in approach_mapping.items():
                if key in wizard.study_strategy.study_approach.lower():
                    study_approach = value
                    break
            
            # Convert confidence levels to our format
            confidence_profile = {}
            prelims = wizard.subject_confidence.prelims_confidence
            for field_name, value in prelims.model_dump().items():
                # Convert field names to readable subject names
                subject_name = field_name.replace('_', ' ').title()
                confidence_profile[subject_name] = value.lower() if value != "Moderate" else "neutral"
            
            # Create persona study strategy
            persona_strategy = PersonaStudyStrategy(
                studyFocusCombo=wizard.study_strategy.study_focus_combo,
                weeklyStudyHours=wizard.study_strategy.weekly_study_hours,
                timeDistribution=wizard.study_strategy.time_distribution,
                studyApproach=wizard.study_strategy.study_approach,
                revisionStrategy=wizard.study_strategy.revision_strategy,
                testFrequency=wizard.study_strategy.test_frequency,
                seasonalWindows=wizard.study_strategy.seasonal_windows,
                catchUpDayPreference=wizard.study_strategy.catch_up_day_preference
            )
            
            # Create a basic persona from wizard data
            persona = Persona(
                name="Test Persona",
                description="Generated from wizard data",
                parameters=PersonaParameters(
                    weekly_study_hours=weekly_hours,
                    study_pacing="weak_first",  # default
                    subject_approach=study_approach,
                    study_approach=study_approach,  # Both fields for compatibility
                    confidence_profile=confidence_profile,
                    study_strategy=persona_strategy
                )
            )
            
            study_plan = await self.engine.generate_initial_plan_from_persona(
                user_id=user_id,
                persona=persona
            )
            
            # Create output directory
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            # Generate markdown
            markdown_content = self.format_study_plan_as_markdown(study_plan, scenario_file)
            
            # Write output file
            output_filename = scenario_file.replace('.md', '-helios-output.md')
            output_file = output_path / output_filename
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            print(f"✅ Generated: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating output for {scenario_file}: {e}")
            return False
    
    async def generate_all_scenarios(self, output_dir: str = "generated_outputs") -> None:
        """Generate markdown output for all available scenarios."""
        scenarios = self.list_scenarios()
        
        if not scenarios:
            print("No scenario files found!")
            return
        
        print(f"Found {len(scenarios)} scenarios to process:")
        for scenario in scenarios:
            print(f"  - {scenario}")
        
        print(f"\nGenerating outputs to: {output_dir}")
        
        success_count = 0
        for scenario in scenarios:
            print(f"\nProcessing: {scenario}")
            if await self.generate_scenario_markdown(scenario, output_dir):
                success_count += 1
        
        print(f"\n✅ Completed! {success_count}/{len(scenarios)} scenarios processed successfully.")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate markdown documents with helios engine output for test scenarios"
    )
    parser.add_argument(
        "--scenario", 
        help="Specific scenario file to process (e.g., 05c-scenario-priya-test-spec.md)"
    )
    parser.add_argument(
        "--all", 
        action="store_true", 
        help="Process all available scenarios"
    )
    parser.add_argument(
        "--list", 
        action="store_true", 
        help="List all available scenarios"
    )
    parser.add_argument(
        "--output-dir", 
        default="generated_outputs",
        help="Output directory for generated markdown files (default: generated_outputs)"
    )
    parser.add_argument(
        "--mentorship-notes-dir", 
        default="mentorship-notes",
        help="Directory containing scenario files (default: mentorship-notes)"
    )
    
    args = parser.parse_args()
    
    generator = ScenarioMarkdownGenerator(args.mentorship_notes_dir)
    
    if args.list:
        scenarios = generator.list_scenarios()
        if scenarios:
            print("Available scenarios:")
            for scenario in scenarios:
                print(f"  - {scenario}")
        else:
            print("No scenario files found!")
        return
    
    if args.scenario:
        success = await generator.generate_scenario_markdown(args.scenario, args.output_dir)
        if not success:
            sys.exit(1)
    elif args.all:
        await generator.generate_all_scenarios(args.output_dir)
    else:
        parser.print_help()
        print("\nUse --list to see available scenarios or --scenario to process a specific one.")


if __name__ == "__main__":
    asyncio.run(main())

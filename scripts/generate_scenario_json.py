#!/usr/bin/env python3
"""
Helios Engine Scenario JSON Generator

This script generates JSON documents with the output of the Helios engine
for different test scenarios defined in the mentorship-notes folder.

Usage:
    python scripts/generate_scenario_json.py --scenario 05c-scenario-priya-test-spec.md
    python scripts/generate_scenario_json.py --all
    python scripts/generate_scenario_json.py --list
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


class ScenarioJSONGenerator:
    """Generate JSON documents with helios engine output for test scenarios."""
    
    def __init__(self, mentorship_notes_dir: str = "mentorship-notes"):
        self.mentorship_notes_dir = Path(mentorship_notes_dir)
        self.engine = HeliosEngine(cms_service=MockCMSService())
        
    def list_scenarios(self) -> List[str]:
        """List all available scenario files."""
        scenarios = []
        for file_path in self.mentorship_notes_dir.glob("05*-scenario-*.md"):
            scenarios.append(file_path.name)
        return sorted(scenarios)
    
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
                    if value == "Average":
                        data['subject_confidence'][section][key] = "Moderate"
        
        return data
    
    async def generate_scenario_json(self, scenario_file: str, output_dir: str = "generated_outputs") -> bool:
        """Generate JSON output for a specific scenario."""
        wizard_data = self.extract_wizard_data_from_markdown(scenario_file)
        if not wizard_data:
            return False
        
        try:
            wizard = StudentIntakeWizard(**wizard_data)
            user_id = f"user-{uuid.uuid4().hex[:8]}"
            
            # Convert wizard to persona (same logic as markdown script)
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
                # Keep original field names for engine mapping
                confidence_profile[field_name] = value.lower() if value != "Moderate" else "neutral"
            
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
            
            # Create persona from wizard data
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

            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)

            # For JSON, include block-level resources already present on the model
            payload = {
                "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "scenario": scenario_file,
                "study_plan": study_plan.model_dump(),
            }
            output_filename = scenario_file.replace('.md', '-helios-output.json')
            output_file = output_path / output_filename
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)

            print(f"✅ Generated: {output_file}")
            return True
        except Exception as e:
            print(f"❌ Error generating output for {scenario_file}: {e}")
            return False

    async def generate_all_scenarios(self, output_dir: str = "generated_outputs") -> None:
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
            if await self.generate_scenario_json(scenario, output_dir):
                success_count += 1
        print(f"\n✅ Completed! {success_count}/{len(scenarios)} scenarios processed successfully.")


async def main():
    parser = argparse.ArgumentParser(
        description="Generate JSON documents with helios engine output for test scenarios"
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
        help="Output directory for generated JSON files (default: generated_outputs)"
    )
    parser.add_argument(
        "--mentorship-notes-dir", 
        default="mentorship-notes",
        help="Directory containing scenario files (default: mentorship-notes)"
    )

    args = parser.parse_args()
    generator = ScenarioJSONGenerator(args.mentorship_notes_dir)

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
        success = await generator.generate_scenario_json(args.scenario, args.output_dir)
        if not success:
            sys.exit(1)
    elif args.all:
        await generator.generate_all_scenarios(args.output_dir)
    else:
        parser.print_help()
        print("\nUse --list to see available scenarios or --scenario to process a specific one.")


if __name__ == "__main__":
    asyncio.run(main())



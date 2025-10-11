#!/usr/bin/env python3
"""
Helios CLI - Interactive command-line interface for UPSC study plan generation.

This CLI reuses the Telegram bot's data collection logic to interact with the 
real Helios engine via HTTP and generate personalized study plans.
"""

import os
import sys
import json
import asyncio
import requests
from typing import Dict, Any, Optional
from datetime import datetime
import argparse

# Add telegram_bot to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'telegram_bot'))

from telegram_bot.constants import *
from telegram_bot.plan_presenter import PlanPresenter


class HeliosCLI:
    """Command-line interface for Helios study plan generation."""
    
    def __init__(self, helios_url: str = "http://localhost:8080"):
        self.helios_url = helios_url
        self.user_data = {}
        self.presenter = PlanPresenter()
        
    def print_banner(self):
        """Print CLI banner."""
        print("=" * 60)
        print("🎯 HELIOS STUDY PLAN GENERATOR - CLI")
        print("=" * 60)
        print("Interactive UPSC study plan generation")
        print(f"Helios Engine: {self.helios_url}")
        print("=" * 60)
        print()
    
    def get_input(self, prompt: str, options: list = None) -> str:
        """Get user input with optional validation."""
        if options:
            print(f"\n{prompt}")
            for i, option in enumerate(options, 1):
                if isinstance(option, list):
                    print(f"  {i}. {' / '.join(option)}")
                else:
                    print(f"  {i}. {option}")
            
            while True:
                try:
                    choice = int(input("\nEnter choice number: ")) - 1
                    if 0 <= choice < len(options):
                        selected = options[choice]
                        return selected[0] if isinstance(selected, list) else selected
                    else:
                        print("Invalid choice. Please try again.")
                except ValueError:
                    print("Please enter a valid number.")
        else:
            return input(f"\n{prompt}: ").strip()
    
    def collect_personal_details(self):
        """Collect personal and academic details."""
        print("\n📝 PERSONAL & ACADEMIC DETAILS")
        print("-" * 40)
        
        self.user_data['full_name'] = self.get_input("Full Name")
        self.user_data['email'] = self.get_input("Email Address")
        self.user_data['phone_number'] = self.get_input("Phone Number")
        self.user_data['present_location'] = self.get_input("Current Location (City, State)")
        
        status_options = ['Student', 'Working Professional', 'Unemployed', 'Other']
        self.user_data['current_status'] = self.get_input("Current Status", status_options)
        
        self.user_data['graduation_stream'] = self.get_input("Graduation Stream (e.g., Engineering, Arts)")
        self.user_data['college_university'] = self.get_input("College/University")
        
        while True:
            try:
                year = int(self.get_input("Year of Graduation"))
                self.user_data['year_of_passing'] = year
                break
            except ValueError:
                print("Please enter a valid year.")
    
    def collect_preparation_background(self):
        """Collect preparation background."""
        print("\n📚 PREPARATION BACKGROUND")
        print("-" * 40)
        
        duration_options = ['Just started', '6 months', '1 year', '1-2 years', '2+ years']
        self.user_data['prep_duration'] = self.get_input("How long have you been preparing?", duration_options)
        
        while True:
            try:
                year = int(self.get_input("Target UPSC year"))
                self.user_data['target_year'] = year
                break
            except ValueError:
                print("Please enter a valid year.")
        
        while True:
            try:
                attempts = int(self.get_input("Previous UPSC attempts (0 if first time)"))
                self.user_data['previous_attempts'] = attempts
                break
            except ValueError:
                print("Please enter a valid number.")
        
        if self.user_data['previous_attempts'] > 0:
            stage_options = ['Prelims', 'Mains', 'Interview']
            self.user_data['highest_stage_reached'] = self.get_input("Highest stage reached", stage_options)
            
            if 'Prelims' in self.user_data.get('highest_stage_reached', ''):
                while True:
                    try:
                        score = int(self.get_input("Best Prelims score"))
                        self.user_data['prelims_best_score'] = score
                        break
                    except ValueError:
                        print("Please enter a valid score.")
    
    def collect_confidence_levels(self):
        """Collect subject confidence levels."""
        print("\n🎯 SUBJECT CONFIDENCE ASSESSMENT")
        print("-" * 40)
        print("Rate your confidence: 1=Low, 2=Medium, 3=High")
        
        # Prelims subjects
        prelims_subjects = [
            ('History', 'confidence_history'),
            ('Geography', 'confidence_geography'),
            ('Polity', 'confidence_polity'),
            ('Economics', 'confidence_economics'),
            ('Science & Technology', 'confidence_science'),
            ('Environment', 'confidence_environment'),
            ('Current Affairs', 'confidence_current_affairs'),
            ('CSAT', 'confidence_csat')
        ]
        
        print("\n📖 PRELIMS SUBJECTS:")
        for subject, key in prelims_subjects:
            confidence_options = ['Low', 'Medium', 'High']
            self.user_data[key] = self.get_input(f"{subject} confidence", confidence_options)
        
        # Mains GS subjects
        gs1_subjects = [
            ('History', 'confidence_gs1_history'),
            ('Geography', 'confidence_gs1_geography'),
            ('Culture', 'confidence_gs1_culture'),
            ('Society', 'confidence_gs1_society'),
            ('Post Independence', 'confidence_gs1_post_independence'),
            ('World History', 'confidence_gs1_world_history'),
            ('Art & Culture', 'confidence_gs1_art_culture')
        ]
        
        print("\n📚 MAINS GS1 SUBJECTS:")
        for subject, key in gs1_subjects:
            confidence_options = ['Low', 'Medium', 'High']
            self.user_data[key] = self.get_input(f"GS1 {subject} confidence", confidence_options)
        
        # Optional subject
        self.user_data['optional_subject'] = self.get_input("Optional Subject")
        confidence_options = ['Low', 'Medium', 'High']
        self.user_data['confidence_optional_subject'] = self.get_input("Optional Subject confidence", confidence_options)
    
    def collect_study_strategy(self):
        """Collect study strategy preferences."""
        print("\n🎯 STUDY STRATEGY")
        print("-" * 40)
        
        focus_options = ['Prelims Focus', 'Mains Focus', 'Balanced Approach']
        self.user_data['strategy_focus'] = self.get_input("Study Focus", focus_options)
        
        hours_options = ['4-6 hours', '6-8 hours', '8-10 hours', '10+ hours']
        self.user_data['strategy_hours'] = self.get_input("Daily Study Hours", hours_options)
        
        distribution_options = ['Equal Distribution', 'Weak Subjects Focus', 'Strong Subjects First']
        self.user_data['strategy_distribution'] = self.get_input("Time Distribution", distribution_options)
        
        approach_options = ['Conceptual Learning', 'Practice Heavy', 'Balanced']
        self.user_data['strategy_approach'] = self.get_input("Study Approach", approach_options)
        
        revision_options = ['Daily Revision', 'Weekly Revision', 'Monthly Revision']
        self.user_data['strategy_revision'] = self.get_input("Revision Strategy", revision_options)
        
        testing_options = ['Daily Tests', 'Weekly Tests', 'Monthly Tests']
        self.user_data['strategy_testing'] = self.get_input("Testing Frequency", testing_options)
        
        resource_options = ['Standard Books', 'Online Resources', 'Coaching Material', 'Mixed Approach']
        self.user_data['strategy_resources'] = self.get_input("Preferred Resources", resource_options)
        
        motivation_options = ['Self Motivation', 'Peer Support', 'Mentor Guidance']
        self.user_data['strategy_motivation'] = self.get_input("Motivation Style", motivation_options)
    
    def format_data_for_helios(self) -> Dict[str, Any]:
        """Format collected data for Helios API matching exact Haskell data structure."""
        return {
            "personal_and_academic_details": {
                "full_name": self.user_data.get('full_name', ''),
                "email": self.user_data.get('email', ''),
                "phone_number": self.user_data.get('phone_number', ''),
                "present_location": self.user_data.get('present_location', ''),
                "current_status": self.user_data.get('current_status', ''),
                "graduation_stream": self.user_data.get('graduation_stream', ''),
                "college_university": self.user_data.get('college_university', ''),
                "year_of_passing": self.user_data.get('year_of_passing', 2024)
            },
            "preparation_background": {
                "preparing_since": self.user_data.get('prep_duration', '6 months'),
                "target_year": str(self.user_data.get('target_year', 2025)),
                "number_of_attempts": str(self.user_data.get('previous_attempts', 0)),
                "highest_stage_per_attempt": self.user_data.get('highest_stage_reached', 'None'),
                "last_attempt_gs_prelims_score": self.user_data.get('prelims_best_score', 0),
                "last_attempt_csat_score": 0,
                "wrote_mains_in_last_attempt": "No" if self.user_data.get('previous_attempts', 0) == 0 else "Yes",
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
                "optional_subject": self.user_data.get('optional_subject', 'Public Administration'),
                "optional_status": "Beginner",
                "optional_taken_from": "Self Study"
            },
            "test_series_and_csat": {
                "test_series_attempted": ["None"],
                "csat_self_assessment": "Good",
                "csat_weak_areas": ["Mathematics"]
            },
            "syllabus_and_pyq_awareness": {
                "gs_syllabus_understanding": "Good",
                "optional_syllabus_understanding": "Moderate",
                "pyq_awareness_and_use": "Regular"
            },
            "subject_confidence": {
                "prelims_confidence": {
                    "prelims_current_events": self.user_data.get('confidence_current_affairs', 'Medium'),
                    "prelims_history_of_india": self.user_data.get('confidence_history', 'Medium'),
                    "prelims_indian_world_geography": self.user_data.get('confidence_geography', 'Medium'),
                    "prelims_polity_governance": self.user_data.get('confidence_polity', 'Medium'),
                    "prelims_economy_social_development": self.user_data.get('confidence_economics', 'Medium'),
                    "prelims_environment_ecology": self.user_data.get('confidence_environment', 'Medium'),
                    "prelims_science_technology": self.user_data.get('confidence_science', 'Medium'),
                    "prelims_csat": self.user_data.get('confidence_csat', 'Medium')
                },
                "mains_gs1_confidence": {
                    "gs1_essay": "Medium",
                    "gs1_indian_culture": self.user_data.get('confidence_gs1_culture', 'Medium'),
                    "gs1_modern_history": self.user_data.get('confidence_gs1_history', 'Medium'),
                    "gs1_world_history": self.user_data.get('confidence_gs1_world_history', 'Medium'),
                    "gs1_post_independence_india": self.user_data.get('confidence_gs1_post_independence', 'Medium'),
                    "gs1_indian_society": self.user_data.get('confidence_gs1_society', 'Medium'),
                    "gs1_indian_world_geography": self.user_data.get('confidence_gs1_geography', 'Medium')
                },
                "mains_gs2_confidence": {
                    "gs2_constitution": "Medium",
                    "gs2_polity": "Medium",
                    "gs2_governance": "Medium",
                    "gs2_social_justice": "Medium",
                    "gs2_international_relations": "Medium"
                },
                "mains_gs3_confidence": {
                    "gs3_economy": "Medium",
                    "gs3_agriculture": "Medium",
                    "gs3_environment": "Medium",
                    "gs3_science_technology": "Medium",
                    "gs3_disaster_management": "Medium",
                    "gs3_internal_security": "Medium"
                },
                "mains_gs4_optional_confidence": {
                    "gs4_ethics_integrity_aptitude": "Medium",
                    "gs4_optional_subject_paper1": self.user_data.get('confidence_optional_subject', 'Medium'),
                    "gs4_optional_subject_paper2": self.user_data.get('confidence_optional_subject', 'Medium')
                }
            },
            "study_strategy": {
                "study_focus_combo": self.user_data.get('strategy_focus', 'Balanced Approach'),
                "weekly_study_hours": self.user_data.get('strategy_hours', '40-50 hours'),
                "time_distribution": self.user_data.get('strategy_distribution', 'Equal Distribution'),
                "study_approach": self.user_data.get('strategy_approach', 'Conceptual Learning'),
                "revision_strategy": self.user_data.get('strategy_revision', 'Weekly Revision'),
                "test_frequency": self.user_data.get('strategy_testing', 'Weekly Tests'),
                "seasonal_windows": ["Summer Intensive", "Winter Revision"],
                "catch_up_day_preference": "Sunday"
            }
        }
    
    def call_helios_api(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Call Helios API to generate study plan."""
        try:
            print(f"\n🔄 Calling Helios API at {self.helios_url}/plan/generate...")
            
            response = requests.post(
                f"{self.helios_url}/plan/generate",
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                print("✅ Plan generated successfully!")
                return response.json()
            else:
                print(f"❌ API Error: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection Error: Could not connect to Helios engine at {self.helios_url}")
            print("Make sure the Helios engine is running on the specified port.")
            return None
        except requests.exceptions.Timeout:
            print("❌ Timeout Error: Helios API took too long to respond")
            return None
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
            return None
    
    def display_plan_summary(self, plan: Dict[str, Any]):
        """Display plan summary in CLI."""
        print("\n" + "=" * 60)
        print("📋 YOUR PERSONALIZED STUDY PLAN")
        print("=" * 60)
        
        blocks = plan.get('blocks', [])
        total_weeks = plan.get('total_weeks', 0)
        
        print(f"📅 Total Duration: {total_weeks} weeks")
        print(f"🎯 Study Blocks: {len(blocks)}")
        
        for i, block in enumerate(blocks, 1):
            print(f"\n📚 Block {i}: {block.get('block_name', 'Study Block')}")
            print(f"   Duration: {block.get('duration_weeks', 1)} weeks")
            print(f"   Start: {block.get('start_date', 'TBD')}")
            print(f"   End: {block.get('end_date', 'TBD')}")
            
            subjects = block.get('subjects', [])
            if subjects:
                print(f"   Subjects: {', '.join(subjects[:3])}{'...' if len(subjects) > 3 else ''}")
        
        print(f"\n🎯 Success Probability: {plan.get('success_probability', 0.75) * 100:.0f}%")
    
    def save_plan_to_file(self, plan: Dict[str, Any], format: str = "pdf") -> str:
        """Save plan to PDF or HTML file."""
        try:
            user_name = self.user_data.get('full_name', 'Student')
            user_id = hash(user_name) % 10000  # Simple user ID for demo
            
            presenter = PlanPresenter()
            
            if format.lower() == "pdf":
                file_path = presenter.create_plan_pdf(plan, user_id, user_name)
            else:
                file_path = presenter.create_plan_webpage(plan, user_id, user_name)
            
            return file_path
        except Exception as e:
            print(f"❌ Error saving plan: {e}")
            return None
    
    def generate_pdf_plan(self, plan: Dict[str, Any], user_name: str = None) -> str:
        """Generate PDF plan file."""
        if user_name:
            self.user_data['full_name'] = user_name
        return self.save_plan_to_file(plan, format="pdf")
    
    def generate_html_plan(self, plan: Dict[str, Any], user_name: str = None) -> str:
        """Generate HTML plan file (for backward compatibility)."""
        if user_name:
            self.user_data['full_name'] = user_name
        return self.save_plan_to_file(plan, format="html")
    
    def save_data_to_json(self, filename: str = None):
        """Save collected data to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"helios_data_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.user_data, f, indent=2)
            print(f"💾 Data saved to: {filename}")
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def load_data_from_json(self, filename: str):
        """Load data from JSON file."""
        try:
            with open(filename, 'r') as f:
                self.user_data = json.load(f)
            print(f"📂 Data loaded from: {filename}")
            return True
        except Exception as e:
            print(f"Error loading data: {e}")
            return False
    
    def interactive_mode(self):
        """Run interactive data collection and plan generation."""
        self.print_banner()
        
        print("🚀 Starting interactive data collection...")
        print("You can type 'quit' at any time to exit.")
        
        try:
            # Collect all data
            self.collect_personal_details()
            self.collect_preparation_background()
            self.collect_confidence_levels()
            self.collect_study_strategy()
            
            # Save collected data
            save_data = self.get_input("\nSave collected data to file? (y/n)").lower()
            if save_data.startswith('y'):
                self.save_data_to_json()
            
            # Generate plan
            print("\n🎯 Generating your personalized study plan...")
            helios_data = self.format_data_for_helios()
            
            plan = self.call_helios_api(helios_data)
            
            if plan:
                self.display_plan_summary(plan)
                
                # Save PDF plan
                save_pdf = self.get_input("\nSave detailed plan to PDF file? (y/n)").lower()
                if save_pdf.startswith('y'):
                    pdf_file = self.save_plan_to_file(plan, format="pdf")
                    if pdf_file:
                        print(f"📄 Detailed plan saved to: {pdf_file}")
            else:
                print("\n❌ Failed to generate study plan. Please check Helios engine status.")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye! Your session has been terminated.")
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Helios CLI - UPSC Study Plan Generator")
    parser.add_argument('--helios-url', default='http://localhost:8080',
                       help='Helios engine URL (default: http://localhost:8080)')
    parser.add_argument('--load-data', help='Load data from JSON file')
    parser.add_argument('--save-data', help='Save data to JSON file')
    parser.add_argument('--non-interactive', action='store_true',
                       help='Skip interactive mode (requires --load-data)')
    
    args = parser.parse_args()
    
    cli = HeliosCLI(args.helios_url)
    
    if args.load_data:
        if not cli.load_data_from_json(args.load_data):
            return 1
    
    if not args.non_interactive:
        cli.interactive_mode()
    elif args.load_data:
        # Non-interactive mode with loaded data
        print("🎯 Generating study plan from loaded data...")
        helios_data = cli.format_data_for_helios()
        plan = cli.call_helios_api(helios_data)
        
        if plan:
            cli.display_plan_summary(plan)
            pdf_file = cli.save_plan_to_file(plan, format="pdf")
            if pdf_file:
                print(f"📄 Plan saved to: {pdf_file}")
        else:
            print("❌ Failed to generate study plan.")
            return 1
    else:
        print("❌ Non-interactive mode requires --load-data")
        return 1
    
    if args.save_data:
        cli.save_data_to_json(args.save_data)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

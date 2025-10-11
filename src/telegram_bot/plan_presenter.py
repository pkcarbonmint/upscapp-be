"""
Plan presentation and HTML generation for Telegram bot.
"""

import os
import json
import uuid
import re
from typing import Dict, Any, Optional
from datetime import datetime
from weasyprint import HTML, CSS

class PlanPresenter:
    def __init__(self):
        self.output_dir = os.path.join(os.path.dirname(__file__), 'generated_plans')
        os.makedirs(self.output_dir, exist_ok=True)

    def create_plan_webpage(self, plan: Dict[str, Any], user_id: int, user_name: str = "Student") -> str:
        """Create a comprehensive HTML webpage for the study plan."""
        try:
            # Sanitize user name for filename
            sanitized_name = self._sanitize_filename(user_name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"plan_{sanitized_name}_{timestamp}.html"
            filepath = os.path.join(self.output_dir, filename)
            
            # Debug: Check plan structure
            print(f"🔍 Plan keys: {list(plan.keys())}")
            blocks = plan.get('blocks', [])
            print(f"🔍 Number of blocks: {len(blocks)}")
            if blocks:
                print(f"🔍 First block type: {type(blocks[0])}")
                print(f"🔍 First block keys: {list(blocks[0].keys()) if isinstance(blocks[0], dict) else 'Not a dict'}")
            
            # Generate HTML content
            html_content = self._generate_html(plan, user_name, sanitized_name)
            
            # Write to file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Return file path (in production, this would be a web URL)
            return f"file://{filepath}"
            
        except Exception as e:
            print(f"Error creating plan webpage: {e}")
            import traceback
            traceback.print_exc()
            return "Error generating plan webpage"

    def create_plan_pdf(self, plan: Dict[str, Any], user_id: int, user_name: str = "Student") -> str:
        """Create a PDF file for the study plan."""
        try:
            # Sanitize user name for filename
            sanitized_name = self._sanitize_filename(user_name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"plan_{sanitized_name}_{timestamp}.pdf"
            filepath = os.path.join(self.output_dir, filename)
            
            # Generate HTML content optimized for PDF
            html_content = self._generate_html_for_pdf(plan, user_name, sanitized_name)
            
            # Convert HTML to PDF using WeasyPrint
            html_doc = HTML(string=html_content)
            
            # Add PDF-specific CSS for better formatting
            pdf_css = CSS(string="""
                @page {
                    size: A4;
                    margin: 1in;
                    @bottom-center {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 10px;
                        color: #666;
                    }
                }
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.4;
                    color: #333;
                }
                .page-break {
                    page-break-before: always;
                }
                .no-break {
                    page-break-inside: avoid;
                }
                h1, h2, h3 {
                    page-break-after: avoid;
                }
                table {
                    page-break-inside: avoid;
                }
            """)
            
            html_doc.write_pdf(filepath, stylesheets=[pdf_css])
            
            return filepath
            
        except Exception as e:
            print(f"Error creating plan PDF: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _generate_html_for_pdf(self, plan: Dict[str, Any], user_name: str, plan_id: str) -> str:
        """Generate HTML content optimized for PDF generation."""
        # Reuse existing HTML generation but with PDF-specific modifications
        html_content = self._generate_html(plan, user_name, plan_id)
        
        # Add PDF-specific modifications
        pdf_optimized = html_content.replace(
            '<div class="timeline-item">',
            '<div class="timeline-item no-break">'
        ).replace(
            '<div class="block-card">',
            '<div class="block-card no-break">'
        )
        
        return pdf_optimized

    def _generate_html(self, plan: Dict[str, Any], user_name: str, plan_id: str) -> str:
        """Generate comprehensive HTML for the study plan."""
        
        # Extract plan data
        blocks = plan.get('blocks', [])
        total_weeks = sum(block.get('duration_weeks', 0) for block in blocks)
        
        # Generate blocks HTML
        blocks_html = ""
        for i, block in enumerate(blocks, 1):
            blocks_html += self._generate_block_html(block, i)
        
        # Generate timeline
        timeline_html = self._generate_timeline_html(blocks)
        
        # Generate subject analysis
        subject_analysis_html = self._generate_subject_analysis_html(plan)
        
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UPSC Study Plan - {user_name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .header h1 {{
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header .subtitle {{
            color: #7f8c8d;
            font-size: 1.2em;
            margin-bottom: 20px;
        }}
        
        .plan-overview {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .overview-card {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }}
        
        .overview-card .number {{
            font-size: 2.5em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 10px;
        }}
        
        .overview-card .label {{
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .section {{
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        
        .section h2 {{
            color: #2c3e50;
            font-size: 1.8em;
            margin-bottom: 20px;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        
        .block {{
            border: 2px solid #ecf0f1;
            border-radius: 10px;
            margin-bottom: 25px;
            overflow: hidden;
        }}
        
        .block-header {{
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 20px;
            font-weight: bold;
            font-size: 1.2em;
        }}
        
        .block-content {{
            padding: 20px;
        }}
        
        .week-schedule {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .day-card {{
            border: 1px solid #ecf0f1;
            border-radius: 8px;
            padding: 15px;
            background: #f8f9fa;
        }}
        
        .day-header {{
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.1em;
        }}
        
        .task {{
            background: white;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 8px;
            border-left: 4px solid #3498db;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }}
        
        .task-title {{
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }}
        
        .task-details {{
            font-size: 0.9em;
            color: #7f8c8d;
        }}
        
        .timeline {{
            position: relative;
            padding-left: 30px;
        }}
        
        .timeline::before {{
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #3498db;
        }}
        
        .timeline-item {{
            position: relative;
            margin-bottom: 30px;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }}
        
        .timeline-item::before {{
            content: '';
            position: absolute;
            left: -37px;
            top: 25px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #3498db;
            border: 3px solid white;
            box-shadow: 0 0 0 3px #3498db;
        }}
        
        .subjects-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }}
        
        .subject-card {{
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            border-left: 5px solid #3498db;
        }}
        
        .subject-name {{
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        
        .subject-hours {{
            color: #7f8c8d;
            font-size: 0.9em;
        }}
        
        .footer {{
            text-align: center;
            color: white;
            margin-top: 40px;
            padding: 20px;
        }}
        
        @media (max-width: 768px) {{
            .container {{
                padding: 10px;
            }}
            
            .header h1 {{
                font-size: 2em;
            }}
            
            .plan-overview {{
                grid-template-columns: repeat(2, 1fr);
            }}
            
            .week-schedule {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 UPSC Study Plan</h1>
            <div class="subtitle">Personalized for {user_name}</div>
            <div style="color: #95a5a6; font-size: 0.9em;">
                Generated on {datetime.now().strftime('%B %d, %Y')} | Plan ID: {plan_id}
            </div>
        </div>
        
        <div class="plan-overview">
            <div class="overview-card">
                <div class="number">{total_weeks}</div>
                <div class="label">Total Weeks</div>
            </div>
            <div class="overview-card">
                <div class="number">{len(blocks)}</div>
                <div class="label">Study Blocks</div>
            </div>
            <div class="overview-card">
                <div class="number">{self._count_total_tasks(blocks)}</div>
                <div class="label">Total Tasks</div>
            </div>
            <div class="overview-card">
                <div class="number">{self._count_subjects(blocks)}</div>
                <div class="label">Subjects</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📅 Study Timeline</h2>
            <div class="timeline">
                {timeline_html}
            </div>
        </div>
        
        <div class="section">
            <h2>📚 Detailed Study Blocks</h2>
            {blocks_html}
        </div>
        
        <div class="section">
            <h2>📊 Subject Analysis</h2>
            {subject_analysis_html}
        </div>
        
        <div class="footer">
            <p>🤖 Generated by Helios AI Study Planner</p>
            <p>Good luck with your UPSC preparation! 🚀</p>
        </div>
    </div>
</body>
</html>
        """
        
        return html_template

    def _generate_block_html(self, block: Dict[str, Any], block_num: int) -> str:
        """Generate HTML for a single study block."""
        duration = block.get('duration_weeks', 1)
        subjects = block.get('subjects', [])
        weekly_plan = block.get('weekly_plan', {})
        
        # Handle subjects as list of strings or list of objects
        if subjects and isinstance(subjects[0], str):
            subjects_text = ", ".join(subjects)
        elif subjects and isinstance(subjects[0], dict):
            subjects_text = ", ".join([s.get('name', str(s)) for s in subjects])
        else:
            subjects_text = "Mixed Subjects"
        
        # Generate weekly schedule
        week_html = ""
        
        # Handle weekly_plan as list or dict
        if isinstance(weekly_plan, list) and weekly_plan:
            # Take the first week's plan
            first_week = weekly_plan[0]
            daily_plans = first_week.get('daily_plans', [])
        elif isinstance(weekly_plan, dict):
            daily_plans = weekly_plan.get('daily_plans', [])
        else:
            daily_plans = []
        
        if daily_plans:
            week_html = '<div class="week-schedule">'
            for daily_plan in daily_plans:
                day = daily_plan.get('day', 1)
                day_name = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day-1]
                tasks = daily_plan.get('tasks', [])
                
                tasks_html = ""
                for task in tasks:
                    duration_min = task.get('duration_minutes', 60)
                    task_title = task.get('title2', task.get('title', 'Study Task'))
                    tasks_html += f"""
                    <div class="task">
                        <div class="task-title">{task_title}</div>
                        <div class="task-details">
                            Duration: {duration_min} minutes
                            {f"<br>Topics: {', '.join(task.get('topics', []))}" if task.get('topics') else ""}
                        </div>
                    </div>
                    """
                
                week_html += f"""
                <div class="day-card">
                    <div class="day-header">📅 {day_name}</div>
                    {tasks_html}
                </div>
                """
            week_html += '</div>'
        
        return f"""
        <div class="block">
            <div class="block-header">
                📖 Block {block_num}: {subjects_text} ({duration} week{'s' if duration > 1 else ''})
            </div>
            <div class="block-content">
                <p><strong>Focus Areas:</strong> {subjects_text}</p>
                <p><strong>Duration:</strong> {duration} week{'s' if duration > 1 else ''}</p>
                {week_html}
            </div>
        </div>
        """

    def _generate_timeline_html(self, blocks: list) -> str:
        """Generate timeline HTML for all blocks."""
        timeline_html = ""
        current_week = 1
        
        for i, block in enumerate(blocks, 1):
            duration = block.get('duration_weeks', 1)
            subjects = block.get('subjects', [])
            # Handle subjects as list of strings or list of objects
            if subjects and isinstance(subjects[0], str):
                subjects_text = ", ".join(subjects)
            elif subjects and isinstance(subjects[0], dict):
                subjects_text = ", ".join([s.get('name', str(s)) for s in subjects])
            else:
                subjects_text = "Mixed Subjects"
            
            end_week = current_week + duration - 1
            week_range = f"Week {current_week}" if duration == 1 else f"Weeks {current_week}-{end_week}"
            
            timeline_html += f"""
            <div class="timeline-item">
                <h3>Block {i}: {subjects_text}</h3>
                <p><strong>{week_range}</strong> • {duration} week{'s' if duration > 1 else ''}</p>
                <p>Focus on {subjects_text.lower()} with structured daily tasks and regular assessments.</p>
            </div>
            """
            
            current_week += duration
        
        return timeline_html

    def _generate_subject_analysis_html(self, plan: Dict[str, Any]) -> str:
        """Generate subject analysis HTML."""
        # Count subject occurrences
        subject_count = {}
        blocks = plan.get('blocks', [])
        
        for block in blocks:
            subjects = block.get('subjects', [])
            duration = block.get('duration_weeks', 1)
            
            # Handle subjects as list of strings or list of objects
            subject_names = []
            if subjects:
                for subject in subjects:
                    if isinstance(subject, str):
                        subject_names.append(subject)
                    elif isinstance(subject, dict):
                        subject_names.append(subject.get('name', str(subject)))
                    else:
                        subject_names.append(str(subject))
            
            for subject in subject_names:
                if subject not in subject_count:
                    subject_count[subject] = 0
                subject_count[subject] += duration
        
        if not subject_count:
            return "<p>No subject analysis available.</p>"
        
        subjects_html = ""
        for subject, weeks in sorted(subject_count.items(), key=lambda x: x[1], reverse=True):
            subjects_html += f"""
            <div class="subject-card">
                <div class="subject-name">📚 {subject}</div>
                <div class="subject-hours">{weeks} week{'s' if weeks > 1 else ''} allocated</div>
            </div>
            """
        
        return f'<div class="subjects-grid">{subjects_html}</div>'

    def _count_total_tasks(self, blocks: list) -> int:
        """Count total tasks across all blocks."""
        total = 0
        for block in blocks:
            weekly_plan = block.get('weekly_plan', {})
            duration = block.get('duration_weeks', 1)
            
            # Handle weekly_plan as list or dict
            if isinstance(weekly_plan, list) and weekly_plan:
                # Take the first week's plan
                first_week = weekly_plan[0]
                daily_plans = first_week.get('daily_plans', [])
            elif isinstance(weekly_plan, dict):
                daily_plans = weekly_plan.get('daily_plans', [])
            else:
                daily_plans = []
            
            for daily_plan in daily_plans:
                tasks = daily_plan.get('tasks', [])
                total += len(tasks) * duration
        
        return total

    def _count_subjects(self, blocks: list) -> int:
        """Count unique subjects across all blocks."""
        subjects = set()
        for block in blocks:
            block_subjects = block.get('subjects', [])
            # Handle subjects as list of strings or list of objects
            for subject in block_subjects:
                if isinstance(subject, str):
                    subjects.add(subject)
                elif isinstance(subject, dict):
                    subjects.add(subject.get('name', str(subject)))
                else:
                    subjects.add(str(subject))
        return len(subjects)
    
    def _sanitize_filename(self, name: str) -> str:
        """Sanitize user name for use in filename."""
        # Remove or replace invalid characters for filenames
        # Keep only alphanumeric characters, hyphens, and underscores
        sanitized = re.sub(r'[^\w\-_]', '_', name.strip())
        # Remove multiple consecutive underscores
        sanitized = re.sub(r'_+', '_', sanitized)
        # Remove leading/trailing underscores
        sanitized = sanitized.strip('_')
        # Ensure it's not empty and not too long
        if not sanitized:
            sanitized = "student"
        elif len(sanitized) > 50:
            sanitized = sanitized[:50]
        return sanitized.lower()

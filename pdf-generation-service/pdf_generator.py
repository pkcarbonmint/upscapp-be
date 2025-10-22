"""
Elegant PDF generation service using ReportLab.
This module creates high-fidelity, minimalistic, and pleasant PDF documents
that mirror the functionality of the CalendarDoxService.
"""

import io
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dateutil.parser import parse as parse_date
from dateutil.relativedelta import relativedelta

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Frame, PageTemplate, BaseDocTemplate, NextPageTemplate
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from models import StudyPlan, StudentIntake, CycleType


# Color scheme for elegant, minimalistic design
class ColorScheme:
    # Primary colors
    PRIMARY = colors.Color(0.18, 0.36, 0.73)  # Deep blue
    SECONDARY = colors.Color(0.4, 0.4, 0.4)   # Medium gray
    ACCENT = colors.Color(0.85, 0.65, 0.13)   # Golden accent
    
    # Text colors
    DARK_TEXT = colors.Color(0.2, 0.2, 0.2)   # Almost black
    LIGHT_TEXT = colors.Color(0.5, 0.5, 0.5)  # Light gray
    WHITE = colors.white
    
    # Background colors
    LIGHT_BG = colors.Color(0.98, 0.98, 0.98)  # Very light gray
    CARD_BG = colors.Color(0.95, 0.95, 0.95)   # Light gray
    
    # Cycle type colors (matching the original service)
    CYCLE_COLORS = {
        CycleType.C1: colors.Color(0.89, 0.95, 0.99),  # Very light blue
        CycleType.C2: colors.Color(0.91, 0.96, 0.91),  # Very light green
        CycleType.C3: colors.Color(0.99, 0.89, 0.93),  # Very light pink
        CycleType.C4: colors.Color(1.0, 0.92, 0.93),   # Very light red
        CycleType.C5: colors.Color(0.95, 0.90, 0.96),  # Very light purple
        CycleType.C5B: colors.Color(0.95, 0.90, 0.96), # Very light purple
        CycleType.C6: colors.Color(0.88, 0.96, 1.0),   # Very light cyan
        CycleType.C7: colors.Color(1.0, 0.95, 0.88),   # Very light orange
        CycleType.C8: colors.Color(0.95, 0.97, 0.91),  # Very light lime
    }
    
    CYCLE_BORDERS = {
        CycleType.C1: colors.Color(0.23, 0.51, 0.96),  # Blue
        CycleType.C2: colors.Color(0.13, 0.77, 0.37),  # Green
        CycleType.C3: colors.Color(0.93, 0.28, 0.60),  # Pink
        CycleType.C4: colors.Color(0.94, 0.27, 0.27),  # Red
        CycleType.C5: colors.Color(0.66, 0.33, 0.97),  # Purple
        CycleType.C5B: colors.Color(0.66, 0.33, 0.97), # Purple
        CycleType.C6: colors.Color(0.02, 0.71, 0.83),  # Cyan
        CycleType.C7: colors.Color(0.96, 0.62, 0.04),  # Orange
        CycleType.C8: colors.Color(0.52, 0.80, 0.09),  # Lime
    }


class ElegantPageTemplate(PageTemplate):
    """Custom page template with elegant headers and footers."""
    
    def __init__(self, id, frames, student_name="", plan_title="", **kwargs):
        super().__init__(id, frames, **kwargs)
        self.student_name = student_name
        self.plan_title = plan_title
    
    def beforeDrawPage(self, canvas, doc):
        """Draw header and footer on each page."""
        canvas.saveState()
        
        # Header
        if hasattr(doc, 'page_count') and doc.page_count > 1:  # Skip header on cover page
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(ColorScheme.SECONDARY)
            canvas.drawString(50, A4[1] - 30, f"Student: {self.student_name}")
            canvas.drawRightString(A4[0] - 50, A4[1] - 30, f"Target Year: {getattr(doc, 'target_year', '')}")
            
            # Header line
            canvas.setStrokeColor(ColorScheme.LIGHT_TEXT)
            canvas.setLineWidth(0.5)
            canvas.line(50, A4[1] - 40, A4[0] - 50, A4[1] - 40)
        
        # Footer
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(ColorScheme.LIGHT_TEXT)
        footer_text = f"La Mentora Study Planner - Generated on {datetime.now().strftime('%B %d, %Y')}"
        text_width = canvas.stringWidth(footer_text, "Helvetica", 8)
        canvas.drawString((A4[0] - text_width) / 2, 30, footer_text)
        page_text = f"Page {canvas.getPageNumber()}"
        page_width = canvas.stringWidth(page_text, "Helvetica", 8)
        canvas.drawString((A4[0] - page_width) / 2, 20, page_text)
        
        canvas.restoreState()


class PDFGenerator:
    """Main PDF generator class with elegant styling."""
    
    def __init__(self):
        self.styles = self._create_styles()
        self.color_scheme = ColorScheme()
    
    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        """Create custom paragraph styles for elegant typography."""
        base_styles = getSampleStyleSheet()
        
        styles = {
            'Title': ParagraphStyle(
                'CustomTitle',
                parent=base_styles['Title'],
                fontSize=28,
                textColor=ColorScheme.PRIMARY,
                spaceAfter=20,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            ),
            'Subtitle': ParagraphStyle(
                'CustomSubtitle',
                parent=base_styles['Normal'],
                fontSize=16,
                textColor=ColorScheme.SECONDARY,
                spaceAfter=15,
                alignment=TA_CENTER,
                fontName='Helvetica'
            ),
            'Heading1': ParagraphStyle(
                'CustomHeading1',
                parent=base_styles['Heading1'],
                fontSize=20,
                textColor=ColorScheme.PRIMARY,
                spaceBefore=25,
                spaceAfter=15,
                fontName='Helvetica-Bold'
            ),
            'Heading2': ParagraphStyle(
                'CustomHeading2',
                parent=base_styles['Heading2'],
                fontSize=16,
                textColor=ColorScheme.PRIMARY,
                spaceBefore=20,
                spaceAfter=12,
                fontName='Helvetica-Bold'
            ),
            'Body': ParagraphStyle(
                'CustomBody',
                parent=base_styles['Normal'],
                fontSize=11,
                textColor=ColorScheme.DARK_TEXT,
                spaceAfter=8,
                fontName='Helvetica'
            ),
            'Caption': ParagraphStyle(
                'CustomCaption',
                parent=base_styles['Normal'],
                fontSize=9,
                textColor=ColorScheme.LIGHT_TEXT,
                spaceAfter=5,
                fontName='Helvetica'
            ),
            'CoverTitle': ParagraphStyle(
                'CoverTitle',
                parent=base_styles['Title'],
                fontSize=36,
                textColor=ColorScheme.WHITE,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=10
            ),
            'CoverSubtitle': ParagraphStyle(
                'CoverSubtitle',
                parent=base_styles['Normal'],
                fontSize=18,
                textColor=ColorScheme.WHITE,
                alignment=TA_CENTER,
                fontName='Helvetica',
                spaceAfter=30
            ),
            'StudentName': ParagraphStyle(
                'StudentName',
                parent=base_styles['Normal'],
                fontSize=24,
                textColor=ColorScheme.WHITE,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=20
            )
        }
        
        return styles
    
    def generate_pdf(self, study_plan: StudyPlan, student_intake: StudentIntake, 
                    output_path: str = None) -> bytes:
        """Generate the complete PDF document."""
        
        # Create buffer for PDF
        buffer = io.BytesIO()
        
        # Create document
        doc = BaseDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=60,
            bottomMargin=60
        )
        
        # Set document attributes
        doc.target_year = study_plan.targeted_year
        doc.page_count = 0
        
        # Create page templates
        frame = Frame(
            50, 60, A4[0] - 100, A4[1] - 120,
            leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0
        )
        
        # Cover page template (no header)
        cover_template = PageTemplate(
            id='cover',
            frames=[frame]
        )
        
        # Normal page template (with header)
        normal_template = ElegantPageTemplate(
            id='normal',
            frames=[frame],
            student_name=student_intake.personal_details.full_name,
            plan_title=study_plan.plan_title
        )
        
        doc.addPageTemplates([cover_template, normal_template])
        
        # Build document content
        story = []
        
        # Cover page
        story.extend(self._create_cover_page(study_plan, student_intake))
        story.append(NextPageTemplate('normal'))
        story.append(PageBreak())
        
        # Birds eye view
        story.extend(self._create_birds_eye_view(study_plan))
        story.append(PageBreak())
        
        # Monthly views
        story.extend(self._create_monthly_views(study_plan))
        story.append(PageBreak())
        
        # Resources table
        story.extend(self._create_resources_table(study_plan))
        story.append(PageBreak())
        
        # Legend
        story.extend(self._create_legend(study_plan))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        # Save to file if path provided
        if output_path:
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
        
        return pdf_bytes
    
    def _create_cover_page(self, study_plan: StudyPlan, student_intake: StudentIntake) -> List:
        """Create an elegant cover page with gradient-like background effect."""
        story = []
        
        # Cover background (simulated with colored table)
        cover_data = [['']]
        cover_table = Table(cover_data, colWidths=[A4[0] - 100], rowHeights=[A4[1] - 120])
        cover_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), ColorScheme.PRIMARY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # Create cover content table
        pd = student_intake.personal_details
        ss = student_intake.study_strategy
        pb = student_intake.preparation_background
        
        cover_content = [
            [Paragraph("UPSC STUDY PLANNER", self.styles['CoverTitle'])],
            [Paragraph(str(study_plan.targeted_year), self.styles['CoverTitle'])],
            [Spacer(1, 20)],
            [Paragraph(pd.full_name.upper(), self.styles['StudentName'])],
            [Paragraph("Personalized Study Plan & Calendar", self.styles['CoverSubtitle'])],
            [Spacer(1, 30)],
        ]
        
        # Student info cards
        info_cards = [
            [
                Paragraph(f"<b>Email:</b> {pd.email or 'N/A'}", 
                         ParagraphStyle('InfoStyle', fontSize=10, textColor=ColorScheme.WHITE)),
                Paragraph(f"<b>Phone:</b> {pd.phone_number or 'N/A'}", 
                         ParagraphStyle('InfoStyle', fontSize=10, textColor=ColorScheme.WHITE))
            ],
            [
                Paragraph(f"<b>Location:</b> {pd.present_location or 'N/A'}", 
                         ParagraphStyle('InfoStyle', fontSize=10, textColor=ColorScheme.WHITE)),
                Paragraph(f"<b>Target Year:</b> {student_intake.target_year}", 
                         ParagraphStyle('InfoStyle', fontSize=10, textColor=ColorScheme.WHITE))
            ]
        ]
        
        info_table = Table(info_cards, colWidths=[200, 200])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        cover_content.append([info_table])
        cover_content.append([Spacer(1, 30)])
        
        # Study strategy highlights
        strategy_cards = [
            [
                Paragraph(f"📚<br/><b>Weekly Hours</b><br/>{ss.weekly_study_hours or 'N/A'}", 
                         ParagraphStyle('StrategyStyle', fontSize=12, textColor=ColorScheme.WHITE, alignment=TA_CENTER)),
                Paragraph(f"🎯<br/><b>Study Approach</b><br/>{ss.study_approach or 'N/A'}", 
                         ParagraphStyle('StrategyStyle', fontSize=12, textColor=ColorScheme.WHITE, alignment=TA_CENTER))
            ],
            [
                Paragraph(f"📖<br/><b>Optional Subject</b><br/>{getattr(student_intake.optional_subject, 'optional_subject_name', 'N/A') if student_intake.optional_subject else 'N/A'}", 
                         ParagraphStyle('StrategyStyle', fontSize=12, textColor=ColorScheme.WHITE, alignment=TA_CENTER)),
                Paragraph(f"🏆<br/><b>Previous Attempts</b><br/>{pb.number_of_attempts if pb else 'N/A'}", 
                         ParagraphStyle('StrategyStyle', fontSize=12, textColor=ColorScheme.WHITE, alignment=TA_CENTER))
            ]
        ]
        
        strategy_table = Table(strategy_cards, colWidths=[200, 200], rowHeights=[60, 60])
        strategy_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.Color(1, 1, 1, 0.1)),  # Semi-transparent white
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(1, 1, 1, 0.3)),
        ]))
        
        cover_content.append([strategy_table])
        cover_content.append([Spacer(1, 40)])
        
        # Inspirational quote
        quote_text = '"Success is the sum of small efforts repeated day in and day out."'
        cover_content.append([Paragraph(quote_text, 
                                      ParagraphStyle('QuoteStyle', fontSize=14, textColor=ColorScheme.WHITE, 
                                                   alignment=TA_CENTER, fontName='Helvetica-Oblique'))])
        cover_content.append([Paragraph("— Robert Collier", 
                                      ParagraphStyle('AuthorStyle', fontSize=10, textColor=ColorScheme.WHITE, 
                                                   alignment=TA_CENTER))])
        
        # Create main cover table
        main_table = Table(cover_content, colWidths=[A4[0] - 100])
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), ColorScheme.PRIMARY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 40),
            ('RIGHTPADDING', (0, 0), (-1, -1), 40),
            ('TOPPADDING', (0, 0), (-1, -1), 20),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ]))
        
        story.append(main_table)
        return story
    
    def _create_birds_eye_view(self, study_plan: StudyPlan) -> List:
        """Create a birds eye view calendar showing the entire year."""
        story = []
        
        story.append(Paragraph("Birds Eye View - Yearly Calendar", self.styles['Heading1']))
        story.append(Spacer(1, 20))
        
        # Parse dates
        start_date = parse_date(str(study_plan.start_date)) if isinstance(study_plan.start_date, str) else study_plan.start_date
        end_date = datetime(study_plan.targeted_year, 8, 31)  # End of August in target year
        
        # Create monthly calendar grid (3 months per row)
        months_data = []
        current_date = start_date.replace(day=1)  # Start of month
        
        while current_date <= end_date:
            # Find cycle for this month
            cycle_info = self._get_cycle_for_date(current_date, study_plan.cycles)
            cycle_name = cycle_info['name'] if cycle_info else ''
            cycle_color = cycle_info['color'] if cycle_info else ColorScheme.LIGHT_BG
            
            month_name = current_date.strftime('%B %Y')
            months_data.append({
                'name': month_name,
                'cycle': cycle_name,
                'color': cycle_color,
                'date': current_date
            })
            
            current_date += relativedelta(months=1)
        
        # Group months into rows of 3
        month_rows = []
        for i in range(0, len(months_data), 3):
            row_months = months_data[i:i+3]
            # Pad row if needed
            while len(row_months) < 3:
                row_months.append(None)
            month_rows.append(row_months)
        
        # Create table for months
        table_data = []
        for row in month_rows:
            row_data = []
            for month in row:
                if month:
                    cell_content = [
                        Paragraph(month['cycle'], ParagraphStyle('CycleLabel', fontSize=8, textColor=ColorScheme.DARK_TEXT, alignment=TA_CENTER)),
                        Paragraph(month['name'], ParagraphStyle('MonthLabel', fontSize=10, textColor=ColorScheme.DARK_TEXT, alignment=TA_CENTER, fontName='Helvetica-Bold'))
                    ]
                    # Add mini calendar
                    mini_cal = self._create_mini_calendar(month['date'])
                    cell_content.append(mini_cal)
                    row_data.append(cell_content)
                else:
                    row_data.append('')
            table_data.append(row_data)
        
        # Create the main calendar table
        col_width = (A4[0] - 100) / 3
        calendar_table = Table(table_data, colWidths=[col_width] * 3, rowHeights=None)
        
        # Apply styling
        style_commands = [
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, ColorScheme.LIGHT_TEXT),
        ]
        
        # Add background colors for cycles
        for row_idx, row in enumerate(month_rows):
            for col_idx, month in enumerate(row):
                if month and month['color']:
                    style_commands.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), month['color']))
        
        calendar_table.setStyle(TableStyle(style_commands))
        story.append(calendar_table)
        
        return story
    
    def _create_mini_calendar(self, month_date: datetime) -> Table:
        """Create a mini calendar for a specific month."""
        import calendar
        
        year = month_date.year
        month = month_date.month
        
        # Get calendar data
        cal = calendar.monthcalendar(year, month)
        
        # Create header
        headers = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        
        # Create table data
        table_data = [headers]
        for week in cal:
            week_data = []
            for day in week:
                if day == 0:
                    week_data.append('')
                else:
                    week_data.append(str(day))
            table_data.append(week_data)
        
        # Create table
        mini_table = Table(table_data, colWidths=[15] * 7, rowHeights=[12] * (len(table_data)))
        mini_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Header row
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorScheme.SECONDARY),
            ('TEXTCOLOR', (0, 1), (-1, -1), ColorScheme.DARK_TEXT),
            ('LEFTPADDING', (0, 0), (-1, -1), 1),
            ('RIGHTPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        
        return mini_table
    
    def _create_monthly_views(self, study_plan: StudyPlan) -> List:
        """Create detailed monthly views with daily breakdowns."""
        story = []
        
        # Parse dates
        start_date = parse_date(str(study_plan.start_date)) if isinstance(study_plan.start_date, str) else study_plan.start_date
        end_date = datetime(study_plan.targeted_year, 8, 31)
        
        current_date = start_date.replace(day=1)
        month_count = 0
        max_months = 6  # Limit to prevent too large PDFs
        
        while current_date <= end_date and month_count < max_months:
            story.extend(self._create_single_month_view(current_date, study_plan))
            if month_count < max_months - 1:  # Don't add page break after last month
                story.append(PageBreak())
            
            current_date += relativedelta(months=1)
            month_count += 1
        
        return story
    
    def _create_single_month_view(self, month_date: datetime, study_plan: StudyPlan) -> List:
        """Create a detailed view for a single month."""
        story = []
        
        month_name = month_date.strftime('%B %Y')
        cycle_info = self._get_cycle_for_date(month_date, study_plan.cycles)
        cycle_name = cycle_info['name'] if cycle_info else ''
        
        # Month header
        header_data = [[
            Paragraph(month_name.upper(), self.styles['Heading1']),
            Paragraph(cycle_name, ParagraphStyle('CycleName', fontSize=16, textColor=ColorScheme.PRIMARY, 
                                               alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        ]]
        
        header_table = Table(header_data, colWidths=[(A4[0] - 100) * 0.6, (A4[0] - 100) * 0.4])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        # Create monthly calendar
        story.append(self._create_monthly_calendar(month_date, study_plan))
        story.append(Spacer(1, 20))
        
        # Monthly resources
        story.extend(self._create_monthly_resources(month_date, study_plan))
        
        return story
    
    def _create_monthly_calendar(self, month_date: datetime, study_plan: StudyPlan) -> Table:
        """Create a detailed monthly calendar with subjects."""
        import calendar
        
        year = month_date.year
        month = month_date.month
        
        # Get calendar data
        cal = calendar.monthcalendar(year, month)
        
        # Create headers
        headers = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
        # Create table data
        table_data = [headers]
        
        for week in cal:
            week_data = []
            for day in week:
                if day == 0:
                    week_data.append('')
                else:
                    current_day = datetime(year, month, day)
                    
                    # Get subjects for this day
                    subjects = self._get_subjects_for_date(current_day, study_plan.cycles)
                    cycle_info = self._get_cycle_for_date(current_day, study_plan.cycles)
                    
                    # Create cell content
                    cell_content = [Paragraph(f"<b>{day}</b>", ParagraphStyle('DayNumber', fontSize=12, 
                                                                             textColor=ColorScheme.DARK_TEXT))]
                    
                    for subject in subjects[:3]:  # Limit to 3 subjects per day
                        cell_content.append(Paragraph(subject, ParagraphStyle('SubjectText', fontSize=8, 
                                                                            textColor=ColorScheme.DARK_TEXT)))
                    
                    week_data.append(cell_content)
            
            table_data.append(week_data)
        
        # Create table
        col_width = (A4[0] - 100) / 7
        monthly_table = Table(table_data, colWidths=[col_width] * 7, rowHeights=None)
        
        # Style the table
        style_commands = [
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), ColorScheme.LIGHT_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorScheme.PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, ColorScheme.LIGHT_TEXT),
        ]
        
        # Add background colors for cycle days
        for week_idx, week in enumerate(cal, 1):
            for day_idx, day in enumerate(week):
                if day != 0:
                    current_day = datetime(year, month, day)
                    cycle_info = self._get_cycle_for_date(current_day, study_plan.cycles)
                    if cycle_info and cycle_info['color']:
                        style_commands.append(('BACKGROUND', (day_idx, week_idx), (day_idx, week_idx), cycle_info['color']))
        
        monthly_table.setStyle(TableStyle(style_commands))
        
        return monthly_table
    
    def _create_monthly_resources(self, month_date: datetime, study_plan: StudyPlan) -> List:
        """Create resources section for a specific month."""
        story = []
        
        # Get subjects active in this month
        subjects = self._get_subjects_for_month(month_date, study_plan.cycles)
        
        if not subjects:
            story.append(Paragraph("No resources scheduled for this month.", self.styles['Body']))
            return story
        
        story.append(Paragraph(f"📚 Resources for {month_date.strftime('%B %Y')}", self.styles['Heading2']))
        story.append(Spacer(1, 10))
        
        # Create resource cards (3 per row)
        resource_rows = []
        for i in range(0, len(subjects), 3):
            row_subjects = subjects[i:i+3]
            while len(row_subjects) < 3:
                row_subjects.append(None)
            
            row_data = []
            for subject in row_subjects:
                if subject:
                    card_content = self._create_subject_resource_card(subject)
                    row_data.append(card_content)
                else:
                    row_data.append('')
            
            resource_rows.append(row_data)
        
        if resource_rows:
            col_width = (A4[0] - 100) / 3
            resource_table = Table(resource_rows, colWidths=[col_width] * 3)
            resource_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(resource_table)
        
        return story
    
    def _create_subject_resource_card(self, subject: str) -> List:
        """Create a resource card for a subject."""
        # Mock resources for demonstration
        resources = {
            'primary_books': ['NCERT Class 12', 'Laxmikanth'],
            'video_content': ['Khan Academy', 'Unacademy'],
            'practice_resources': ['Previous Year Questions', 'Test Series'],
            'current_affairs': ['The Hindu', 'PIB']
        }
        
        card_content = [
            Paragraph(f"<b>{subject}</b>", ParagraphStyle('SubjectTitle', fontSize=12, 
                                                        textColor=ColorScheme.PRIMARY, alignment=TA_CENTER)),
            Spacer(1, 8)
        ]
        
        for category, items in resources.items():
            if items:
                category_name = category.replace('_', ' ').title()
                card_content.append(Paragraph(f"<b>{category_name}:</b>", 
                                            ParagraphStyle('CategoryTitle', fontSize=9, 
                                                         textColor=ColorScheme.SECONDARY)))
                for item in items[:2]:  # Limit to 2 items per category
                    card_content.append(Paragraph(f"• {item}", 
                                                ParagraphStyle('ResourceItem', fontSize=8, 
                                                             textColor=ColorScheme.DARK_TEXT, leftIndent=10)))
                card_content.append(Spacer(1, 4))
        
        return card_content
    
    def _create_resources_table(self, study_plan: StudyPlan) -> List:
        """Create comprehensive resources table."""
        story = []
        
        story.append(Paragraph("📊 Comprehensive Resources by Subject", self.styles['Heading1']))
        story.append(Spacer(1, 20))
        
        # Get all unique subjects
        subjects = self._get_all_subjects(study_plan.cycles)
        
        # Create table headers
        headers = ['Subject', 'Primary Books', 'Video Content', 'Practice Materials', 'Current Affairs']
        table_data = [headers]
        
        # Mock resource data for each subject
        for subject in subjects[:10]:  # Limit to prevent overly long tables
            row_data = [
                subject,
                'NCERT, Standard Reference',
                'Online Lectures, Video Series',
                'PYQs, Mock Tests',
                'Daily Current Affairs'
            ]
            table_data.append(row_data)
        
        # Create table
        col_widths = [80, 120, 120, 120, 100]
        resources_table = Table(table_data, colWidths=col_widths)
        
        # Style the table
        resources_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ColorScheme.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorScheme.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), ColorScheme.WHITE),
            ('TEXTCOLOR', (0, 1), (-1, -1), ColorScheme.DARK_TEXT),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, ColorScheme.LIGHT_TEXT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ColorScheme.WHITE, ColorScheme.LIGHT_BG]),
        ]))
        
        story.append(resources_table)
        return story
    
    def _create_legend(self, study_plan: StudyPlan) -> List:
        """Create legend explaining colors and phases."""
        story = []
        
        story.append(Paragraph("ℹ️ Legend & Study Phases", self.styles['Heading1']))
        story.append(Spacer(1, 20))
        
        # Create legend table
        legend_data = [['Color', 'Cycle/Phase', 'Description']]
        
        # Add cycle entries
        for cycle in study_plan.cycles:
            cycle_color = ColorScheme.CYCLE_COLORS.get(cycle.cycleType, ColorScheme.LIGHT_BG)
            
            # Create color cell
            color_cell = Table([['']], colWidths=[20], rowHeights=[15])
            color_cell.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), cycle_color),
                ('GRID', (0, 0), (0, 0), 1, ColorScheme.CYCLE_BORDERS.get(cycle.cycleType, ColorScheme.LIGHT_TEXT)),
            ]))
            
            legend_data.append([
                color_cell,
                cycle.cycleName,
                f"Study phase with {cycle.cycleDuration} weeks duration"
            ])
        
        # Create legend table
        legend_table = Table(legend_data, colWidths=[60, 150, 250])
        legend_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ColorScheme.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), ColorScheme.WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), ColorScheme.WHITE),
            ('TEXTCOLOR', (0, 1), (-1, -1), ColorScheme.DARK_TEXT),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, ColorScheme.LIGHT_TEXT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ColorScheme.WHITE, ColorScheme.LIGHT_BG]),
        ]))
        
        story.append(legend_table)
        return story
    
    # Helper methods
    
    def _get_cycle_for_date(self, date: datetime, cycles: List) -> Optional[Dict]:
        """Get cycle information for a specific date."""
        for cycle in cycles:
            start_date = parse_date(cycle.cycleStartDate)
            end_date = parse_date(cycle.cycleEndDate)
            
            if start_date <= date <= end_date:
                return {
                    'name': cycle.cycleName,
                    'type': cycle.cycleType,
                    'color': ColorScheme.CYCLE_COLORS.get(cycle.cycleType, ColorScheme.LIGHT_BG)
                }
        return None
    
    def _get_subjects_for_date(self, date: datetime, cycles: List) -> List[str]:
        """Get subjects scheduled for a specific date."""
        subjects = []
        for cycle in cycles:
            start_date = parse_date(cycle.cycleStartDate)
            end_date = parse_date(cycle.cycleEndDate)
            
            if start_date <= date <= end_date:
                for block in cycle.cycleBlocks:
                    if hasattr(block, 'subjects'):
                        subjects.extend(block.subjects)
        
        return list(set(subjects))  # Remove duplicates
    
    def _get_subjects_for_month(self, month_date: datetime, cycles: List) -> List[str]:
        """Get subjects active during a specific month."""
        subjects = set()
        month_start = month_date.replace(day=1)
        month_end = (month_start + relativedelta(months=1)) - timedelta(days=1)
        
        for cycle in cycles:
            cycle_start = parse_date(cycle.cycleStartDate)
            cycle_end = parse_date(cycle.cycleEndDate)
            
            # Check if cycle overlaps with month
            if cycle_start <= month_end and cycle_end >= month_start:
                for block in cycle.cycleBlocks:
                    if hasattr(block, 'subjects'):
                        subjects.update(block.subjects)
        
        return list(subjects)
    
    def _get_all_subjects(self, cycles: List) -> List[str]:
        """Get all unique subjects from all cycles."""
        subjects = set()
        for cycle in cycles:
            for block in cycle.cycleBlocks:
                if hasattr(block, 'subjects'):
                    subjects.update(block.subjects)
        return list(subjects)
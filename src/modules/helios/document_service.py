"""
Document Generation Service for Helios Study Plans

This service generates DOCX and PDF documents from study plan data using a single
DOCX template as the source of truth for both formats.
"""

import os
import tempfile
import logging
from typing import Dict, Any, List, Optional, BinaryIO
from datetime import datetime, date
from pathlib import Path

from docxtpl import DocxTemplate
from docx2pdf import convert
import json

from .schemas import StudyPlanSchema, BlockSchema, CycleSchema

logger = logging.getLogger(__name__)


class DocumentGenerationService:
    """Service for generating study plan documents in DOCX and PDF formats."""
    
    def __init__(self, template_path: Optional[str] = None):
        """
        Initialize the document generation service.
        
        Args:
            template_path: Path to the DOCX template file. If None, uses default template.
        """
        self.template_path = template_path or self._get_default_template_path()
        
    def _get_default_template_path(self) -> str:
        """Get the default template path."""
        # Look for template in the assets directory
        base_dir = Path(__file__).parent.parent.parent
        template_path = base_dir / "assets" / "templates" / "study_plan_template.docx"
        return str(template_path)
    
    def generate_docx(self, study_plan: StudyPlanSchema, output_path: Optional[str] = None) -> str:
        """
        Generate a DOCX document from study plan data.
        
        Args:
            study_plan: Study plan data to include in the document
            output_path: Optional path to save the document. If None, uses temp file.
            
        Returns:
            Path to the generated DOCX file
            
        Raises:
            FileNotFoundError: If template file is not found
            Exception: If document generation fails
        """
        try:
            # Check if template exists
            if not os.path.exists(self.template_path):
                raise FileNotFoundError(f"Template file not found: {self.template_path}")
            
            # Load the template
            doc = DocxTemplate(self.template_path)
            
            # Prepare context data for template
            context = self._prepare_template_context(study_plan)
            
            # Render the template with context
            doc.render(context)
            
            # Determine output path
            if output_path is None:
                output_path = self._generate_temp_filename(study_plan.study_plan_id, "docx")
            
            # Save the document
            doc.save(output_path)
            
            logger.info(f"Successfully generated DOCX document: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating DOCX document: {e}")
            raise
    
    def generate_pdf(self, study_plan: StudyPlanSchema, output_path: Optional[str] = None) -> str:
        """
        Generate a PDF document from study plan data by first creating DOCX then converting.
        
        Args:
            study_plan: Study plan data to include in the document
            output_path: Optional path to save the PDF. If None, uses temp file.
            
        Returns:
            Path to the generated PDF file
            
        Raises:
            Exception: If document generation or conversion fails
        """
        try:
            # First generate DOCX
            temp_docx_path = self.generate_docx(study_plan)
            
            # Determine PDF output path
            if output_path is None:
                output_path = self._generate_temp_filename(study_plan.study_plan_id, "pdf")
            
            # Convert DOCX to PDF
            convert(temp_docx_path, output_path)
            
            # Clean up temporary DOCX file
            try:
                os.unlink(temp_docx_path)
            except OSError:
                logger.warning(f"Could not delete temporary DOCX file: {temp_docx_path}")
            
            logger.info(f"Successfully generated PDF document: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating PDF document: {e}")
            raise
    
    def _prepare_template_context(self, study_plan: StudyPlanSchema) -> Dict[str, Any]:
        """
        Prepare context data for the document template.
        
        Args:
            study_plan: Study plan data
            
        Returns:
            Dictionary containing template context data
        """
        # Extract all blocks from cycles
        all_blocks = self._extract_blocks_from_cycles(study_plan)
        
        # Group blocks by cycle for better organization
        cycles = self._group_blocks_by_cycle(all_blocks)
        
        # Calculate plan statistics
        stats = self._calculate_plan_statistics(all_blocks)
        
        context = {
            # Basic plan information
            "plan_title": study_plan.title,
            "user_id": study_plan.user_id,
            "generation_date": datetime.now().strftime("%B %d, %Y"),
            "target_year": study_plan.created_for_target_year or "2025",
            "season_context": study_plan.effective_season_context or "General",
            
            # Plan statistics
            "total_blocks": stats["total_blocks"],
            "total_weeks": stats["total_weeks"],
            "total_subjects": stats["total_subjects"],
            "cycles_count": len(cycles),
            
            # Organized content
            "cycles": cycles,
            "blocks": all_blocks,
            
            # Resources
            "curated_resources": study_plan.curated_resources,
            
            # Formatting helpers
            "format_subjects": self._format_subjects_list,
            "format_duration": self._format_duration,
        }
        
        return context
    
    def _group_blocks_by_cycle(self, blocks: List[BlockSchema]) -> List[Dict[str, Any]]:
        """
        Group blocks by their cycle information.
        
        Args:
            blocks: List of blocks to group
            
        Returns:
            List of cycle dictionaries with their associated blocks
        """
        cycles_dict = {}
        uncategorized_blocks = []
        
        for block in blocks:
            if block.cycle_id and block.cycle_order is not None:
                cycle_key = (block.cycle_id, block.cycle_order)
                
                if cycle_key not in cycles_dict:
                    cycles_dict[cycle_key] = {
                        "cycle_id": block.cycle_id,
                        "cycle_name": block.cycle_name or f"Cycle {block.cycle_order + 1}",
                        "cycle_type": block.cycle_type or "StudyCycle",
                        "cycle_order": block.cycle_order,
                        "blocks": []
                    }
                
                cycles_dict[cycle_key]["blocks"].append(block)
            else:
                uncategorized_blocks.append(block)
        
        # Sort cycles by order
        sorted_cycles = sorted(cycles_dict.values(), key=lambda c: c["cycle_order"])
        
        # Add uncategorized blocks as a separate "cycle" if any exist
        if uncategorized_blocks:
            sorted_cycles.append({
                "cycle_id": "uncategorized",
                "cycle_name": "Additional Blocks",
                "cycle_type": "Uncategorized",
                "cycle_order": 999,
                "blocks": uncategorized_blocks
            })
        
        return sorted_cycles
    
    def _extract_blocks_from_cycles(self, study_plan: StudyPlanSchema) -> List[BlockSchema]:
        """Extract all blocks from cycles in a study plan."""
        all_blocks = []
        
        if study_plan.cycles:
            for cycle in study_plan.cycles:
                if cycle.cycle_blocks:
                    all_blocks.extend(cycle.cycle_blocks)
        
        return all_blocks
    
    def _calculate_plan_statistics(self, blocks: List[BlockSchema]) -> Dict[str, Any]:
        """
        Calculate statistics about the study plan.
        
        Args:
            blocks: List of blocks in the plan
            
        Returns:
            Dictionary containing plan statistics
        """
        total_weeks = sum(block.duration_weeks for block in blocks)
        all_subjects = set()
        
        for block in blocks:
            all_subjects.update(block.subjects)
        
        return {
            "total_blocks": len(blocks),
            "total_weeks": total_weeks,
            "total_subjects": len(all_subjects),
            "subject_list": sorted(list(all_subjects))
        }
    
    def _format_subjects_list(self, subjects: List[str]) -> str:
        """Format a list of subjects for display."""
        if not subjects:
            return "No subjects specified"
        elif len(subjects) == 1:
            return subjects[0]
        elif len(subjects) == 2:
            return f"{subjects[0]} and {subjects[1]}"
        else:
            return f"{', '.join(subjects[:-1])}, and {subjects[-1]}"
    
    def _format_duration(self, weeks: int) -> str:
        """Format duration in weeks for display."""
        if weeks == 1:
            return "1 week"
        else:
            return f"{weeks} weeks"
    
    def _generate_temp_filename(self, plan_id: str, extension: str) -> str:
        """
        Generate a temporary filename for the document.
        
        Args:
            plan_id: Study plan ID
            extension: File extension (docx or pdf)
            
        Returns:
            Path to temporary file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"study_plan_{plan_id}_{timestamp}.{extension}"
        return os.path.join(tempfile.gettempdir(), filename)
    
    def create_default_template(self, output_path: str) -> None:
        """
        Create a default DOCX template file with placeholders.
        
        Args:
            output_path: Path where to save the template
        """
        try:
            from docx import Document
            from docx.shared import Inches
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            
            doc = Document()
            
            # Title
            title = doc.add_heading('{{ plan_title }}', 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # Basic Information
            doc.add_heading('Plan Overview', level=1)
            
            info_table = doc.add_table(rows=5, cols=2)
            info_table.style = 'Table Grid'
            
            info_data = [
                ('User ID:', '{{ user_id }}'),
                ('Generation Date:', '{{ generation_date }}'),
                ('Target Year:', '{{ target_year }}'),
                ('Season Context:', '{{ season_context }}'),
                ('Total Duration:', '{{ total_weeks }} weeks')
            ]
            
            for i, (label, value) in enumerate(info_data):
                info_table.cell(i, 0).text = label
                info_table.cell(i, 1).text = value
            
            # Statistics
            doc.add_heading('Plan Statistics', level=1)
            
            stats_para = doc.add_paragraph()
            stats_para.add_run('Total Blocks: ').bold = True
            stats_para.add_run('{{ total_blocks }}')
            stats_para.add_run('\nTotal Subjects: ').bold = True
            stats_para.add_run('{{ total_subjects }}')
            stats_para.add_run('\nCycles: ').bold = True
            stats_para.add_run('{{ cycles_count }}')
            
            # Cycles Section
            doc.add_heading('Study Plan by Cycles', level=1)
            
            # Template loop for cycles
            doc.add_paragraph('{% for cycle in cycles %}')
            
            cycle_heading = doc.add_heading('{{ cycle.cycle_name }} ({{ cycle.cycle_type }})', level=2)
            
            doc.add_paragraph('{% for block in cycle.blocks %}')
            
            # Block information
            block_para = doc.add_paragraph()
            block_para.add_run('Block: ').bold = True
            block_para.add_run('{{ block.title }}')
            block_para.add_run('\nDuration: ').bold = True
            block_para.add_run('{{ format_duration(block.duration_weeks) }}')
            block_para.add_run('\nSubjects: ').bold = True
            block_para.add_run('{{ format_subjects(block.subjects) }}')
            
            doc.add_paragraph('{% endfor %}')  # End blocks loop
            doc.add_paragraph('{% endfor %}')  # End cycles loop
            
            # Resources Section
            doc.add_heading('Curated Resources', level=1)
            doc.add_paragraph('{{ curated_resources }}')
            
            # Save the template
            doc.save(output_path)
            logger.info(f"Created default template at: {output_path}")
            
        except Exception as e:
            logger.error(f"Error creating default template: {e}")
            raise


# Utility functions for external use
def generate_study_plan_docx(study_plan: StudyPlanSchema, output_path: Optional[str] = None) -> str:
    """
    Convenience function to generate a DOCX document from study plan data.
    
    Args:
        study_plan: Study plan data
        output_path: Optional output path
        
    Returns:
        Path to generated DOCX file
    """
    service = DocumentGenerationService()
    return service.generate_docx(study_plan, output_path)


def generate_study_plan_pdf(study_plan: StudyPlanSchema, output_path: Optional[str] = None) -> str:
    """
    Convenience function to generate a PDF document from study plan data.
    
    Args:
        study_plan: Study plan data
        output_path: Optional output path
        
    Returns:
        Path to generated PDF file
    """
    service = DocumentGenerationService()
    return service.generate_pdf(study_plan, output_path)

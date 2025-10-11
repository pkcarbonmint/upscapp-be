#!/usr/bin/env python3
"""
Script to create a default DOCX template for study plan documents.
"""

from src.modules.helios.document_service import DocumentGenerationService
import os

def main():
    template_path = "src/assets/templates/study_plan_template.docx"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(template_path), exist_ok=True)
    
    # Create the template
    service = DocumentGenerationService()
    service.create_default_template(template_path)
    
    print(f"Template created at: {template_path}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Helios Schema Generator - Extract JSON Schema from Haskell types
Generates JSON Schema that matches Helios UIWizardData structure
"""

import json
import subprocess
import re
from pathlib import Path
from typing import Dict, Any, List

class HeliosSchemaGenerator:
    """Generates JSON Schema from Haskell UIWizardData type"""
    
    def __init__(self, helios_src_path: str = "../helios-hs/src"):
        self.helios_path = Path(helios_src_path)
        
    def extract_haskell_types(self) -> Dict[str, Any]:
        """Extract UIWizardData structure from Haskell source"""
        
        # Read DataTransform.hs to get UIWizardData definition
        datatransform_file = self.helios_path / "DataTransform.hs"
        
        if not datatransform_file.exists():
            print(f"⚠️  DataTransform.hs not found at {datatransform_file}")
            return self._fallback_schema()
            
        with open(datatransform_file, 'r') as f:
            content = f.read()
        
        # Extract UIWizardData structure
        ui_wizard_match = re.search(
            r'data UIWizardData = UIWizardData\s*{([^}]+)}', 
            content, 
            re.MULTILINE | re.DOTALL
        )
        
        if not ui_wizard_match:
            print("⚠️  UIWizardData definition not found")
            return self._fallback_schema()
            
        fields_text = ui_wizard_match.group(1)
        fields = self._parse_haskell_fields(fields_text)
        
        return self._generate_schema_from_fields(fields)
    
    def _parse_haskell_fields(self, fields_text: str) -> List[Dict[str, str]]:
        """Parse Haskell record fields"""
        fields = []
        
        # Split by comma and clean up
        field_lines = [line.strip() for line in fields_text.split(',')]
        
        for line in field_lines:
            if '::' in line:
                field_name = line.split('::')[0].strip()
                field_type = line.split('::')[1].strip()
                fields.append({
                    'name': field_name,
                    'type': field_type
                })
        
        return fields
    
    def _generate_schema_from_fields(self, fields: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate JSON Schema from Haskell fields"""
        
        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Helios UIWizardData Schema",
            "description": "JSON Schema matching Haskell UIWizardData structure",
            "type": "object",
            "required": [field['name'] for field in fields],
            "properties": {}
        }
        
        for field in fields:
            field_name = field['name']
            field_type = field['type']
            
            # Map Haskell types to JSON Schema types
            if 'String' in field_type or 'Text' in field_type:
                schema['properties'][field_name] = {"type": "string"}
            elif 'Int' in field_type:
                schema['properties'][field_name] = {"type": "integer"}
            elif 'Bool' in field_type:
                schema['properties'][field_name] = {"type": "boolean"}
            elif field_type.startswith('UI'):
                # Nested UI type - create object schema
                schema['properties'][field_name] = {
                    "type": "object",
                    "description": f"Nested {field_type} structure"
                }
            else:
                # Default to object for complex types
                schema['properties'][field_name] = {"type": "object"}
        
        return schema
    
    def _fallback_schema(self) -> Dict[str, Any]:
        """Fallback schema when Haskell parsing fails"""
        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Helios UIWizardData Schema (Fallback)",
            "description": "Fallback schema for UIWizardData",
            "type": "object",
            "properties": {
                "personal_and_academic_details": {"type": "object"},
                "preparation_background": {"type": "object"},
                "coaching_and_mentorship": {"type": "object"},
                "optional_subject_details": {"type": "object"},
                "test_series_and_csat": {"type": "object"},
                "syllabus_and_pyq_awareness": {"type": "object"},
                "subject_confidence": {"type": "object"},
                "study_strategy": {"type": "object"}
            },
            "required": [
                "personal_and_academic_details",
                "preparation_background", 
                "coaching_and_mentorship",
                "optional_subject_details",
                "test_series_and_csat",
                "syllabus_and_pyq_awareness",
                "subject_confidence",
                "study_strategy"
            ]
        }
    
    def generate_helios_schema_file(self, output_file: str = "helios_uiwizarddata_schema.json"):
        """Generate and save Helios schema file"""
        schema = self.extract_haskell_types()
        
        with open(output_file, 'w') as f:
            json.dump(schema, f, indent=2)
        
        print(f"✅ Generated Helios schema: {output_file}")
        return schema

def main():
    """CLI interface"""
    generator = HeliosSchemaGenerator()
    schema = generator.generate_helios_schema_file()
    
    print("📋 Helios UIWizardData Schema:")
    print(json.dumps(schema, indent=2))

if __name__ == "__main__":
    main()

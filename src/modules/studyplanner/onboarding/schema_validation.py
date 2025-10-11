"""
Schema validation for Python onboarding service
Uses versioned JSON Schema as shared contract
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel, ValidationError
import sys
import os

# Add type_contracts to path for schema_validator import
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent / "type_contracts"))

try:
    from schema_validator import SchemaValidator
except ImportError:
    # Fallback if schema_validator not available
    class SchemaValidator:
        def __init__(self, schema_path=None):
            pass
        def validate_any(self, data, schema_name):
            return True
        def get_schema_info(self):
            return {"version": "fallback", "schemaVersion": "unknown"}

class OnboardingSchemaValidator:
    """Validates onboarding data against shared JSON Schema"""
    
    def __init__(self):
        # Try to find schema in multiple locations
        possible_paths = [
            Path(__file__).parent.parent.parent.parent.parent / "type_contracts" / "interface_schemas.json",
            Path("/code/type_contracts/interface_schemas.json"),
            Path("./type_contracts/interface_schemas.json")
        ]
        
        schema_path = None
        for path in possible_paths:
            if path.exists():
                schema_path = str(path)
                break
        
        if schema_path:
            self.validator = SchemaValidator(schema_path)
            self.schema_info = self.validator.get_schema_info()
            print(f"📋 Using schema version: {self.schema_info['version']}")
        else:
            print("⚠️  Schema not found, using fallback validation")
            self.validator = SchemaValidator()
            self.schema_info = {"version": "fallback"}
    
    def validate_background_input(self, data: Dict[str, Any]) -> bool:
        """Validate background input data"""
        return self.validator.validate_background_input(data)
    
    def validate_target_input(self, data: Dict[str, Any]) -> bool:
        """Validate target input data"""
        return self.validator.validate_target_input(data)
    
    def validate_commitment_input(self, data: Dict[str, Any]) -> bool:
        """Validate commitment input data"""
        return self.validator.validate_commitment_input(data)
    
    def validate_confidence_input(self, data: Dict[str, Any]) -> bool:
        """Validate confidence input data"""
        return self.validator.validate_confidence_input(data)
    
    def get_schema_version(self) -> str:
        """Get current schema version"""
        return self.schema_info.get("version", "unknown")

# Global validator instance
_validator = None

def get_validator() -> OnboardingSchemaValidator:
    """Get singleton validator instance"""
    global _validator
    if _validator is None:
        _validator = OnboardingSchemaValidator()
    return _validator

def validate_onboarding_data(data: Dict[str, Any], data_type: str) -> bool:
    """Convenience function to validate onboarding data"""
    validator = get_validator()
    
    validation_methods = {
        "background": validator.validate_background_input,
        "target": validator.validate_target_input,
        "commitment": validator.validate_commitment_input,
        "confidence": validator.validate_confidence_input
    }
    
    if data_type not in validation_methods:
        print(f"❌ Unknown data type: {data_type}")
        return False
    
    return validation_methods[data_type](data)
